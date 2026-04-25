import { useState } from "react";
import { useCategories } from "../hooks/useCategories";
import { useToast } from "../context/ToastContext";
import { addCustomCategory, removeCustomCategory } from "../services/categoryService";

function CustomCategoryManager() {
  const { allCategories, isCustomCategory } = useCategories();
  const { showToast } = useToast();
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const customCategories = allCategories.filter((c) => isCustomCategory(c.id));

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setSubmitting(true);
    try {
      await addCustomCategory(newCategoryName);
      setNewCategoryName("");
      showToast({ message: "Kategori berhasil ditambahkan." });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Gagal menambahkan kategori.",
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    setSubmitting(true);
    try {
      await removeCustomCategory(categoryId);
      showToast({ message: "Kategori berhasil dihapus. Transaksi dialihkan ke Lainnya." });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Gagal menghapus kategori.",
        type: "error"
      });
    } finally {
      setSubmitting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-4 mt-6 border-t border-outline-variant/20 pt-6">
      <h3 className="text-lg font-bold tracking-tight text-on-surface">Kategori Custom</h3>
      
      <form onSubmit={handleAddCategory} className="flex gap-2">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Nama Kategori (Mis: Kopi)"
          className="flex-1 min-w-0 wa-field rounded-xl px-4 py-3 text-on-surface outline-none transition-all placeholder:text-on-surface-variant/40 text-sm font-medium"
          required
        />
        <button
          type="submit"
          disabled={submitting || !newCategoryName.trim()}
          className="wa-button-primary font-bold px-4 sm:px-6 rounded-xl disabled:opacity-50 transition-colors"
        >
          Tambah
        </button>
      </form>

      {customCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          {customCategories.map((category) => (
            <div key={category.id} className="flex items-center justify-between p-3 rounded-xl wa-field">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-primary">{category.icon}</span>
                <p className="text-sm font-medium text-on-surface">{category.label}</p>
              </div>
              
              {confirmDeleteId === category.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-error">Yakin?</span>
                  <button onClick={() => handleDeleteCategory(category.id)} disabled={submitting} className="w-8 h-8 rounded-full bg-error text-on-error flex items-center justify-center hover:bg-error/80 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)} disabled={submitting} className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center hover:bg-surface-bright transition-colors">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(category.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-tertiary/60 hover:bg-tertiary/10 hover:text-tertiary transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-on-surface-variant text-center wa-field p-3 rounded-xl">
          Belum ada kategori custom.
        </p>
      )}
    </div>
  );
}

export default CustomCategoryManager;
