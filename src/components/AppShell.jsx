import { useLocation, useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";

function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === "/";
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
        <div className="flex items-center justify-between px-6 py-4 w-full mx-auto max-w-xl">
          {isHome ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center">
                  <img alt="User Profile" className="w-full h-full object-cover" src="https://i.pravatar.cc/150?u=myduitku" />
                </div>
                <span className="text-xl font-black text-[#4edea3] tracking-tighter font-headline">Rizky</span>
              </div>
              <button className="w-10 h-10 flex items-center justify-center text-[#b9c8de] hover:bg-[#222a3d] transition-colors active:scale-95 duration-200 rounded-full">
                <span className="material-symbols-outlined">notifications</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(-1)}>
                <button type="button" className="text-[#b9c8de] hover:text-[#4edea3] transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[1.6rem]">arrow_back_ios_new</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight text-on-surface">{title}</h1>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-4 pb-32 space-y-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

export default AppShell;
