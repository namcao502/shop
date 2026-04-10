import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId, orderCode } = await request.json();

  if (!orderId || !orderCode) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Fetch authoritative amount from Firestore -- never trust client-supplied amount
  const orderSnap = await adminDb.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const orderData = orderSnap.data()!;
  if (orderData.userId !== authResult.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const amount: number = orderData.totalAmount;

  const partnerCode = process.env.MOMO_PARTNER_CODE!;
  const accessKey = process.env.MOMO_ACCESS_KEY!;
  const secretKey = process.env.MOMO_SECRET_KEY!;
  const endpoint = process.env.MOMO_ENDPOINT!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  const requestId = `${partnerCode}-${Date.now()}`;
  const redirectUrl = `${baseUrl}/orders/${orderId}`;
  const ipnUrl = `${baseUrl}/api/momo/callback`;
  const orderInfo = `Payment for order ${orderCode}`;
  const requestType = "payWithMethod";
  const extraData = "";
  const autoCapture = true;
  const lang = "vi";

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderCode}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const momoBody = {
    partnerCode,
    partnerName: "Souvenir Shop",
    storeId: partnerCode,
    requestId,
    amount,
    orderId: orderCode,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang,
    requestType,
    autoCapture,
    extraData,
    signature,
  };

  const momoResponse = await fetch(`${endpoint}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(momoBody),
  });

  const momoData = await momoResponse.json();

  if (momoData.resultCode !== 0) {
    return NextResponse.json(
      { error: momoData.message ?? "MoMo payment creation failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ payUrl: momoData.payUrl });
}
