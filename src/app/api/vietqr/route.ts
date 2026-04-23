// src/app/api/vietqr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/verify-admin";
import { z } from "zod";

const bodySchema = z.object({
  orderId: z.string().min(1),
  orderCode: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request.headers.get("Authorization"));
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { orderId, orderCode } = parsed.data;

  try {
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

    const amount: unknown = orderData.totalAmount;
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid order amount" }, { status: 500 });
    }

    const bankId = process.env.VIETQR_BANK_ID;
    const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER;
    const accountName = process.env.VIETQR_ACCOUNT_NAME;

    if (!bankId || !accountNumber) {
      return NextResponse.json({ error: "Payment configuration error" }, { status: 500 });
    }

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(accountName ?? "")}`;

    return NextResponse.json({ qrUrl, orderCode, amount });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
