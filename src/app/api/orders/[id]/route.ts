// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { FieldValue } from "firebase-admin/firestore";
import { shippingAddressSchema } from "@/lib/validation";
import { writeNotification } from "@/lib/notifications";
import { calculateShippingFee } from "@/lib/shipping";
import { z } from "zod";
import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import type { VerifyResult } from "@/lib/verify-admin";

const patchBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("update_address"), shippingAddress: shippingAddressSchema }),
  z.object({ action: z.literal("confirm_payment") }),
  z.object({ action: z.literal("ship") }),
  z.object({ action: z.literal("deliver") }),
]);

type PatchBody = z.infer<typeof patchBodySchema>;

const ADMIN_ONLY_ACTIONS = ["confirm_payment", "ship", "deliver"] as const;
type AdminAction = (typeof ADMIN_ONLY_ACTIONS)[number];

function httpError(message: string, status: number): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

async function handleCancel(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string,
  authResult: VerifyResult
): Promise<void> {
  if (order.orderStatus !== "pending") {
    throw httpError("Only pending orders can be cancelled", 400);
  }

  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists || freshSnap.data()!.orderStatus !== "pending") {
      throw new Error("Order is no longer cancellable");
    }
    const freshItems = freshSnap.data()!.items as Array<{ productId: string; qty: number }>;
    const productRefs = freshItems.map((item) =>
      adminDb.collection("products").doc(item.productId)
    );
    const productSnaps = await Promise.all(
      productRefs.map((ref) => tx.get(ref))
    );
    for (let i = 0; i < freshItems.length; i++) {
      if (productSnaps[i].exists) {
        const currentStock = productSnaps[i].data()!.stock ?? 0;
        tx.update(productRefs[i], { stock: currentStock + freshItems[i].qty });
      }
    }
    tx.update(orderRef, {
      orderStatus: "cancelled",
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeNotification(
      {
        userId: order.userId as string,
        type: "order_cancelled",
        title: `Order ${order.orderCode} cancelled`,
        message: authResult.isAdmin
          ? "Your order has been cancelled by the store."
          : "Your cancellation request has been processed.",
        orderId: id,
        orderCode: order.orderCode as string,
      },
      tx
    );
    if (!authResult.isAdmin) {
      writeNotification(
        {
          userId: "admin",
          type: "cancel_requested",
          title: `Order ${order.orderCode} cancelled by customer`,
          message: `Customer cancelled order ${order.orderCode}.`,
          orderId: id,
          orderCode: order.orderCode as string,
        },
        tx
      );
    }
  });
}

async function handleUpdateAddress(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string,
  authResult: VerifyResult,
  shippingAddress: z.infer<typeof shippingAddressSchema>
): Promise<void> {
  if (!["pending", "confirmed"].includes(order.orderStatus as string)) {
    throw httpError("Address can only be updated for pending or confirmed orders", 400);
  }
  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists) throw new Error("Order not found");
    if (!["pending", "confirmed"].includes(freshSnap.data()!.orderStatus)) {
      throw new Error("Address can only be updated for pending or confirmed orders");
    }
    const freshOrder = freshSnap.data()!;
    const newProvince = shippingAddress.province;
    const oldProvince = (freshOrder.shippingAddress as { province?: string })?.province;
    const updatePayload: Record<string, unknown> = {
      shippingAddress,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (newProvince !== oldProvince) {
      const subtotal = typeof freshOrder.subtotal === "number" ? freshOrder.subtotal : 0;
      const newShippingFee = calculateShippingFee(newProvince, subtotal);
      updatePayload.shippingFee = newShippingFee;
      updatePayload.totalAmount = subtotal + newShippingFee;
    }
    tx.update(orderRef, updatePayload);
    if (authResult.isAdmin) {
      writeNotification(
        {
          userId: order.userId as string,
          type: "address_updated",
          title: `Shipping address updated for ${order.orderCode}`,
          message: "The store has updated your shipping address.",
          orderId: id,
          orderCode: order.orderCode as string,
        },
        tx
      );
    } else {
      writeNotification(
        {
          userId: "admin",
          type: "address_update_requested",
          title: `Address update for ${order.orderCode}`,
          message: `Customer updated shipping address on order ${order.orderCode}.`,
          orderId: id,
          orderCode: order.orderCode as string,
        },
        tx
      );
    }
  });
}

