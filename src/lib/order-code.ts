import { adminDb } from "./firebase/admin";
import type { Transaction } from "firebase-admin/firestore";

// Must be called within an existing transaction -- do NOT create a nested transaction.
export async function generateOrderCode(tx: Transaction): Promise<string> {
  const counterRef = adminDb.collection("counters").doc("orders");
  const counterDoc = await tx.get(counterRef);
  let nextVal = 1;

  if (counterDoc.exists) {
    nextVal = (counterDoc.data()?.current ?? 0) + 1;
    tx.update(counterRef, { current: nextVal });
  } else {
    tx.set(counterRef, { current: nextVal });
  }

  return `ORD${String(nextVal).padStart(4, "0")}`;
}
