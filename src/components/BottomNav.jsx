import { NavLink } from "react-router-dom";

function BottomNav() {
  const inactiveClass = "flex-1 flex flex-col items-center justify-center text-[#b9c8de] px-1 sm:px-2 py-2 hover:text-[#4edea3] transition-all active:scale-90 duration-200 group";
  const activeClass = "flex-1 flex flex-col items-center justify-center bg-[#4edea3]/10 text-[#4edea3] rounded-2xl px-1 sm:px-2 py-2 active:scale-90 duration-200 group";

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl flex justify-between items-center px-2 pb-6 pt-3 bg-[#131b2e]/90 backdrop-blur-md z-50 rounded-t-3xl border-t border-[#3c4a42]/30 shadow-[0_-8px_24px_rgba(6,14,32,0.6)]">
      <NavLink
        to="/"
        className={({ isActive }) => isActive ? activeClass : inactiveClass}
      >
        {({ isActive }) => (
          <>
            <span className="material-symbols-outlined mb-1" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>grid_view</span>
            <span className="font-['Inter'] text-[10px] font-medium tracking-widest uppercase truncate w-full text-center">Home</span>
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
          className="w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(78,222,163,0.3)] active:scale-95 duration-200 -mt-8 border-4 border-[#0b1326] relative z-20" 
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
