import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { resolveTransactionAccountLabel } from "../services/accountService";
import { formatRupiah, formatRupiahInput, parseRupiahInput } from "../utils/currency";
import { formatTransactionDateTime, toDateTimeInputValue } from "../utils/date";
import { useCategories } from "../hooks/useCategories";
import { updateTransaction } from "../services/transactionService";
import { useToast } from "../context/ToastContext";
import CategoryPicker from "./CategoryPicker";

function TransactionDetailModal({ transaction, accountMap, onClose, onDelete }) {
  const { getCategoryMeta } = useCategories();
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      document.body.style.overflow = "hidden";
      setIsEditing(false);
      setEditAmount(transaction.amount);
      setEditCategory(transaction.category);
      setEditDescription(transaction.description);
      setEditAccountId(transaction.accountId);
      
      const txDate = new Date(transaction.date);
      if (!Number.isNaN(txDate.getTime())) {
        setEditDate(toDateTimeInputValue(txDate));
      } else {
        setEditDate(toDateTimeInputValue(new Date()));
      }
    }
    return () => {
      document.body.style.overflow = "";
      setConfirmDelete(false);
      setDeleting(false);
    };
  }, [transaction]);

  const formattedEditAmount = useMemo(() => formatRupiahInput(editAmount), [editAmount]);
  const accounts = useMemo(() => Array.from(accountMap?.values() || []), [accountMap]);

  if (!transaction) {
    return null;
  }

  const category = getCategoryMeta(transaction.category);
  const accountLabel = resolveTransactionAccountLabel(transaction, accountMap);
  const methodLabel = transaction.inputMethod === "scan" ? "Scan struk" : "Input manual";

  const toggleEdit = () => {
    if (isEditing) {
      setEditAmount(transaction.amount);
      setEditCategory(transaction.category);
      setEditDescription(transaction.description);
      setEditAccountId(transaction.accountId);
      const txDate = new Date(transaction.date);
      if (!Number.isNaN(txDate.getTime())) {
        setEditDate(toDateTimeInputValue(txDate));
      }
    }
    setIsEditing(!isEditing);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTransaction(transaction.id, {
        amount: editAmount,
        category: editCategory,
        description: editDescription,
        accountId: editAccountId,
        date: editDate,
      });
      showToast({ message: "Transaksi berhasil diperbarui" });
      setIsEditing(false);
    } catch (err) {
      console.error("Gagal update transaksi", err);
      showToast({ message: "Gagal menyimpan: " + err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 pb-0 sm:pb-6" role="presentation" onClick={onClose}>
      <div className="absolute inset-0 bg-surface-container-low/80 backdrop-blur-sm transition-opacity" />
      
      <section
        className="relative w-full max-w-lg wa-card rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Detail transaksi"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto my-3 sm:hidden" />
        
        <header className="flex justify-between items-start pt-4 sm:pt-6 px-6 pb-4 border-b border-outline-variant/20">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">
              {isEditing ? "Edit Transaksi" : "Detail Transaksi"}
            </p>
            {!isEditing && <h3 className="text-xl font-bold text-on-surface">{transaction.description}</h3>}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button 
                type="button" 
                className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={toggleEdit}
                aria-label="Edit transaksi"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            )}
            <button type="button" className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors" onClick={onClose} aria-label="Tutup">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </header>

        <div className="overflow-y-auto px-6 py-6 space-y-8">
          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-6">
              <label className="block space-y-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Nominal Transaksi</span>
                <div className="flex items-center wa-field rounded-xl px-4 overflow-hidden transition-colors">
                  <strong className={`text-xl font-bold ${transaction.type === 'expense' ? 'text-tertiary' : 'text-primary'} focus-within:text-surface-container-low`}>Rp</strong>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formattedEditAmount}
                    onChange={(e) => setEditAmount(parseRupiahInput(e.target.value))}
                    className="w-full bg-transparent border-none py-3 px-3 text-2xl font-bold font-headline text-on-surface outline-none"
                    required
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Catatan</span>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full wa-field rounded-xl px-4 py-3 text-on-surface outline-none transition-all font-medium"
                />
              </label>

              <div className="space-y-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Kategori</span>
                <div className="wa-field rounded-xl p-2 transition-all">
                  <CategoryPicker value={editCategory} onChange={setEditCategory} />
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Akun</span>
                <select
                  value={editAccountId}
                  onChange={(e) => setEditAccountId(e.target.value)}
                  className="w-full wa-field rounded-xl px-4 py-3 text-on-surface outline-none transition-all font-medium appearance-none"
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Tanggal & Waktu</span>
                <input
                  type="datetime-local"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full wa-field rounded-xl px-4 py-3 text-on-surface outline-none transition-all font-medium"
                  style={{ colorScheme: "dark" }}
                  required
                />
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={toggleEdit}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold text-on-surface wa-field hover:bg-surface-bright transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-xl text-sm font-bold wa-button-primary transition-colors"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="text-center space-y-1">
                <span className="text-sm font-medium text-on-surface-variant block">Nominal Transaksi</span>
                <p className={`text-4xl font-bold font-headline ${transaction.type === "expense" ? "text-tertiary" : "text-primary"}`}>
                  {transaction.type === "expense" ? "-" : "+"}
                  {formatRupiah(transaction.amount)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <article className="wa-field p-4 rounded-2xl relative overflow-hidden group">
                  <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant block mb-1">Kategori</span>
                  <strong className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] opacity-70" style={{fontVariationSettings: "'FILL' 1"}}>{category.icon}</span>
                    {category.label}
                  </strong>
                </article>
                <article className="wa-field p-4 rounded-2xl relative overflow-hidden">
                  <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant block mb-1">Akun</span>
                  <strong className="text-sm font-bold text-on-surface">{accountLabel}</strong>
                </article>
                <article className="wa-field p-4 rounded-2xl relative overflow-hidden">
                  <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant block mb-1">Waktu</span>
                  <strong className="text-sm font-bold text-on-surface">{formatTransactionDateTime(transaction.date)}</strong>
                </article>
                <article className="wa-field p-4 rounded-2xl relative overflow-hidden">
                  <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant block mb-1">Metode Input</span>
                  <strong className="text-sm font-bold text-on-surface">{methodLabel}</strong>
                </article>
              </div>

              {Array.isArray(transaction.lineItems) && transaction.lineItems.length > 0 && (
                <section className="wa-field p-5 rounded-3xl">
                  <h4 className="text-sm font-bold tracking-tight text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span> Rincian Item
                  </h4>
                  <div className="space-y-3">
                    {transaction.lineItems.map((item, index) => (
                      <div className="flex justify-between items-center text-sm" key={`${item.name}-${index}`}>
                        <div className="flex-1">
                          <p className="font-medium text-on-surface">{item.name}</p>
                          <p className="text-[11px] text-on-surface-variant/70 font-medium tracking-wider uppercase">{item.quantity}x</p>
                        </div>
                        <strong className="font-bold text-on-surface text-right">{formatRupiah(item.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {onDelete && (
                <div className="pt-2">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-error bg-error/10 hover:bg-error/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                      Hapus Transaksi
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-center text-on-surface-variant">Yakin hapus? Saldo akan dikembalikan otomatis.</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleting}
                          className="flex-1 py-3.5 rounded-xl text-sm font-bold text-on-surface-variant wa-field hover:bg-surface-bright transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setDeleting(true);
                            try {
                              await onDelete(transaction.id);
                              onClose();
                            } catch (err) {
                              console.error("Gagal hapus transaksi", err);
                              setDeleting(false);
                            }
                          }}
                          disabled={deleting}
                          className="flex-1 py-3.5 rounded-xl text-sm font-bold text-on-primary bg-error hover:bg-error/80 transition-colors"
                        >
                          {deleting ? "Menghapus..." : "Ya, Hapus"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}

export default TransactionDetailModal;