async function handleConfirmPayment(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string
): Promise<void> {
  if (order.paymentMethod === "momo" && order.paymentStatus === "failed") {
    throw httpError("Cannot manually confirm a failed MoMo payment", 400);
  }
  if (order.paymentStatus === "paid") {
    throw httpError("Payment already confirmed", 400);
  }
  if (["cancelled", "delivered"].includes(order.orderStatus as string)) {
    throw httpError("Cannot confirm payment for a cancelled or delivered order", 400);
  }
  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists) throw new Error("Order not found");
    if (freshSnap.data()!.paymentStatus === "paid") throw new Error("Payment already confirmed");
    if (["cancelled", "delivered"].includes(freshSnap.data()!.orderStatus)) {
      throw new Error("Cannot confirm payment for a cancelled or delivered order");
    }
    tx.update(orderRef, {
      paymentStatus: "paid",
      orderStatus: "confirmed",
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeNotification(
      {
        userId: order.userId as string,
        type: "payment_confirmed",
        title: `Payment confirmed for ${order.orderCode}`,
        message: "Your payment has been verified. Your order is being prepared.",
        orderId: id,
        orderCode: order.orderCode as string,
      },
      tx
    );
  });
}

async function handleShip(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string
): Promise<void> {
  if (order.orderStatus !== "confirmed") {
    throw httpError("Only confirmed orders can be marked as shipping", 400);
  }
  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists) throw new Error("Order not found");
    if (freshSnap.data()!.orderStatus !== "confirmed") {
      throw new Error("Only confirmed orders can be marked as shipping");
    }
    tx.update(orderRef, {
      orderStatus: "shipping",
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeNotification(
      {
        userId: order.userId as string,
        type: "order_shipped",
        title: `Order ${order.orderCode} is on its way`,
        message: "Your package has been shipped and is on its way to you.",
        orderId: id,
        orderCode: order.orderCode as string,
      },
      tx
    );
  });
}

async function handleDeliver(
  orderRef: DocumentReference,
  order: FirebaseFirestore.DocumentData,
  id: string
): Promise<void> {
  if (order.orderStatus !== "shipping") {
    throw httpError("Only shipping orders can be marked as delivered", 400);
  }
  await adminDb.runTransaction(async (tx: Transaction) => {
    const freshSnap = await tx.get(orderRef);
    if (!freshSnap.exists) throw new Error("Order not found");
    if (freshSnap.data()!.orderStatus !== "shipping") {
      throw new Error("Only shipping orders can be marked as delivered");
    }
    tx.update(orderRef, {
      orderStatus: "delivered",
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeNotification(
      {
        userId: order.userId as string,
        type: "order_delivered",
        title: `Order ${order.orderCode} delivered`,
        message: "Your order has been delivered. Thank you for shopping with us!",
        orderId: id,
        orderCode: order.orderCode as string,
      },
      tx
    );
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsedBody = patchBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid action" },
      { status: 400 }
    );
  }

  const body = parsedBody.data;

  if (ADMIN_ONLY_ACTIONS.includes(body.action as AdminAction) && !authResult.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderRef = adminDb.collection("orders").doc(id);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const order = orderSnap.data()!;
  const isOwner = order.userId === authResult.uid;
  if (!isOwner && !authResult.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (body.action === "cancel") await handleCancel(orderRef, order, id, authResult);
    else if (body.action === "update_address") await handleUpdateAddress(orderRef, order, id, authResult, body.shippingAddress);
    else if (body.action === "confirm_payment") await handleConfirmPayment(orderRef, order, id);
    else if (body.action === "ship") await handleShip(orderRef, order, id);
    else await handleDeliver(orderRef, order, id);
  } catch (err: unknown) {
    if (err instanceof Error) {
      const status = (err as Error & { status?: number }).status ?? 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orderRef = adminDb.collection("orders").doc(id);

  try {
    await adminDb.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);

      if (!orderSnap.exists) {
        throw httpError("Order not found", 404);
      }

      const order = orderSnap.data()!;

      if (order.userId !== authResult.uid) {
        throw httpError("Forbidden", 403);
      }

      if (order.orderStatus !== "cancelled") {
        throw httpError("Only cancelled orders can be deleted", 400);
      }

      tx.delete(orderRef);

      writeNotification(
        {
          userId: "admin",
          type: "order_deleted",
          title: `Order ${order.orderCode} deleted`,
          message: `Customer deleted the record of cancelled order ${order.orderCode}.`,
          orderId: null,
          orderCode: order.orderCode,
        },
        tx
      );
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      const status = (err as Error & { status?: number }).status ?? 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json({ error: "Failed to delete order" }, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}
