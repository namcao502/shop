// src/app/api/vietqr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orderId, orderCode } = body;

  if (!orderId || !orderCode) {
    return NextResponse.json(
      { error: "Missing orderId or orderCode" },
      { status: 400 }
    );
  }

  const orderSnap = await adminDb.collection("orders").doc(orderId).get();
  if (!orderSnap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderData = orderSnap.data()!;

  if (orderData.userId !== authResult.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (orderData.orderCode !== orderCode) {
    return NextResponse.json({ error: "Order code mismatch" }, { status: 400 });
  }

  const amount: number = orderData.totalAmount;
  const bankId = process.env.VIETQR_BANK_ID;
  const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER;
  const accountName = process.env.VIETQR_ACCOUNT_NAME;

  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(accountName ?? "")}`;

  return NextResponse.json({ qrUrl, orderCode, amount });
}
