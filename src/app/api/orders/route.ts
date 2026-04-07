import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { generateOrderCode } from "@/lib/order-code";
import { FieldValue } from "firebase-admin/firestore";
import type { ShippingAddress, PaymentMethod, OrderItem } from "@/lib/types";

interface CreateOrderBody {
  items: { productId: string; qty: number }[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateOrderBody = await request.json();

  if (!body.items?.length || !body.shippingAddress || !body.paymentMethod) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!["vietqr", "momo"].includes(body.paymentMethod)) {
    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 }
    );
  }

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      // 1. Read all product documents and verify stock
      const productRefs = body.items.map((item) =>
        adminDb.collection("products").doc(item.productId)
      );
      const productDocs = await Promise.all(productRefs.map((ref) => tx.get(ref)));

      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      for (let i = 0; i < body.items.length; i++) {
        const doc = productDocs[i];
        const reqItem = body.items[i];

        if (!doc.exists) {
          throw new Error(`Product ${reqItem.productId} not found`);
        }

        const data = doc.data()!;

        if (!data.isPublished) {
          throw new Error(`Product ${data.name} is not available`);
        }

        if (data.stock < reqItem.qty) {
          throw new Error(
            `Not enough stock for ${data.name}. Available: ${data.stock}`
          );
        }

        // Decrement stock
        tx.update(productRefs[i], { stock: data.stock - reqItem.qty });

        orderItems.push({
          productId: reqItem.productId,
          name: data.name,
          price: data.price,
          qty: reqItem.qty,
        });

        subtotal += data.price * reqItem.qty;
      }

      // 2. Generate order code (within same transaction -- no nesting)
      const orderCode = await generateOrderCode(tx);

      // 3. Create order document
      const orderRef = adminDb.collection("orders").doc();
      const now = FieldValue.serverTimestamp();

      tx.set(orderRef, {
        orderCode,
        userId: authResult.uid,
        items: orderItems,
        shippingAddress: body.shippingAddress,
        subtotal,
        shippingFee: 0,
        totalAmount: subtotal,
        paymentMethod: body.paymentMethod,
        paymentStatus: "pending",
        orderStatus: "pending",
        createdAt: now,
        updatedAt: now,
      });

      return { orderId: orderRef.id, orderCode, subtotal, totalAmount: subtotal };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
