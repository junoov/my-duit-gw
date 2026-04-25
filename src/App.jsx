import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import HomePage from "./pages/HomePage";

const AddTransactionPage = lazy(() => import("./pages/AddTransactionPage"));
const BooksPage = lazy(() => import("./pages/BooksPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const AccountHistoryPage = lazy(() => import("./pages/AccountHistoryPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function AuthNeededCard({ title, description, authError, onSignIn }) {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <section className="bg-surface-container-low rounded-[1.5rem] p-6 space-y-4">
        <p className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">
          Login Diperlukan
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">{title}</h1>
        <p className="text-sm text-on-surface-variant">{description}</p>
        {authError ? (
          <p className="text-sm bg-tertiary/10 text-tertiary rounded-xl p-3">{authError}</p>
        ) : null}
        <button
          type="button"
          onClick={onSignIn}
          className="w-full bg-primary text-on-primary font-bold py-4 rounded-full"
        >
          Lanjut dengan Google
        </button>
      </section>
    </div>
  );
}

function App() {
  const { user, initializing, authError, signInWithGoogle } = useAuth();
  const { showToast } = useToast();

  if (initializing) {
    return <p className="feedback-text">Menyiapkan login...</p>;
  }

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Login Google gagal. Coba lagi.",
        type: "error"
      });
    }
  };

  const protectPage = (title, description, element) => {
    if (user) {
      return element;
    }

    return (
      <AuthNeededCard
        title={title}
        description={description}
        authError={authError}
        onSignIn={handleSignIn}
      />
    );
  };

  return (
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<p className="feedback-text">Memuat halaman...</p>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/tambah"
            element={protectPage(
              "Masuk untuk tambah transaksi",
              "Fitur ini menyimpan data ke akun kamu agar tetap aman dan bisa diakses lintas device.",
              <AddTransactionPage />
            )}
          />
          <Route
            path="/buku"
            element={protectPage(
              "Masuk untuk kelola rekening",
              "Login diperlukan supaya data rekening tersimpan di akunmu.",
              <BooksPage />
            )}
          />
          <Route
            path="/buku/:accountId"
            element={protectPage(
              "Masuk untuk lihat riwayat rekening",
              "Riwayat transaksi rekening hanya bisa dibuka setelah login.",
              <AccountHistoryPage />
            )}
          />
          <Route
            path="/laporan"
            element={protectPage(
              "Masuk untuk lihat laporan",
              "Laporan keuangan ditampilkan dari data akunmu, jadi perlu login dulu.",
              <ReportPage />
            )}
          />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </AppShell>
    </ErrorBoundary>
  );
}

export default App;
