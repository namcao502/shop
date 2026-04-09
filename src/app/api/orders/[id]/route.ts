import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { FieldValue } from "firebase-admin/firestore";
import { shippingAddressSchema } from "@/lib/validation";
import type { ShippingAddress } from "@/lib/types";

interface PatchBody {
  action: "cancel" | "update_address";
  shippingAddress?: ShippingAddress;
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
  const body: PatchBody = await request.json();
  const orderRef = adminDb.collection("orders").doc(id);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderSnap.data()!;

  if (order.userId !== authResult.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.action === "cancel") {
    if (order.orderStatus !== "pending") {
      return NextResponse.json(
        { error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    try {
      await adminDb.runTransaction(async (tx) => {
        // Re-read inside transaction to guard against concurrent status changes
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists || freshSnap.data()!.orderStatus !== "pending") {
          throw new Error("Order is no longer cancellable");
        }
        const freshItems = freshSnap.data()!.items;
        // All reads must come before all writes in a Firestore transaction
        const productRefs = freshItems.map((item: { productId: string }) =>
          adminDb.collection("products").doc(item.productId)
        );
        const productSnaps = await Promise.all(productRefs.map((ref: FirebaseFirestore.DocumentReference) => tx.get(ref)));

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
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

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

    await orderRef.update({
      shippingAddress: validation.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

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

  return new NextResponse(null, { status: 204 });
}
