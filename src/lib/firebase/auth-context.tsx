"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import type { AppUser } from "../types";

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  firebaseUser: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  getIdToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const [tokenResult, userSnap] = await Promise.all([
          fbUser.getIdTokenResult(),
          getDoc(doc(db, "users", fbUser.uid)),
        ]);
        const isAdmin = tokenResult.claims.isAdmin === true;

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUser({
            id: fbUser.uid,
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            isAdmin,
            createdAt: data.createdAt?.toDate() ?? new Date(),
          });
        } else {
          const newUser: Omit<AppUser, "id" | "isAdmin" | "createdAt"> & {
            createdAt: ReturnType<typeof serverTimestamp>;
          } = {
            email: fbUser.email ?? "",
            displayName: fbUser.displayName ?? "",
            photoURL: fbUser.photoURL ?? "",
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, "users", fbUser.uid), newUser);
          setUser({
            id: fbUser.uid,
            email: newUser.email,
            displayName: newUser.displayName,
            photoURL: newUser.photoURL,
            isAdmin,
            createdAt: new Date(),
          });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const getIdToken = async () => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, signIn, signOut, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
