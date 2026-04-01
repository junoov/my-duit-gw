export function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
  };
}

export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return Object.values(config).every((value) => value.length > 0);
}

export async function syncTransactionsPlaceholder(transactions) {
  if (!Array.isArray(transactions)) {
    throw new Error("Payload sinkronisasi harus berupa array transaksi.");
  }

  return {
    ready: isFirebaseConfigured(),
    synced: transactions.length,
    skipped: 0,
    message:
      "Sinkronisasi lintas device sekarang ditangani langsung oleh Firestore per user. Adapter ini hanya fallback kompatibilitas."
  };
}
