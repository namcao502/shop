// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { FieldValue } from "firebase-admin/firestore";
import { shippingAddressSchema } from "@/lib/validation";
import type { ShippingAddress } from "@/lib/types";
import { writeNotification } from "@/lib/notifications";

type CustomerAction = "cancel" | "update_address";
type AdminAction = "confirm_payment" | "ship" | "deliver";
type PatchAction = CustomerAction | AdminAction;

interface PatchBody {
  action: PatchAction;
  shippingAddress?: ShippingAddress;
}

const VALID_ACTIONS: PatchAction[] = [
  "cancel",
  "update_address",
  "confirm_payment",
  "ship",
  "deliver",
];

const ADMIN_ONLY_ACTIONS: AdminAction[] = ["confirm_payment", "ship", "deliver"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.action || !VALID_ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

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

    const validation = shippingAddressSchema.safeParse(body.shippingAddress);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid shipping address" },
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

        tx.update(orderRef, {
          shippingAddress: validation.data,
          updatedAt: FieldValue.serverTimestamp(),
        });

        if (authResult.isAdmin) {
          // Admin updated the address -- notify customer
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
          // Customer updated address -- notify admin
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
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderSnap.data()!;

  // Intentionally customer-only: only the order owner can delete their own cancelled order record
  if (order.userId !== authResult.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.orderStatus !== "cancelled") {
    return NextResponse.json(
      { error: "Only cancelled orders can be deleted" },
      { status: 400 }
    );
  }

  await orderRef.delete();

  // Notify admin that a customer deleted their order record
  writeNotification({
    userId: "admin",
    type: "order_deleted",
    title: `Order ${order.orderCode} deleted`,
    message: `Customer deleted the record of cancelled order ${order.orderCode}.`,
    orderId: null,
    orderCode: order.orderCode,
  });

  return new NextResponse(null, { status: 204 });
}
