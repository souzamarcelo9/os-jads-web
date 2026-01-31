import { getToken, isSupported, onMessage } from "firebase/messaging";
import { ref, set } from "firebase/database";

import { auth, rtdb, getFirebaseMessaging } from "./firebase";

const TENANT_ID = "default";

export async function initFCM() {
  const supported = await isSupported();
  if (!supported) return { supported: false, token: null };

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
  if (!vapidKey) throw new Error("VITE_FIREBASE_VAPID_KEY não configurada.");

  const messaging = await getFirebaseMessaging();
  if (!messaging) return { supported: false, token: null };

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) return { supported: true, token: null };

  const uid = auth.currentUser?.uid;

  if (uid) {
    await set(
      ref(rtdb, `tenants/${TENANT_ID}/userTokens/${uid}/${token}`),
      true
    );
  }

  // foreground
  onMessage(messaging, (payload) => {
    console.log("FCM message:", payload);
  });

  return { supported: true, token };
}
