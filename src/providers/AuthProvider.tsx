import React, { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { login, logout, onAuthChanged, signup } from "../lib/firebase/auth";
import { initFCM } from "../lib/firebase/messaging";
import { AuthContext, type AuthContextValue } from "../contexts/AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChanged((u) => {
      setUser(u);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setupFCM() {
      try {
        if (!user) return;
        if (!("Notification" in window)) return;
        if (!("serviceWorker" in navigator)) return;

        const perm =
          Notification.permission === "default"
            ? await Notification.requestPermission()
            : Notification.permission;

        if (cancelled) return;

        if (perm === "granted") {
          await initFCM();
        }
      } catch (e) {
        console.warn("FCM setup failed:", e);
      }
    }

    setupFCM();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async loginWithEmail(email, password) {
        await login(email, password);
      },
      async signupWithEmail(name, email, password) {
        await signup(email, password, name);
      },
      async logoutUser() {
        await logout();
      },
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
