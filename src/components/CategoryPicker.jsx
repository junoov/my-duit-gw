import { db } from "../db/database";
import { useCategories } from "../hooks/useCategories";

function CategoryPicker({ value, onChange }) {
  const { allCategories } = useCategories();

  const handleAddCategory = async () => {
    const categoryName = window.prompt("Masukkan nama kategori baru:");
    if (!categoryName || categoryName.trim() === "") return;
    
    // Buat slug id dari nama
    const newId = categoryName.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    
    await db.categories.add({
      id: newId,
      label: categoryName.trim(),
      icon: "bookmark", // Icon default untuk custom kategori
      createdAt: new Date().toISOString()
    });
    
    // Otomatis pilih kategori baru yang ditambahkan
    onChange(newId);
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-48 overflow-y-auto pr-1 pb-1">
      {allCategories.map((category) => {
        const isActive = value === category.id;
        return (
          <button
            key={category.id}
            type="button"
            className={`flex flex-col items-center justify-center p-3 rounded-[1.2rem] transition-all duration-200 border-2 ${
              isActive 
                ? "bg-primary text-on-primary border-primary shadow-lg shadow-primary/30 scale-100" 
                : "bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container-high hover:scale-105 active:scale-95"
            }`}
            onClick={() => onChange(category.id)}
          >
            <span className="material-symbols-outlined mb-1" style={{ fontSize: "24px", fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{category.icon}</span>
            <span className="text-[10px] font-bold tracking-tight text-center leading-tight line-clamp-1 w-full">{category.label}</span>
          </button>
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
