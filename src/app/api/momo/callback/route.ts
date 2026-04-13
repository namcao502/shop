// src/app/api/momo/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { writeNotification } from "@/lib/notifications";
import { env } from "@/lib/env";
import { z } from "zod";

const momoCallbackSchema = z.object({
  partnerCode: z.string(),
  orderId: z.string(),
  requestId: z.string(),
  amount: z.number(),
  orderInfo: z.string(),
  orderType: z.string(),
  transId: z.coerce.string(),
  resultCode: z.number(),
  message: z.string(),
  extraData: z.string(),
  payType: z.string(),
  responseTime: z.coerce.string(),
  signature: z.string(),
});

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = momoCallbackSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const {
    partnerCode,
    orderId: momoOrderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    extraData,
    payType,
    responseTime,
    signature,
  } = parsed.data;

  // Extract orderCode from momoOrderId. Two possible formats:
  // - Simple (current create/route.ts): "ORD0042" -- split gives ["ORD0042"], index 0 = "ORD0042"
  // - Composite (after retry-safe update): "ORD0042-<requestId>" -- split gives ["ORD0042", ...], index 0 = "ORD0042"
  // orderCode is always "ORD" + digits (no hyphens), so split("-")[0] recovers it safely in both cases.
  const orderCode = momoOrderId.split("-")[0];

  // Verify HMAC using validated (typed) values only -- no ?? "" fallbacks
  const rawSignature = `accessKey=${env.momo.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${momoOrderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

  const expectedSignature = crypto
    .createHmac("sha256", env.momo.secretKey)
    .update(rawSignature)
    .digest("hex");

  if (signature !== expectedSignature) {
    // Never log the expected signature -- only log a mismatch indicator
    console.error("MoMo webhook signature mismatch", { orderCode, match: false });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const ordersSnap = await adminDb
    .collection("orders")
    .where("orderCode", "==", orderCode)
    .limit(1)
    .get();

  if (ordersSnap.empty) {
    console.error("MoMo webhook: order not found", { orderCode });
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderRef = ordersSnap.docs[0].ref;

  if (resultCode === 0) {
    await adminDb.runTransaction(async (tx) => {
      const freshSnap = await tx.get(orderRef);
      if (!freshSnap.exists) throw new Error("Order not found");

      const order = freshSnap.data()!;

      // Idempotent: skip if already paid
      if (order.paymentStatus === "paid") return;

      // Verify amount matches the stored order total
      if (order.totalAmount !== amount) {
        console.error("MoMo webhook: amount mismatch", {
          orderCode,
          expected: order.totalAmount,
          received: amount,
        });
        throw new Error("Payment amount mismatch");
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
          title: `Payment confirmed for ${orderCode}`,
          message: "Your MoMo payment has been verified. Your order is being prepared.",
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );

      writeNotification(
        {
          userId: "admin",
          type: "payment_received",
          title: `Payment received for ${orderCode}`,
          message: `MoMo payment confirmed for order ${orderCode}.`,
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );
    });
  } else {
    // Payment failed -- transactional so notification is atomic with the status update
    console.error("MoMo payment failed", { orderCode, resultCode });
    await adminDb.runTransaction(async (tx) => {
      const freshSnap = await tx.get(orderRef);
      if (!freshSnap.exists) throw new Error("Order not found");

      const order = freshSnap.data()!;

      // Idempotent: skip if already marked failed
      if (order.paymentStatus === "failed") return;

      tx.update(orderRef, {
        paymentStatus: "failed",
        updatedAt: FieldValue.serverTimestamp(),
      });

      writeNotification(
        {
          userId: order.userId,
          type: "payment_failed",
          title: `Payment failed for ${orderCode}`,
          message: "Your MoMo payment could not be processed. Please try again from your order page.",
          orderId: orderRef.id,
          orderCode,
        },
        tx
      );
    });
  }

  return NextResponse.json({ message: "OK" });
}
