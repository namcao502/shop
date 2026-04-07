import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

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
    signature,
  } = body;

  // Verify HMAC signature
  const secretKey = process.env.MOMO_SECRET_KEY!;
  const accessKey = process.env.MOMO_ACCESS_KEY!;

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderCode}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${body.payType}&requestId=${requestId}&responseTime=${body.responseTime}&resultCode=${resultCode}&transId=${transId}`;

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

  const orderDoc = ordersSnap.docs[0];

  // Idempotent: skip if already paid
  if (orderDoc.data().paymentStatus === "paid") {
    return NextResponse.json({ message: "Already processed" });
  }

  if (resultCode === 0) {
    // Payment successful
    await orderDoc.ref.update({
      paymentStatus: "paid",
      orderStatus: "confirmed",
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Payment failed
    console.error("MoMo payment failed", {
      orderCode,
      resultCode,
      message,
      fullPayload: body,
    });
    await orderDoc.ref.update({
      paymentStatus: "failed",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return NextResponse.json({ message: "OK" });
}
