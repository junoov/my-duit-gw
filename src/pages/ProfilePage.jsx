function ProfilePage() {
  return (
    <div className="space-y-6">
      <section className="bg-surface-container-low p-6 rounded-[1.5rem] relative overflow-hidden flex flex-col items-center justify-center">
        {/* Decorative background */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-tr from-primary to-secondary">
            <img 
              src="https://i.pravatar.cc/150?u=myduitku" 
              alt="User" 
              className="w-full h-full rounded-full border-4 border-surface-container-low object-cover"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-on-surface">Rizky</h2>
            <p className="text-sm font-medium text-on-surface-variant">rizky@example.com</p>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low p-6 rounded-[1.5rem] space-y-6">
        <h3 className="text-lg font-bold tracking-tight text-on-surface">Pengaturan Akun</h3>
        <div className="space-y-3 mt-4">
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-container-highest hover:bg-surface-bright transition-colors text-on-surface font-medium">
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">key</span>
              Ubah Password
            </span>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </button>
          
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-container-highest hover:bg-tertiary/10 transition-colors text-tertiary font-bold">
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined">logout</span>
              Keluar dari Aplikasi
            </span>
          </button>
        </div>
      </section>
      
      <p className="text-center text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-50">
        Versi Aplikasi 1.1.0-alpha
      </p>
    </div>
  );
}

export default ProfilePage;
