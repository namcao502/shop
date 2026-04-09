"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/firebase/auth-context";
import type { Notification } from "@/lib/types";

export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markOneRead: (id: string) => Promise<void>;
} {
  const { user, getIdToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Admins see their own notifications plus the shared "admin" feed
    const userIds = user.isAdmin ? [user.id, "admin"] : [user.id];

    const q = query(
      collection(db, "notifications"),
      where("userId", "in", userIds),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Notification, "id" | "createdAt">),
            createdAt: d.data().createdAt?.toDate() ?? new Date(),
          }))
        );
      },
      (err) => {
        console.error("useNotifications snapshot error", err);
      }
    );

    return unsub;
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark all read via API (batch update on server)
  const markAllRead = useCallback(async () => {
    if (!user) return;
    const token = await getIdToken();
    if (!token) return;
    await fetch("/api/notifications/read-all", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [user, getIdToken]);

  // Mark one read via client Firestore SDK (security rules allow read field update)
  const markOneRead = useCallback(async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  }, []);

  return { notifications, unreadCount, markAllRead, markOneRead };
}
