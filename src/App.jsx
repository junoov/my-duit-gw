import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";

const AddTransactionPage = lazy(() => import("./pages/AddTransactionPage"));
const BooksPage = lazy(() => import("./pages/BooksPage"));
const ReportPage = lazy(() => import("./pages/ReportPage"));
const AccountHistoryPage = lazy(() => import("./pages/AccountHistoryPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function App() {
  return (
    <AppShell>
      <Suspense fallback={<p className="feedback-text">Memuat halaman...</p>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tambah" element={<AddTransactionPage />} />
          <Route path="/buku" element={<BooksPage />} />
          <Route path="/buku/:accountId" element={<AccountHistoryPage />} />
          <Route path="/laporan" element={<ReportPage />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
