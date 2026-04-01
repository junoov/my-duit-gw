import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, assertFirebaseReady, googleProvider } from "../services/firebaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!auth) {
      setAuthError(
        "Firebase belum aktif. Isi env VITE_FIREBASE_* dulu supaya login lintas device bisa dipakai."
      );
      setInitializing(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser || null);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      authError,
      signInWithGoogle: async () => {
        assertFirebaseReady();
        setAuthError("");
        await signInWithPopup(auth, googleProvider);
      },
      signOutUser: async () => {
        assertFirebaseReady();
        await signOut(auth);
      }
    }),
    [user, initializing, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  }
  return context;
}
