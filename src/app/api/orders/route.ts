import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { generateOrderCode, orderCounterRef } from "@/lib/order-code";
import { FieldValue } from "firebase-admin/firestore";
import type { OrderItem } from "@/lib/types";
import { shippingAddressSchema } from "@/lib/validation";
import { writeNotification } from "@/lib/notifications";
import { calculateShippingFee } from "@/lib/shipping";
import { calculateEffectivePrice } from "@/lib/pricing";
import type { SiteWideDiscount } from "@/lib/pricing";
import { z } from "zod";

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(100),
      })
    )
    .min(1)
    .max(20),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(["vietqr", "momo"]),
});

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const body = parsed.data;

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      // 1. All reads first
      const productRefs = body.items.map((item) =>
        adminDb.collection("products").doc(item.productId)
      );
      const settingsRef = adminDb.collection("settings").doc("discount");
      const [productDocs, counterDoc, settingsDoc] = await Promise.all([
        Promise.all(productRefs.map((ref) => tx.get(ref))),
        tx.get(orderCounterRef),
        tx.get(settingsRef),
      ]);

      const siteWide: SiteWideDiscount = settingsDoc.exists
        ? (settingsDoc.data() as SiteWideDiscount)
        : { active: false, value: 0 };

      // 2. Validate products
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

        const effectivePrice = calculateEffectivePrice(
          { price: data.price, discountPrice: data.discountPrice },
          siteWide
        );

        orderItems.push({
          productId: reqItem.productId,
          name: data.name,
          price: effectivePrice,
          qty: reqItem.qty,
        });

        subtotal += effectivePrice * reqItem.qty;
      }

      // 3. All writes
      for (let i = 0; i < body.items.length; i++) {
        const data = productDocs[i].data()!;
        tx.update(productRefs[i], { stock: data.stock - body.items[i].qty });
      }

      const orderCode = generateOrderCode(tx, orderCounterRef, counterDoc);

      // 3. Create order document
      const orderRef = adminDb.collection("orders").doc();
      const now = FieldValue.serverTimestamp();

      const shippingFee = calculateShippingFee(
        body.shippingAddress.province,
        subtotal
      );
      const totalAmount = subtotal + shippingFee;

      tx.set(orderRef, {
        orderCode,
        userId: authResult.uid,
        items: orderItems,
        shippingAddress: body.shippingAddress,
        subtotal,
        shippingFee,
        totalAmount,
        paymentMethod: body.paymentMethod,
        paymentStatus: "pending",
        orderStatus: "pending",
        createdAt: now,
        updatedAt: now,
      });

      // Customer: order placed
      writeNotification(
        {
          userId: authResult.uid,
          type: "order_placed",
          title: `Order ${orderCode} placed`,
          message: `Your order for ${orderItems.length} item(s) totalling ${totalAmount.toLocaleString("vi-VN")} VND has been received.`,
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );

      // Admin: new order arrived
      writeNotification(
        {
          userId: "admin",
          type: "new_order",
          title: `New order ${orderCode}`,
          message: `A new order (${orderItems.length} item(s), ${totalAmount.toLocaleString("vi-VN")} VND) has been placed.`,
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );

      return { orderId: orderRef.id, orderCode, subtotal, shippingFee, totalAmount };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
