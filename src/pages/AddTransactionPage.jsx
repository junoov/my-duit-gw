import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CategoryPicker from "../components/CategoryPicker";
import { useToast } from "../context/ToastContext";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useTransactionPreferences } from "../hooks/useTransactionPreferences";
import { defaultCategoryId } from "../data/categories";
import { enhanceReceiptWithAI, isAiReceiptEnabled } from "../services/aiReceiptService";
import { addTransaction } from "../services/transactionService";
import { formatRupiahInput, parseRupiahInput } from "../utils/currency";
import { toDateTimeInputValue } from "../utils/date";
import { parseReceiptText } from "../utils/ocrParser";
import { parseMultipleVoiceCommands } from "../utils/voiceCommandParser";

const defaultDateTime = toDateTimeInputValue(new Date());

function createLineItemId() {
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return `line-item-${Date.now()}-${Math.round(Math.random() * 1000000)}`;
}

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
        id: typeof item?.id === "string" && item.id.trim().length > 0 ? item.id.trim() : createLineItemId(),
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1,
        amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0
      };
    })
    .filter((item) => item.name.length > 0 && item.amount > 0);
}

function createEmptyLineItem() {
  return { id: createLineItemId(), name: "", quantity: 1, amount: 0 };
}

function resolveValidAccountId(accounts, candidateId, fallbackId = "") {
  if (candidateId && accounts.some((account) => account.id === candidateId)) {
    return candidateId;
  }

  if (fallbackId && accounts.some((account) => account.id === fallbackId)) {
    return fallbackId;
  }

  return accounts[0]?.id || "";
}

function resolveValidCategoryId(allCategories, candidateId, fallbackId = defaultCategoryId) {
  if (candidateId && allCategories.some((category) => category.id === candidateId)) {
    return candidateId;
  }

  if (fallbackId && allCategories.some((category) => category.id === fallbackId)) {
    return fallbackId;
  }

  return allCategories[0]?.id || defaultCategoryId;
}

function AddTransactionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const aiReceiptEnabled = isAiReceiptEnabled();
  const { accounts } = useAccounts();
  const { allCategories } = useCategories();
  const {
    templates,
    defaults,
    saveTemplate,
    deleteTemplate,
    markTemplateUsed,
    rememberTransactionDefaults
  } = useTransactionPreferences();
  const [activeTab, setActiveTab] = useState("manual");
  const [type, setType] = useState(defaults.lastType || "expense");
  const [manualCategory, setManualCategory] = useState(defaultCategoryId);
  const [scanCategory, setScanCategory] = useState(defaultCategoryId);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [manualAccountId, setManualAccountId] = useState("");
  const [date, setDate] = useState(defaultDateTime);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const [scanImagePreview, setScanImagePreview] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Belum ada gambar struk.");
  const [scanAmount, setScanAmount] = useState(0);
  const [scanDescription, setScanDescription] = useState("");
  const [scanAccountId, setScanAccountId] = useState("");
  const [scanLineItems, setScanLineItems] = useState([]);
  const [scanConfidence, setScanConfidence] = useState("");
  const [scanning, setScanning] = useState(false);
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [showTemplateComposer, setShowTemplateComposer] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const ocrModuleRef = useRef(null);
  const voiceRecognitionRef = useRef(null);
  const voiceTranscriptTimeoutRef = useRef(null);
  const latestVoiceTranscriptRef = useRef("");
  const appliedPrefillRef = useRef(false);

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Gunakan voice untuk isi form lebih cepat.");
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const formattedAmount = useMemo(() => formatRupiahInput(amount), [amount]);
  const formattedScanAmount = useMemo(() => formatRupiahInput(scanAmount), [scanAmount]);
  const visibleTemplates = useMemo(() => templates.slice(0, 8), [templates]);

  useEffect(() => {
    if (accounts.length === 0) {
      setManualAccountId("");
      setScanAccountId("");
      return;
    }

    setManualAccountId((currentAccountId) =>
      resolveValidAccountId(accounts, defaults.accountByType?.[type], currentAccountId)
    );
    setScanAccountId((currentAccountId) =>
      resolveValidAccountId(accounts, defaults.scanAccountId || defaults.accountByType?.expense, currentAccountId)
    );
    setDestinationAccountId((currentAccountId) => resolveValidAccountId(accounts, currentAccountId));
  }, [accounts, defaults.accountByType, defaults.scanAccountId, type]);

  useEffect(() => {
    if (allCategories.length === 0) {
      setManualCategory(defaultCategoryId);
      setScanCategory(defaultCategoryId);
      return;
    }

    setManualCategory((currentCategoryId) =>
      resolveValidCategoryId(allCategories, defaults.categoryByType?.[type], currentCategoryId)
    );
    setScanCategory((currentCategoryId) =>
      resolveValidCategoryId(allCategories, defaults.scanCategoryId || defaults.categoryByType?.expense, currentCategoryId)
    );
  }, [allCategories, defaults.categoryByType, defaults.scanCategoryId, type]);

  const manualAccountLabel = useMemo(() => {
    return accounts.find((account) => account.id === manualAccountId)?.name || "";
  }, [accounts, manualAccountId]);

  const scanAccountLabel = useMemo(() => {
    return accounts.find((account) => account.id === scanAccountId)?.name || "";
  }, [accounts, scanAccountId]);

  useEffect(() => {
    const prefill = location.state?.prefill;
    if (appliedPrefillRef.current || !prefill || typeof prefill !== "object") {
      return;
    }

    appliedPrefillRef.current = true;
    setActiveTab("manual");
    setType(prefill.type === "income" ? "income" : "expense");
    setAmount(Number.isFinite(Number(prefill.amount)) ? Math.max(0, Math.round(Number(prefill.amount))) : 0);
    setDescription(typeof prefill.description === "string" ? prefill.description : "");
    setManualCategory(resolveValidCategoryId(allCategories, prefill.category, defaultCategoryId));
    setManualAccountId(resolveValidAccountId(accounts, prefill.accountId));
    if (typeof prefill.name === "string" && prefill.name.trim().length > 0) {
      setTemplateName(prefill.name.trim());
    }
  }, [location.state, allCategories, accounts]);

  const applyTemplateToManualForm = (template) => {
    setActiveTab("manual");
    setType(template.type === "income" ? "income" : "expense");
    setAmount(template.amount || 0);
    setDescription(template.description || "");
    setManualCategory(resolveValidCategoryId(allCategories, template.category, defaultCategoryId));
    setManualAccountId(resolveValidAccountId(accounts, template.accountId));
    markTemplateUsed(template.id);
    showToast({ message: `Template ${template.name} diterapkan ke form manual.` });
  };

  const handleSaveTemplate = () => {
    if (type === "transfer") {
      showToast({ message: "Template hanya tersedia untuk pemasukan dan pengeluaran.", type: "error" });
      return;
    }

    if (!templateName.trim()) {
      showToast({ message: "Nama template wajib diisi.", type: "error" });
      return;
    }

    const savedTemplate = saveTemplate({
      name: templateName,
      type,
      amount,
      category: manualCategory,
      accountId: manualAccountId,
      description
    });

    if (!savedTemplate) {
      showToast({ message: "Template gagal disimpan.", type: "error" });
      return;
    }

    setTemplateName("");
    setShowTemplateComposer(false);
    showToast({ message: `Template ${savedTemplate.name} berhasil disimpan.` });
  };

  const handleDeleteTemplate = (templateId) => {
    deleteTemplate(templateId);
    showToast({ message: "Template berhasil dihapus." });
  };

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
      return undefined;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setVoiceSupported(false);
      setVoiceStatus("Voice belum didukung browser ini.");
      return undefined;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const clearTranscriptTimeout = () => {
      if (voiceTranscriptTimeoutRef.current) {
        window.clearTimeout(voiceTranscriptTimeoutRef.current);
        voiceTranscriptTimeoutRef.current = null;
      }
    };

    const applyVoiceToForm = async (transcript) => {
      const cleanTranscript = String(transcript || "").trim();
      if (!cleanTranscript) {
        return;
      }

      const commands = parseMultipleVoiceCommands(cleanTranscript);
      if (commands.length === 0) {
        setVoiceStatus("Perintah belum dikenali. Contoh: pengeluaran kopi 18 ribu.");
        return;
      }

      // If multiple commands, auto-save all except the last one
      let autoSavedCount = 0;
      if (commands.length > 1) {
        for (let i = 0; i < commands.length - 1; i++) {
          const cmd = commands[i];
          try {
            const currentAccountId = manualAccountId || (accounts.length > 0 ? accounts[0].id : "");
            const currentAccountLabel = accounts.find(a => a.id === currentAccountId)?.name || "";
            if (currentAccountId && cmd.amount > 0) {
              await addTransaction({
                type: cmd.type || "expense",
                amount: cmd.amount,
                category: cmd.categoryId || defaultCategoryId,
                description: cmd.description || "Voice input",
                date: new Date().toISOString(),
                accountId: currentAccountId,
                accountLabel: currentAccountLabel,
                inputMethod: "manual"
              });
              autoSavedCount++;
            }
          } catch (err) {
            console.warn("Gagal auto-save voice command", err);
          }
        }
      }

      // Apply the last (or only) command to the form
      const lastCmd = commands[commands.length - 1];
      setActiveTab("manual");
      if (lastCmd.type) {
        setType(lastCmd.type);
      }
      if (lastCmd.amount > 0) {
        setAmount(lastCmd.amount);
      }
      if (lastCmd.categoryId) {
        setManualCategory(lastCmd.categoryId);
      }
      if (lastCmd.description) {
        setDescription(lastCmd.description);
      }

      if (autoSavedCount > 0) {
        showToast({
          message: `${autoSavedCount} transaksi otomatis tersimpan! Yang terakhir diterapkan ke form, cek lalu simpan.`
        });
        setVoiceStatus(`${autoSavedCount + 1} transaksi terdeteksi dari voice.`);
      } else {
        showToast({
          message: "Draft voice sudah diterapkan (belum tersimpan). Cek lalu tekan Simpan Transaksi."
        });
        setVoiceStatus("Input voice berhasil diterapkan ke form manual.");
      }
    };

    const scheduleApplyFromInterim = () => {
      clearTranscriptTimeout();
      voiceTranscriptTimeoutRef.current = window.setTimeout(() => {
        applyVoiceToForm(latestVoiceTranscriptRef.current);
      }, 900);
    };

    recognition.onstart = () => {
      clearTranscriptTimeout();
      latestVoiceTranscriptRef.current = "";
      setVoiceListening(true);
      setVoiceStatus("Mendengarkan... silakan bicara.");
      setVoiceTranscript("");
    };

    recognition.onend = () => {
      clearTranscriptTimeout();
      setVoiceListening(false);
      setVoiceStatus((prev) =>
        prev === "Mendengarkan... silakan bicara." || prev === "Menyalakan mikrofon..."
          ? "Ketuk tombol mic untuk input voice."
          : prev
      );
    };

    recognition.onresult = (event) => {
      let latestFinalTranscript = "";
      let latestInterimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          latestFinalTranscript = transcript;
        } else {
          latestInterimTranscript = transcript;
        }
      }

      if (latestFinalTranscript) {
        latestVoiceTranscriptRef.current = latestFinalTranscript;
        setVoiceTranscript(latestFinalTranscript);
        applyVoiceToForm(latestFinalTranscript);
        recognition.stop();
        return;
      }

      if (latestInterimTranscript) {
        latestVoiceTranscriptRef.current = latestInterimTranscript;
        setVoiceTranscript(latestInterimTranscript);
        scheduleApplyFromInterim();
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceStatus("Izin mikrofon ditolak. Aktifkan akses mic di browser.");
        return;
      }

      if (event.error === "audio-capture") {
        setVoiceStatus("Mikrofon tidak terdeteksi.");
        return;
      }

      if (event.error === "no-speech") {
        setVoiceStatus("Tidak ada suara terdeteksi. Coba lebih dekat ke mikrofon.");
        return;
      }

      if (event.error === "network") {
        setVoiceStatus("Layanan voice browser bermasalah jaringan. Coba ulangi.");
        return;
      }

      setVoiceStatus("Voice input gagal. Coba lagi.");
    };

    voiceRecognitionRef.current = recognition;
    setVoiceSupported(true);

    return () => {
      clearTranscriptTimeout();
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.stop();
      } catch (cleanupError) {
        console.warn("Gagal cleanup voice recognition", cleanupError);
      }
      voiceRecognitionRef.current = null;
    };
  }, [accounts, manualAccountId, showToast]);

  const clearNotification = () => {};

  const ensureMicrophonePermission = async () => {
    if (typeof window === "undefined") {
      return { ok: false, message: "Mode voice hanya tersedia di browser." };
    }

    const isSecureHost =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isSecureHost) {
      return {
        ok: false,
        message: "Di HP, akses mikrofon butuh HTTPS. URL LAN HTTP diblok browser."
      };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        ok: false,
        message: "Browser tidak mendukung akses mikrofon (getUserMedia)."
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      return { ok: true, message: "" };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          return {
            ok: false,
            message: "Izin mikrofon ditolak. Aktifkan di setting situs Chrome lalu coba lagi."
          };
        }

        if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          return {
            ok: false,
            message: "Mikrofon tidak ditemukan di perangkat ini."
          };
        }
      }

      return {
        ok: false,
        message: "Gagal mengakses mikrofon. Coba refresh halaman lalu ulangi."
      };
    }
  };

  const handleToggleVoice = async () => {
    if (!voiceSupported || !voiceRecognitionRef.current) {
      setVoiceStatus("Voice input belum tersedia di browser ini.");
      return;
    }

    if (voiceListening) {
      try {
        voiceRecognitionRef.current.stop();
      } catch (error) {
        console.warn("Gagal stop voice recognition", error);
      }
      return;
    }

    const permission = await ensureMicrophonePermission();
    if (!permission.ok) {
      setVoiceStatus(permission.message);
      return;
    }

    setVoiceStatus("Menyalakan mikrofon...");
    try {
      voiceRecognitionRef.current.start();
    } catch (error) {
      if (error instanceof Error && error.name === "InvalidStateError") {
        setVoiceStatus("Mikrofon sedang inisialisasi. Tunggu sebentar lalu coba lagi.");
        return;
      }

      setVoiceStatus("Mikrofon gagal dinyalakan. Pastikan tidak dipakai aplikasi lain.");
      console.warn("Gagal start voice recognition", error);
    }
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

    if (amount <= 0) {
      showToast({ message: "Nominal transaksi tidak boleh nol.", type: "error" });
      return;
    }

    if (type === "transfer") {
      if (!destinationAccountId) {
        showToast({ message: "Silakan pilih rekening tujuan transfer.", type: "error" });
        return;
      }
      if (manualAccountId === destinationAccountId) {
        showToast({ message: "Rekening sumber dan tujuan tidak boleh sama.", type: "error" });
        return;
      }
    }

    setSaving(true);
    try {
      await addTransaction({
        type,
        amount,
        category: type === "transfer" ? "transfer" : manualCategory,
        description,
        date: new Date(date).toISOString(),
        accountId: manualAccountId,
        destinationAccountId: type === "transfer" ? destinationAccountId : undefined,
        accountLabel: manualAccountLabel,
        inputMethod: "manual"
      });
      rememberTransactionDefaults({
        type,
        category: type === "transfer" ? manualCategory : manualCategory,
        accountId: manualAccountId,
        inputMethod: "manual"
      });
      setAmount(0);
      setDescription("");
      setDate(toDateTimeInputValue(new Date()));
      showToast({
        message: type === "transfer" ? "Transfer berhasil dicatat." : type === "income" ? "Pemasukan berhasil disimpan." : "Pengeluaran berhasil disimpan."
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Gagal menyimpan transaksi manual.",
        type: "error"
      });
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
      showToast({
        message: error instanceof Error ? error.message : "Terjadi error saat OCR.",
        type: "error"
      });
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
      rememberTransactionDefaults({
        type: "expense",
        category: scanCategory,
        accountId: scanAccountId,
        inputMethod: "scan"
      });
      setScanAmount(0);
      setScanDescription("");
      setScanLineItems([]);
      setScanCategory(defaultCategoryId);
      setScanConfidence("");
      setScanImagePreview("");
      setDate(toDateTimeInputValue(new Date()));
      showToast({ message: "Pengeluaran dari scan berhasil disimpan ke buku rekening." });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Gagal menyimpan hasil scan.",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <section className="wa-card p-6 rounded-[1.5rem] space-y-4">
          <h3 className="text-lg font-bold text-on-surface">Belum Ada Rekening</h3>
          <p className="text-sm text-on-surface-variant">
            Tambahkan minimal satu rekening dulu di menu Buku agar pemasukan/pengeluaran bisa dipilih sumber dananya.
          </p>
          <button type="button" className="w-full wa-button-primary font-bold py-4 rounded-full mt-4" onClick={() => navigate("/buku")}>
            Buka Buku Rekening
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="wa-card rounded-3xl p-4 sm:p-6 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-on-surface">Voice Input</h3>
          <p className="text-sm text-on-surface-variant line-clamp-2 break-words max-w-[240px] sm:max-w-md">
            {voiceTranscript ? `"${voiceTranscript}"` : voiceStatus}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleVoice}
          disabled={!voiceSupported}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 select-none outline-none disabled:opacity-40 ${
            voiceListening
              ? "bg-error text-on-error shadow-[0_0_20px_rgba(255,180,171,0.3)] animate-pulse scale-90"
              : "wa-button-primary hover:scale-105 active:scale-95 cursor-pointer"
          }`}
        >
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            mic
          </span>
        </button>
      </section>

      <section className="bg-surface-container-highest rounded-full flex p-1.5 gap-1 mx-auto w-full max-w-sm">
        <button
          type="button"
          className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all ${activeTab === "manual" ? "wa-tab-active" : "text-on-surface-variant hover:text-on-surface"}`}
          onClick={() => setActiveTab("manual")}
        >
          Input Manual
        </button>
        <button
          type="button"
          className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all ${activeTab === "scan" ? "wa-tab-active" : "text-on-surface-variant hover:text-on-surface"}`}
          onClick={() => setActiveTab("scan")}
        >
          Scan Struk
        </button>
      </section>

      {activeTab === "manual" ? (
        <form className="wa-card p-4 sm:p-6 rounded-[1.5rem] space-y-6" onSubmit={saveManualTransaction}>
          <div className="bg-surface-container-highest rounded-full flex p-1.5 gap-1">
            <button
              type="button"
              className={`flex-1 py-3 px-2 sm:px-4 rounded-full text-xs sm:text-sm font-bold transition-all ${type === "expense" ? "bg-tertiary/20 text-tertiary" : "text-on-surface-variant hover:text-on-surface"}`}
              onClick={() => setType("expense")}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              className={`flex-1 py-3 px-2 sm:px-4 rounded-full text-xs sm:text-sm font-bold transition-all ${type === "income" ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              onClick={() => setType("income")}
            >
              Pemasukan
            </button>
            <button
              type="button"
              className={`flex-1 py-3 px-2 sm:px-4 rounded-full text-xs sm:text-sm font-bold transition-all ${type === "transfer" ? "bg-on-surface-variant/20 text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
              onClick={() => setType("transfer")}
            >
              Transfer
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">
                Template Cepat
              </span>
              <button
                type="button"
                onClick={() => setShowTemplateComposer((currentValue) => !currentValue)}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {showTemplateComposer ? "Tutup" : "Simpan form ini"}
              </button>
            </div>

            {visibleTemplates.length > 0 ? (
              <div className="space-y-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {visibleTemplates.map((template) => (
                    <article
                      key={template.id}
                      className="min-w-[180px] rounded-2xl wa-field p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface line-clamp-1">{template.name}</p>
                          <p className="text-[11px] text-on-surface-variant line-clamp-1">
                            {template.type === "income" ? "Pemasukan" : "Pengeluaran"}
                            {template.amount > 0 ? ` - ${formatRupiahInput(template.amount)}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="w-7 h-7 rounded-full bg-surface-container-low text-on-surface-variant hover:text-tertiary transition-colors shrink-0"
                          aria-label={`Hapus template ${template.name}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyTemplateToManualForm(template)}
                        className="w-full rounded-xl bg-primary/10 text-primary text-xs font-semibold py-2 hover:bg-primary/15 transition-colors"
                      >
                        Pakai Template
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant bg-surface-container-highest rounded-xl px-4 py-3">
                Belum ada template cepat. Simpan form yang sering dipakai agar input harian lebih singkat.
              </p>
            )}

            {showTemplateComposer ? (
              <div className="wa-field rounded-2xl p-4 space-y-3">
                <label className="block space-y-2">
                  <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">
                    Nama Template
                  </span>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/15 rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder="Contoh: Makan siang kantor"
                  />
                </label>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateComposer(false);
                      setTemplateName("");
                    }}
                    className="flex-1 py-3 rounded-xl bg-surface-container-low text-on-surface text-sm font-semibold hover:bg-surface-bright transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:brightness-110 transition-all"
                  >
                    Simpan Template
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Nominal Transaksi</span>
            <div className={`flex items-center wa-field rounded-xl px-4 overflow-hidden transition-colors ${type === 'expense' ? 'focus-within:border-tertiary/70' : type === 'transfer' ? 'focus-within:border-on-surface-variant/70' : 'focus-within:border-primary/70'}`}>
              <strong className={`text-xl font-bold ${type === 'expense' ? 'text-tertiary' : type === 'transfer' ? 'text-on-surface-variant' : 'text-primary'} focus-within:text-surface-container-low`}>Rp</strong>
              <input
                type="text"
                inputMode="numeric"
                value={formattedAmount}
                onChange={(event) => handleAmountInput(event.target.value)}
                placeholder="0"
                className="w-full bg-transparent border-none py-4 px-3 text-3xl font-bold font-headline text-on-surface outline-none"
                required
              />
            </div>
          </label>

          {type !== "transfer" && (
            <div className="space-y-2">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Pilih Kategori</span>
              <div className="wa-field rounded-xl p-2">
                <CategoryPicker value={manualCategory} onChange={setManualCategory} />
              </div>
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">
              {type === "transfer" ? "Sumber Rekening" : "Bayar / Masuk ke Rekening"}
            </span>
            <select
              value={manualAccountId}
              onChange={(event) => {
                setManualAccountId(event.target.value);
                clearNotification();
              }}
              className="w-full wa-field rounded-xl px-4 py-4 text-on-surface outline-none transition-all appearance-none font-bold"
              required
            >
              <option value="" disabled>Pilih rekening</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>

          {type === "transfer" && (
            <label className="block space-y-2">
              <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Rekening Tujuan</span>
              <select
                value={destinationAccountId}
                onChange={(event) => {
                  setDestinationAccountId(event.target.value);
                  clearNotification();
                }}
                className="w-full wa-field rounded-xl px-4 py-4 text-on-surface outline-none transition-all appearance-none font-bold"
                required
              >
                <option value="" disabled>Pilih rekening tujuan</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Catatan</span>
            <input
              type="text"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                clearNotification();
              }}
              className="w-full wa-field rounded-xl px-4 py-4 text-on-surface outline-none transition-all font-medium placeholder:text-on-surface-variant/40"
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
              className="w-full wa-field rounded-xl px-4 py-4 text-on-surface outline-none transition-all font-medium placeholder:text-on-surface-variant/40 [color-scheme:dark]"
              style={{ colorScheme: 'dark' }}
              required
            />
          </label>

          <button type="submit" className={`w-full font-bold py-4 rounded-full mt-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${type === 'expense' ? 'bg-tertiary text-white shadow-lg shadow-tertiary/20' : 'wa-button-primary'}`} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Transaksi"}
          </button>
        </form>
      ) : (
        <form className="wa-card p-4 sm:p-6 rounded-[1.5rem] space-y-6" onSubmit={saveScannedTransaction}>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" className="wa-field text-on-surface font-bold py-3 rounded-xl hover:bg-surface-bright transition-colors text-sm" onClick={() => cameraInputRef.current?.click()}>
              <span className="material-symbols-outlined align-middle mr-2">photo_camera</span>Kamera
            </button>
            <button type="button" className="wa-field text-on-surface font-bold py-3 rounded-xl hover:bg-surface-bright transition-colors text-sm" onClick={() => galleryInputRef.current?.click()}>
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

          <div className="wa-field rounded-xl p-4 text-center">
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
            <div className="flex items-center wa-field rounded-xl px-4 overflow-hidden transition-colors focus-within:border-tertiary/70">
              <strong className="text-xl font-bold text-tertiary focus-within:text-surface-container-low">Rp</strong>
              <input
                type="text"
                inputMode="numeric"
                value={formattedScanAmount}
                onChange={(event) => handleScanAmountInput(event.target.value)}
                placeholder="0"
                className="w-full bg-transparent border-none py-4 px-3 text-3xl font-bold font-headline text-on-surface outline-none"
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
              className="w-full wa-field rounded-xl px-4 py-4 text-on-surface outline-none transition-all font-medium placeholder:text-on-surface-variant/40"
              placeholder="Contoh: Indomaret Point"
              required
            />
          </label>

          <div className="space-y-2">
            <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant ml-1">Kategori</span>
            <div className="wa-field rounded-xl p-2">
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
              className="w-full wa-field rounded-xl px-4 py-4 text-on-surface outline-none transition-all appearance-none font-bold"
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
            <div className="wa-field rounded-xl p-4 space-y-4">
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
              className="w-full wa-field rounded-xl px-4 py-4 text-on-surface outline-none transition-all font-medium placeholder:text-on-surface-variant/40 [color-scheme:dark]"
              style={{ colorScheme: 'dark' }}
              required
            />
          </label>

          <button type="submit" className="w-full wa-button-primary font-bold py-4 rounded-full mt-4 transition-all active:scale-[0.98] disabled:opacity-50" disabled={saving || scanning}>
            {saving ? "Menyimpan..." : "Konfirmasi & Simpan"}
          </button>
        </form>
      )}
    </div>
  );
}

export default AddTransactionPage;
