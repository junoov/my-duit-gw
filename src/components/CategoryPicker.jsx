import { useToast } from "../context/ToastContext";
import { defaultCategoryId } from "../data/categories";
import { useCategories } from "../hooks/useCategories";
import { addCustomCategory, removeCustomCategory } from "../services/categoryService";

function CategoryPicker({ value, onChange }) {
  const { allCategories, isCustomCategory } = useCategories();
  const { showToast } = useToast();

  const handleAddCategory = async () => {
    const categoryName = window.prompt("Masukkan nama kategori baru:");
    if (!categoryName || categoryName.trim() === "") return;

    try {
      const category = await addCustomCategory(categoryName);
      onChange(category.id);
      showToast({ message: "Kategori baru berhasil ditambahkan." });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Gagal menambahkan kategori.",
        type: "error"
      });
    }
  };

  const handleDeleteCategory = async (event, category) => {
    event.preventDefault();
    event.stopPropagation();

    if (!category || !isCustomCategory(category.id)) {
      return;
    }

    const confirmed = window.confirm(
      `Hapus kategori "${category.label}"? Transaksi lama akan dipindah ke kategori "Lainnya".`
    );
    if (!confirmed) {
      return;
    }

    try {
      const result = await removeCustomCategory(category.id, "lainnya");
      if (value === category.id) {
        onChange(defaultCategoryId);
      }

      showToast({
        message:
          result.reassignedTransactions > 0
            ? `Kategori dihapus. ${result.reassignedTransactions} transaksi dipindah ke Lainnya.`
            : "Kategori berhasil dihapus."
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Gagal menghapus kategori.",
        type: "error"
      });
    }
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-48 overflow-y-auto pr-1 pb-1">
      {allCategories.map((category) => {
        const isActive = value === category.id;
        const isCustom = isCustomCategory(category.id);
        return (
          <div className="relative" key={category.id}>
            <button
              type="button"
              className={`w-full flex flex-col items-center justify-center p-3 rounded-[1.2rem] transition-all duration-200 border-2 ${
                isActive
                  ? "bg-primary text-on-primary border-primary shadow-lg shadow-primary/30 scale-100"
                  : "bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container-high hover:scale-105 active:scale-95"
              }`}
              onClick={() => onChange(category.id)}
            >
              <span
                className="material-symbols-outlined mb-1"
                style={{ fontSize: "24px", fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {category.icon}
              </span>
              <span className="text-[10px] font-bold tracking-tight text-center leading-tight line-clamp-1 w-full">
                {category.label}
              </span>
            </button>

            {isCustom ? (
              <button
                type="button"
                className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border border-outline-variant/40 flex items-center justify-center transition-colors ${
                  isActive
                    ? "bg-surface-container-low text-tertiary hover:bg-surface-container-high"
                    : "bg-surface-container-high text-tertiary hover:bg-surface-bright"
                }`}
                onClick={(event) => handleDeleteCategory(event, category)}
                aria-label={`Hapus kategori ${category.label}`}
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            ) : null}
          </div>
        );
      })}
      
      {/* Tombol Tambah Kategori */}
      <button
        type="button"
        className="flex flex-col items-center justify-center p-3 rounded-[1.2rem] transition-all duration-200 border-2 border-dashed border-outline-variant/50 bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:border-outline-variant hover:scale-105 active:scale-95"
        onClick={handleAddCategory}
      >
        <span className="material-symbols-outlined mb-1 text-primary" style={{ fontSize: "24px" }}>add_circle</span>
        <span className="text-[10px] font-bold tracking-tight text-center text-primary leading-tight">Tambah Baru</span>
      </button>
    </div>
  );
}

export default CategoryPicker;
