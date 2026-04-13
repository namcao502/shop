// src/lib/notifications.ts
import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { NotificationType } from "./types";

interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId: string | null;
  orderCode: string | null;
}

/**
 * Write a notification document.
 * Pass `tx` to include the write in an existing Firestore transaction.
 * Without `tx`, the write is fire-and-forget.
 */
export function writeNotification(
  data: NotificationInput,
  tx?: FirebaseFirestore.Transaction
): void {
  const ref = adminDb.collection("notifications").doc();
  const payload = {
    ...data,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (tx) {
    tx.set(ref, payload);
  } else {
    ref.set(payload).catch((err: unknown) => {
      console.error("writeNotification failed", err);
    });
  }
}
