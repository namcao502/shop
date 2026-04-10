import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { writeNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    partnerCode,
    orderId: orderCode,
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
  } = body;

  // Verify HMAC signature
  const secretKey = process.env.MOMO_SECRET_KEY!;
  const accessKey = process.env.MOMO_ACCESS_KEY!;

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderCode}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType ?? ""}&requestId=${requestId}&responseTime=${responseTime ?? ""}&resultCode=${resultCode}&transId=${transId}`;

  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.error("MoMo webhook signature mismatch", {
      orderCode,
      expected: expectedSignature,
      received: signature,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Find order by orderCode
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
    // Wrap idempotency check + update + notifications in a transaction to
    // prevent duplicate processing on concurrent MoMo retries
    await adminDb.runTransaction(async (tx) => {
      const freshSnap = await tx.get(orderRef);
      if (!freshSnap.exists) throw new Error("Order not found");

      // Idempotent: skip if already paid
      if (freshSnap.data()!.paymentStatus === "paid") return;

      const order = freshSnap.data()!;

      tx.update(orderRef, {
        paymentStatus: "paid",
        orderStatus: "confirmed",
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Customer: payment confirmed
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

      // Admin: payment received
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
    // Payment failed
    console.error("MoMo payment failed", {
      orderCode,
      resultCode,
      message,
      fullPayload: body,
    });
    await orderRef.update({
      paymentStatus: "failed",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return NextResponse.json({ message: "OK" });
}
