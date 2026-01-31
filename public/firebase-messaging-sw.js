/* global self */
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

// ⚠️ use as mesmas configs do seu firebase.ts (copie exatamente)
firebase.initializeApp({
  apiKey: "AIzaSyAeq5_Kg7A9ZIzBfFCe6Vav7ZyRtZG2z5k",
  authDomain: "os-jads.firebaseapp.com",
  databaseURL: "https://os-jads-default-rtdb.firebaseio.com/",
  projectId: "os-jads",
  storageBucket: "os-jads.firebasestorage.app",
  messagingSenderId: "825378986886",
  appId: "1:825378986886:web:81b0242f51e738065fea07",
});

const messaging = firebase.messaging();

// background notifications
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Nova atualização";
  const options = {
    body: payload?.notification?.body,
    icon: "/favicon.ico",
    data: payload?.data || {},
  };

  self.registration.showNotification(title, options);
});
