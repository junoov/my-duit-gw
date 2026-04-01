import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CategoryPicker from "../components/CategoryPicker";
import { useAccounts } from "../hooks/useAccounts";
import { defaultCategoryId } from "../data/categories";
import { enhanceReceiptWithAI, isAiReceiptEnabled } from "../services/aiReceiptService";
import { addTransaction } from "../services/transactionService";
import { formatRupiahInput, parseRupiahInput } from "../utils/currency";
import { toDateTimeInputValue } from "../utils/date";
import { parseReceiptText } from "../utils/ocrParser";

const defaultDateTime = toDateTimeInputValue(new Date());
const voiceDraftStorageKey = "warta_artha_voice_draft";

function normalizeEditableLineItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const quantity = Number(item?.quantity);
      const amount = Number(item?.amount);

      return {
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
        amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0
      };
    })
    .filter((item) => item.name.length > 0 && item.amount > 0);
}

function createEmptyLineItem() {
  return { name: "", quantity: 1, amount: 0 };
}

function AddTransactionPage() {
  const navigate = useNavigate();
  const aiReceiptEnabled = isAiReceiptEnabled();
  const { accounts } = useAccounts();
  const [activeTab, setActiveTab] = useState("manual");
  const [type, setType] = useState("expense");
  const [manualCategory, setManualCategory] = useState(defaultCategoryId);
  const [scanCategory, setScanCategory] = useState(defaultCategoryId);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [manualAccountId, setManualAccountId] = useState("");
  const [date, setDate] = useState(defaultDateTime);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [scanImagePreview, setScanImagePreview] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Belum ada gambar struk.");
  const [scanAmount, setScanAmount] = useState(0);
  const [scanDescription, setScanDescription] = useState("");
  const [scanAccountId, setScanAccountId] = useState("");
  const [scanLineItems, setScanLineItems] = useState([]);
  const [scanConfidence, setScanConfidence] = useState("");
  const [scanning, setScanning] = useState(false);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const ocrModuleRef = useRef(null);

  const formattedAmount = useMemo(() => formatRupiahInput(amount), [amount]);
  const formattedScanAmount = useMemo(() => formatRupiahInput(scanAmount), [scanAmount]);

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }

    setManualAccountId((currentAccountId) =>
      currentAccountId && accounts.some((account) => account.id === currentAccountId)
        ? currentAccountId
        : accounts[0].id
    );

    setScanAccountId((currentAccountId) =>
      currentAccountId && accounts.some((account) => account.id === currentAccountId)
        ? currentAccountId
        : accounts[0].id
    );
  }, [accounts]);

  const manualAccountLabel = useMemo(() => {
    return accounts.find((account) => account.id === manualAccountId)?.name || "";
  }, [accounts, manualAccountId]);

  const scanAccountLabel = useMemo(() => {
    return accounts.find((account) => account.id === scanAccountId)?.name || "";
  }, [accounts, scanAccountId]);

  useEffect(
    () => () => {
      if (scanImagePreview) {
        URL.revokeObjectURL(scanImagePreview);
      }
    },
    [scanImagePreview]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawDraft = window.sessionStorage.getItem(voiceDraftStorageKey);
    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft);
      if (draft && typeof draft === "object") {
        if (draft.type === "expense" || draft.type === "income") {
          setType(draft.type);
        }
        if (Number.isFinite(Number(draft.amount)) && Number(draft.amount) > 0) {
          setAmount(Math.round(Number(draft.amount)));
        }
        if (typeof draft.categoryId === "string" && draft.categoryId.trim().length > 0) {
          setManualCategory(draft.categoryId.trim());
        }
        if (typeof draft.description === "string" && draft.description.trim().length > 0) {
          setDescription(draft.description.trim());
        }
        setActiveTab("manual");
        setMessage("Draft voice sudah diterapkan (belum tersimpan). Cek lalu tekan Simpan Transaksi.");
      }
    } catch (error) {
      console.warn("Gagal memuat draft voice", error);
    } finally {
      window.sessionStorage.removeItem(voiceDraftStorageKey);
    }
  }, []);

  const clearNotification = () => {
    setMessage("");
  };

  const handleAmountInput = (value) => {
    setAmount(parseRupiahInput(value));
    clearNotification();
  };

  const handleScanAmountInput = (value) => {
    setScanAmount(parseRupiahInput(value));
    clearNotification();
  };

  const saveManualTransaction = async (event) => {
    event.preventDefault();
    clearNotification();
    setSaving(true);
    try {
      await addTransaction({
        type,
        amount,
        category: manualCategory,
        description,
        date,
        accountId: manualAccountId,
        accountLabel: manualAccountLabel,
        inputMethod: "manual"
      });
      setAmount(0);
      setDescription("");
      setDate(toDateTimeInputValue(new Date()));
      setMessage(type === "income" ? "Pemasukan berhasil disimpan." : "Pengeluaran berhasil disimpan.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan transaksi manual.");
    } finally {
      setSaving(false);
    }
  };

  const handleScanFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    clearNotification();
    const preview = URL.createObjectURL(file);
    setScanImagePreview(preview);
    setScanning(true);
    setScanStatus("Memproses OCR struk...");
    setScanProgress(0);

    try {
      if (!ocrModuleRef.current) {
        const module = await import("tesseract.js");
        ocrModuleRef.current = module.default;
      }

      const result = await ocrModuleRef.current.recognize(file, "ind+eng", {
        logger: (loggerState) => {
          if (loggerState.status) {
            setScanStatus(loggerState.status);
          }
          if (typeof loggerState.progress === "number") {
            setScanProgress(Math.round(loggerState.progress * 100));
          }
        }
      });

      const parsed = parseReceiptText(result.data.text);
      setScanAmount(parsed.amount);
      setScanDescription(parsed.merchant);
      setScanLineItems(normalizeEditableLineItems(parsed.lineItems));
      setScanCategory(parsed.suggestedCategoryId || defaultCategoryId);
      setScanConfidence(parsed.confidenceHint);
      setScanProgress(100);

      if (aiReceiptEnabled) {
        setScanStatus("OCR selesai. Menyempurnakan hasil dengan AI...");
        try {
          const aiResult = await enhanceReceiptWithAI({
            ocrText: result.data.text,
            fallback: parsed
          });

          setScanAmount(aiResult.amount || parsed.amount);
          setScanDescription(aiResult.merchant || parsed.merchant);
          setScanLineItems(normalizeEditableLineItems(aiResult.lineItems));
          setScanCategory(aiResult.suggestedCategoryId || parsed.suggestedCategoryId || defaultCategoryId);
          setScanConfidence(aiResult.confidenceHint || "Hasil diperkaya AI OpenRouter");
          setScanStatus("Scan + AI selesai. Verifikasi lalu simpan.");
        } catch (aiError) {
          const aiMessage = aiError instanceof Error ? aiError.message : "AI parser tidak tersedia.";
          setScanStatus("Scan selesai dengan parser lokal. AI tidak aktif.");
          setScanConfidence(`${parsed.confidenceHint} | ${aiMessage}`);
        }
      } else {
        setScanStatus("Scan selesai. Verifikasi lalu simpan.");
      }
    } catch (error) {
      setScanStatus("Scan gagal. Coba foto yang lebih tajam.");
      setScanConfidence("");
      setMessage(error instanceof Error ? error.message : "Terjadi error saat OCR.");
    } finally {
      setScanning(false);
      event.target.value = "";
    }
  };

  const handleScanLineItemChange = (index, field, value) => {
    setScanLineItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === "name") {
          return { ...item, name: value };
        }

        if (field === "amount") {
          return { ...item, amount: parseRupiahInput(value) };
        }

        if (field === "quantity") {
          const parsedQuantity = Number(value);
          return {
            ...item,
            quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.round(parsedQuantity) : 1
          };
        }

        return item;
      })
    );
    clearNotification();
  };

  const addScanLineItem = () => {
    setScanLineItems((currentItems) => [...currentItems, createEmptyLineItem()]);
    clearNotification();
  };

  const removeScanLineItem = (index) => {
    setScanLineItems((currentItems) => currentItems.filter((_, itemIndex) => itemIndex !== index));
    clearNotification();
  };

  const saveScannedTransaction = async (event) => {
    event.preventDefault();
    clearNotification();
    setSaving(true);

    const normalizedLineItems = normalizeEditableLineItems(scanLineItems);

    try {
      await addTransaction({
        type: "expense",
        amount: scanAmount,
        category: scanCategory,
        description: scanDescription,
        date,
        accountId: scanAccountId,
        accountLabel: scanAccountLabel,
        inputMethod: "scan",
        receiptImageRef: null,
        lineItems: normalizedLineItems
      });
      setScanAmount(0);
      setScanDescription("");
      setScanLineItems([]);
      setScanCategory(defaultCategoryId);
      setScanConfidence("");
      setScanImagePreview("");
      setDate(toDateTimeInputValue(new Date()));
      setMessage("Pengeluaran dari scan berhasil disimpan ke buku rekening.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan hasil scan.");
    } finally {
      setSaving(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <section className="bg-surface-container-low p-6 rounded-[1.5rem] space-y-4">
          <h3 className="text-lg font-bold text-on-surface">Belum Ada Rekening</h3>
          <p className="text-sm text-on-surface-variant">
            Tambahkan minimal satu rekening dulu di menu Buku agar pemasukan/pengeluaran bisa dipilih sumber dananya.
          </p>
          <button type="button" className="w-full bg-primary text-on-primary font-bold py-4 rounded-full mt-4" onClick={() => navigate("/buku")}>
            Buka Buku Rekening
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface-container-highest rounded-full flex p-1.5 gap-1 mx-auto max-w-sm">
        <button
          type="button"
          className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all ${activeTab === "manual" ? "bg-white text-surface-container-low shadow-md" : "text-on-surface-variant hover:text-on-surface"}`}
          onClick={() => setActiveTab("manual")}
        >
          Input Manual
        </button>
        <button
          type="button"
          className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all ${activeTab === "scan" ? "bg-white text-surface-container-low shadow-md" : "text-on-surface-variant hover:text-on-surface"}`}
          onClick={() => setActiveTab("scan")}
        >
          Scan Struk
        </button>
      </section>

      {activeTab === "manual" ? (
        <form className="bg-surface-container-low p-6 rounded-[1.5rem] space-y-6" onSubmit={saveManualTransaction}>
          <div className="bg-surface-container-highest rounded-full flex p-1.5 gap-1">
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all ${type === "expense" ? "bg-tertiary/20 text-tertiary" : "text-on-surface-variant hover:text-on-surface"}`}
              onClick={() => setType("expense")}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all ${type === "income" ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              onClick={() => setType("income")}
            >
              Pemasukan
            </button>
          </div>

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Nominal Transaksi</span>
            <div className={`flex items-center bg-surface-container-highest rounded-xl px-4 overflow-hidden border-2 transition-colors focus-within:bg-white focus-within:border-primary ${type === 'expense' ? 'focus-within:border-tertiary' : 'focus-within:border-primary'} border-transparent`}>
              <strong className={`text-xl font-bold ${type === 'expense' ? 'text-tertiary' : 'text-primary'} focus-within:text-surface-container-low`}>Rp</strong>
              <input
                type="text"
                inputMode="numeric"
                value={formattedAmount}
                onChange={(event) => handleAmountInput(event.target.value)}
                placeholder="0"
                className="w-full bg-transparent border-none py-4 px-3 text-3xl font-bold font-headline text-on-surface outline-none focus:text-surface-container-low"
                required
              />
            </div>
          </label>

          <div className="space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Pilih Kategori</span>
            <div className="bg-surface-container-highest rounded-xl p-2">
              <CategoryPicker value={manualCategory} onChange={setManualCategory} />
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Bayar / Masuk ke Rekening</span>
            <select
              value={manualAccountId}
              onChange={(event) => {
                setManualAccountId(event.target.value);
                clearNotification();
              }}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all appearance-none font-bold"
              required
            >
              <option value="" disabled>Pilih rekening</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Catatan</span>
            <input
              type="text"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                clearNotification();
              }}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all font-medium placeholder:text-on-surface-variant/40"
              placeholder="Contoh: Bakmi GM Grand Indonesia"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Tanggal & Waktu</span>
            <input
              type="datetime-local"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                clearNotification();
              }}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all font-medium placeholder:text-on-surface-variant/40 [color-scheme:dark]"
              style={{ colorScheme: 'dark' }}
              required
            />
          </label>

          <button type="submit" className={`w-full text-white font-bold py-4 rounded-full mt-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${type === 'expense' ? 'bg-tertiary shadow-lg shadow-tertiary/20' : 'bg-primary text-on-primary shadow-lg shadow-primary/20'}`} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Transaksi"}
          </button>
        </form>
      ) : (
        <form className="bg-surface-container-low p-6 rounded-[1.5rem] space-y-6" onSubmit={saveScannedTransaction}>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" className="bg-surface-container-highest text-on-surface font-bold py-3 rounded-xl hover:bg-surface-bright transition-colors text-sm" onClick={() => cameraInputRef.current?.click()}>
              <span className="material-symbols-outlined align-middle mr-2">photo_camera</span>Kamera
            </button>
            <button type="button" className="bg-surface-container-highest text-on-surface font-bold py-3 rounded-xl hover:bg-surface-bright transition-colors text-sm" onClick={() => galleryInputRef.current?.click()}>
              <span className="material-symbols-outlined align-middle mr-2">image</span>Galeri
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleScanFile}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScanFile}
            />
          </div>

          <div className="bg-surface-container-highest rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-on-surface-variant mb-2">{scanStatus}</p>
            <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
            </div>
            {scanConfidence && <p className="text-[10px] mt-2 opacity-50">{scanConfidence}</p>}
          </div>

          {scanImagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-outline-variant/30">
              <img src={scanImagePreview} alt="Pratinjau struk" className="w-full max-h-48 object-cover" />
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Nominal Terdeteksi</span>
            <div className="flex items-center bg-surface-container-highest rounded-xl px-4 overflow-hidden border-2 transition-colors focus-within:bg-white focus-within:border-tertiary border-transparent">
              <strong className="text-xl font-bold text-tertiary focus-within:text-surface-container-low">Rp</strong>
              <input
                type="text"
                inputMode="numeric"
                value={formattedScanAmount}
                onChange={(event) => handleScanAmountInput(event.target.value)}
                placeholder="0"
                className="w-full bg-transparent border-none py-4 px-3 text-3xl font-bold font-headline text-on-surface outline-none focus:text-surface-container-low"
                required
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Merchant / Deskripsi</span>
            <input
              type="text"
              value={scanDescription}
              onChange={(event) => {
                setScanDescription(event.target.value);
                clearNotification();
              }}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all font-medium placeholder:text-on-surface-variant/40"
              placeholder="Contoh: Indomaret Point"
              required
            />
          </label>

          <div className="space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Kategori</span>
            <div className="bg-surface-container-highest rounded-xl p-2">
              <CategoryPicker value={scanCategory} onChange={setScanCategory} />
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Bayar dari</span>
            <select
              value={scanAccountId}
              onChange={(event) => {
                setScanAccountId(event.target.value);
                clearNotification();
              }}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all appearance-none font-bold"
              required
            >
              <option value="" disabled>Pilih rekening</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Rincian Belanja</span>
            <div className="bg-surface-container-highest rounded-xl p-4 space-y-4">
              {scanLineItems.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center my-2">Belum ada rincian item terdeteksi.</p>
              ) : (
                <div className="space-y-3">
                  {scanLineItems.map((item, index) => (
                    <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-lg" key={`${item.name}-${index}`}>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(event) => handleScanLineItemChange(index, "name", event.target.value)}
                          placeholder="Nama item"
                          className="w-full bg-transparent border-b border-outline-variant/30 focus:border-primary text-sm p-1 outline-none text-on-surface"
                        />
                         <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) => handleScanLineItemChange(index, "quantity", event.target.value)}
                            className="w-16 bg-transparent border-b border-outline-variant/30 focus:border-primary text-sm p-1 outline-none text-on-surface"
                            aria-label={`Jumlah item ${index + 1}`}
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatRupiahInput(item.amount)}
                            onChange={(event) => handleScanLineItemChange(index, "amount", event.target.value)}
                            placeholder="Nominal"
                            className="flex-1 bg-transparent border-b border-outline-variant/30 focus:border-primary text-sm p-1 outline-none text-on-surface text-right"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0"
                        onClick={() => removeScanLineItem(index)}
                        aria-label={`Hapus item ${index + 1}`}
                      >
                         <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="w-full py-2 text-sm font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20 border-dashed" onClick={addScanLineItem}>
                + Tambah Item
              </button>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Tanggal & Waktu</span>
            <input
              type="datetime-local"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                clearNotification();
              }}
              className="w-full bg-surface-container-highest border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all font-medium placeholder:text-on-surface-variant/40 [color-scheme:dark]"
              style={{ colorScheme: 'dark' }}
              required
            />
          </label>

          <button type="submit" className="w-full bg-primary text-on-primary font-bold py-4 rounded-full mt-4 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20" disabled={saving || scanning}>
            {saving ? "Menyimpan..." : "Konfirmasi & Simpan"}
          </button>
        </form>
      )}

      {message && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-surface-container-high border border-outline-variant/30 rounded-2xl p-4 shadow-xl flex items-start gap-3 z-[100] animate-bounce">
          <span className="material-symbols-outlined text-primary mt-0.5">check_circle</span>
          <p className="text-sm font-medium text-on-surface flex-1">{message}</p>
        </div>
      )}
    </div>
  );
}

export default AddTransactionPage;
