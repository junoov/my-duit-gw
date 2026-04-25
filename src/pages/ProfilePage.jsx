import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import CustomCategoryManager from "../components/CustomCategoryManager";

function ProfilePage() {
  const { user, signOutUser, signInWithGoogle, authError } = useAuth();
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const resolvedGooglePhoto =
    user?.photoURL ||
    user?.providerData?.find((item) => item?.providerId === "google.com")?.photoURL ||
    "";

  const userName = user?.displayName || user?.email?.split("@")[0] || "Pengguna";
  const userEmail = user?.email || "-";
  const userPhoto = resolvedGooglePhoto || "https://i.pravatar.cc/150?u=myduitku";
  const fallbackUserPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userName
  )}&background=4edea3&color=0b1326&bold=true&size=256`;

  return (
    <div className="space-y-6">
      <section className="wa-card p-6 rounded-[1.5rem] relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-tr from-primary to-secondary">
            <img 
              src={userPhoto}
              alt="User" 
              className="w-full h-full rounded-full border-4 border-surface-container-low object-cover"
              referrerPolicy="no-referrer"
              onError={(event) => {
                const target = event.currentTarget;
                if (target.src === fallbackUserPhoto) {
                  return;
                }
                target.src = fallbackUserPhoto;
              }}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-on-surface">{userName}</h2>
            <p className="text-sm font-medium text-on-surface-variant">{userEmail}</p>
          </div>
        </div>
      </section>

      <section className="wa-card p-4 sm:p-6 rounded-[1.5rem] space-y-6">
        <h3 className="text-lg font-bold tracking-tight text-on-surface">Pengaturan Akun</h3>
        <div className="space-y-3 mt-4">
          {user ? (
            <button className="w-full flex items-center justify-between p-4 rounded-xl wa-field text-on-surface-variant font-medium cursor-not-allowed" disabled>
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">key</span>
                Login via Google
              </span>
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
          ) : (
            <button
              className="w-full flex items-center justify-between p-4 rounded-xl wa-button-primary font-bold"
              onClick={async () => {
                setLoading(true);
                try {
                  await signInWithGoogle();
                } catch (error) {
                  showToast({
                    message: error instanceof Error ? error.message : "Login Google gagal. Coba lagi.",
                    type: "error"
                  });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined">login</span>
                {loading ? "Memproses..." : "Masuk dengan Google"}
              </span>
            </button>
          )}

          {user ? (
            <button
              className="w-full flex items-center justify-between p-4 rounded-xl wa-field hover:bg-tertiary/10 transition-colors text-tertiary font-bold disabled:opacity-50"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await signOutUser();
                } catch (error) {
                  showToast({
                    message:
                      error instanceof Error ? error.message : "Gagal logout. Coba lagi.",
                    type: "error"
                  });
                } finally {
                  setLoading(false);
                }
              }}
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined">logout</span>
                {loading ? "Memproses..." : "Keluar dari Aplikasi"}
              </span>
            </button>
          ) : null}

          {!user && authError ? (
            <p className="text-sm bg-tertiary/10 text-tertiary rounded-xl p-3">{authError}</p>
          ) : null}

          {user && <CustomCategoryManager />}
        </div>
      </section>
      
      <p className="text-center text-[10px] font-bold tracking-widest uppercase text-on-surface-variant opacity-50">
        Versi Aplikasi 1.1.0-alpha
      </p>
    </div>
  );
}

export default ProfilePage;
