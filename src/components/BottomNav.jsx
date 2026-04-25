import { NavLink } from "react-router-dom";

function BottomNav() {
  const inactiveClass = "flex-1 min-w-0 flex flex-col items-center justify-center text-on-surface-variant px-1 sm:px-2 py-2 hover:text-primary transition-all active:scale-95 duration-200 group";
  const activeClass = "flex-1 min-w-0 flex flex-col items-center justify-center bg-primary/12 text-primary rounded-2xl px-1 sm:px-2 py-2 active:scale-95 duration-200 group";

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl flex justify-between items-center px-2 sm:px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 bg-surface/92 backdrop-blur-xl z-50 rounded-t-3xl border-t border-outline-variant/20 shadow-[0_-18px_48px_rgba(0,0,0,0.45)]">
      <NavLink
        to="/"
        className={({ isActive }) => isActive ? activeClass : inactiveClass}
      >
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined mb-1" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>grid_view</span>
            <span className="font-['Inter'] text-[10px] font-medium tracking-widest uppercase truncate w-full text-center">Beranda</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/buku"
        className={({ isActive }) => isActive ? activeClass : inactiveClass}
      >
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined mb-1" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>account_balance_wallet</span>
            <span className="font-['Inter'] text-[10px] font-medium tracking-widest uppercase truncate w-full text-center">Buku</span>
          </>
        )}
      </NavLink>

      <div className="flex-shrink-0 mx-1">
        <NavLink
          to="/tambah"
          className="w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-[0_0_26px_rgba(52,211,153,0.32)] active:scale-95 duration-200 -mt-8 border-4 border-background relative z-20"
          aria-label="Tambah Transaksi"
        >
          <span className="material-symbols-outlined text-3xl font-bold hover:rotate-90 transition-transform">add</span>
        </NavLink>
      </div>

      <NavLink
        to="/laporan"
        className={({ isActive }) => isActive ? activeClass : inactiveClass}
      >
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined mb-1" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>query_stats</span>
            <span className="font-['Inter'] text-[10px] font-medium tracking-widest uppercase truncate w-full text-center">Laporan</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/profil"
        className={({ isActive }) => isActive ? activeClass : inactiveClass}
      >
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined mb-1" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>settings</span>
            <span className="font-['Inter'] text-[10px] font-medium tracking-widest uppercase truncate w-full text-center">Profil</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}

export default BottomNav;
