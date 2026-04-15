// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { FieldValue } from "firebase-admin/firestore";
import { shippingAddressSchema } from "@/lib/validation";
import { writeNotification } from "@/lib/notifications";
import { calculateShippingFee } from "@/lib/shipping";
import { z } from "zod";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Admin-only actions require isAdmin
  if (ADMIN_ONLY_ACTIONS.includes(body.action as AdminAction) && !authResult.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderRef = adminDb.collection("orders").doc(id);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderSnap.data()!;

  // Customer actions require ownership; admins can act on any order
  const isOwner = order.userId === authResult.uid;

  if (!isOwner && !authResult.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- CANCEL ---
  if (body.action === "cancel") {
    if (order.orderStatus !== "pending") {
      return NextResponse.json(
        { error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists || freshSnap.data()!.orderStatus !== "pending") {
          throw new Error("Order is no longer cancellable");
        }
        const freshItems = freshSnap.data()!.items;
        const productRefs = freshItems.map((item: { productId: string }) =>
          adminDb.collection("products").doc(item.productId)
        );
        const productSnaps = await Promise.all(
          productRefs.map((ref: FirebaseFirestore.DocumentReference) => tx.get(ref))
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

        // Customer: their order was cancelled
        writeNotification(
          {
            userId: order.userId,
            type: "order_cancelled",
            title: `Order ${order.orderCode} cancelled`,
            message: authResult.isAdmin
              ? "Your order has been cancelled by the store."
              : "Your cancellation request has been processed.",
            orderId: id,
            orderCode: order.orderCode,
          },
          tx
        );

        // Admin: notified only when customer cancels (not when admin cancels)
        if (!authResult.isAdmin) {
          writeNotification(
            {
              userId: "admin",
              type: "cancel_requested",
              title: `Order ${order.orderCode} cancelled by customer`,
              message: `Customer cancelled order ${order.orderCode}.`,
              orderId: id,
              orderCode: order.orderCode,
            },
            tx
          );
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // --- UPDATE ADDRESS (customer requests, admin applies) ---
  if (body.action === "update_address") {
    if (!["pending", "confirmed"].includes(order.orderStatus)) {
      return NextResponse.json(
        { error: "Address can only be updated for pending or confirmed orders" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists) throw new Error("Order not found");
        if (!["pending", "confirmed"].includes(freshSnap.data()!.orderStatus)) {
          throw new Error("Address can only be updated for pending or confirmed orders");
        }

        const freshOrder = freshSnap.data()!;
        const newProvince = body.shippingAddress.province;
        const oldProvince = (freshOrder.shippingAddress as { province?: string })?.province;

        const updatePayload: Record<string, unknown> = {
          shippingAddress: body.shippingAddress,
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
              userId: order.userId,
              type: "address_updated",
              title: `Shipping address updated for ${order.orderCode}`,
              message: "The store has updated your shipping address.",
              orderId: id,
              orderCode: order.orderCode,
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
              orderCode: order.orderCode,
            },
            tx
          );
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update address";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // --- CONFIRM PAYMENT (admin: VietQR manual confirmation only) ---
  if (body.action === "confirm_payment") {
    if (order.paymentMethod === "momo" && order.paymentStatus === "failed") {
      return NextResponse.json(
        { error: "Cannot manually confirm a failed MoMo payment" },
        { status: 400 }
      );
    }
    if (order.paymentStatus === "paid") {
      return NextResponse.json({ error: "Payment already confirmed" }, { status: 400 });
    }
    if (["cancelled", "delivered"].includes(order.orderStatus)) {
      return NextResponse.json(
        { error: "Cannot confirm payment for a cancelled or delivered order" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists) throw new Error("Order not found");
        if (freshSnap.data()!.paymentStatus === "paid") {
          throw new Error("Payment already confirmed");
        }
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
            userId: order.userId,
            type: "payment_confirmed",
            title: `Payment confirmed for ${order.orderCode}`,
            message: "Your payment has been verified. Your order is being prepared.",
            orderId: id,
            orderCode: order.orderCode,
          },
          tx
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to confirm payment";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // --- SHIP (admin) ---
  if (body.action === "ship") {
    if (order.orderStatus !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed orders can be marked as shipping" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
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
            userId: order.userId,
            type: "order_shipped",
            title: `Order ${order.orderCode} is on its way`,
            message: "Your package has been shipped and is on its way to you.",
            orderId: id,
            orderCode: order.orderCode,
          },
          tx
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark order as shipping";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // --- DELIVER (admin) ---
  if (body.action === "deliver") {
    if (order.orderStatus !== "shipping") {
      return NextResponse.json(
        { error: "Only shipping orders can be marked as delivered" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
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
            userId: order.userId,
            type: "order_delivered",
            title: `Order ${order.orderCode} delivered`,
            message: "Your order has been delivered. Thank you for shopping with us!",
            orderId: id,
            orderCode: order.orderCode,
          },
          tx
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark order as delivered";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.message ?? "Failed to delete order" },
      { status: e.status ?? 400 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
