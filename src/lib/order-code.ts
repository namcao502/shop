import { adminDb } from "./firebase/admin";
import type { Transaction, DocumentSnapshot, DocumentReference } from "firebase-admin/firestore";

export const orderCounterRef = adminDb.collection("counters").doc("orders");

// Synchronous — caller must have already read counterDoc before any writes.
export function generateOrderCode(
  tx: Transaction,
  counterRef: DocumentReference,
  counterDoc: DocumentSnapshot
): string {
  let nextVal = 1;

  if (counterDoc.exists) {
    nextVal = (counterDoc.data()?.current ?? 0) + 1;
    tx.update(counterRef, { current: nextVal });
  } else {
    tx.set(counterRef, { current: nextVal });
  }

  return `ORD${String(nextVal).padStart(4, "0")}`;
}
