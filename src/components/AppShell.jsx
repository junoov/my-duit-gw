import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import BottomNav from "./BottomNav";

function AppShell({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();

  const resolvedGooglePhoto =
    user?.photoURL ||
    user?.providerData?.find((item) => item?.providerId === "google.com")?.photoURL ||
    "";

  const isHome = location.pathname === "/";
  const profileName =
    user?.displayName || user?.email?.split("@")[0] || "Pengguna";
  const profilePhoto = resolvedGooglePhoto || "https://i.pravatar.cc/150?u=myduitku";
  const fallbackProfilePhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profileName
  )}&background=4edea3&color=0b1326&bold=true`;
  const title = isHome 
    ? "" 
    : location.pathname === "/tambah" 
      ? "Tambah Transaksi" 
      : location.pathname === "/buku"
        ? "Buku & Rekening"
      : location.pathname.startsWith("/buku/")
        ? "History Rekening"
      : location.pathname === "/laporan" 
        ? "Laporan Keuangan" 
        : "";

  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary min-h-screen">
      <header className={`w-full top-0 sticky z-50 shadow-none ${isHome ? 'bg-[#131b2e]' : 'bg-[#0b1326]'}`}>
        <div className={`flex items-center px-6 py-4 w-full mx-auto max-w-xl ${isHome ? "justify-between" : "justify-center"}`}>
          {isHome ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center">
                  <img
                    alt="User Profile"
                    className="w-full h-full object-cover"
                    src={profilePhoto}
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      const target = event.currentTarget;
                      if (target.src === fallbackProfilePhoto) {
                        return;
                      }
                      target.src = fallbackProfilePhoto;
                    }}
                  />
                </div>
                <span className="text-xl font-black text-[#4edea3] tracking-tighter font-headline">{profileName}</span>
              </div>
              <button className="w-10 h-10 flex items-center justify-center text-[#b9c8de] hover:bg-[#222a3d] transition-colors active:scale-95 duration-200 rounded-full">
                <span className="material-symbols-outlined">notifications</span>
              </button>
            </>
          ) : (
            <>
              <h1 className="text-lg font-bold tracking-tight text-on-surface">{title}</h1>
            </>
          )}
        </div>
        {!isOnline ? (
          <div className="px-6 pb-3">
            <p className="max-w-xl mx-auto text-xs font-semibold bg-tertiary/15 text-tertiary rounded-full px-4 py-2 text-center">
              Mode offline aktif. Perubahan disimpan lokal dulu dan akan sinkron otomatis saat online.
            </p>
          </div>
        ) : null}
      </header>

      <main className="max-w-xl mx-auto px-6 pt-4 pb-32 space-y-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

export default AppShell;
