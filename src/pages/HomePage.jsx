import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TransactionDetailModal from "../components/TransactionDetailModal";
import TransactionList from "../components/TransactionList";
import { useAccounts } from "../hooks/useAccounts";
import { useTransactions } from "../hooks/useTransactions";
import { deleteTransaction } from "../services/transactionService";
import { resolveTransactionAccountLabel } from "../services/accountService";
import { formatRupiah } from "../utils/currency";
import { parseVoiceTransactionCommand } from "../utils/voiceCommandParser";

const voiceDraftStorageKey = "warta_artha_voice_draft";

function HomePage() {
  const navigate = useNavigate();
  const { transactions, summary } = useTransactions();
  const { accounts } = useAccounts();
  const recognitionRef = useRef(null);
  const transcriptApplyTimeoutRef = useRef(null);
  const latestTranscriptRef = useRef("");

  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Ketuk ikon 🎤 untuk bicara.");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const accountMap = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const selectedAccountLabel = selectedTransaction
    ? resolveTransactionAccountLabel(selectedTransaction, accountMap)
    : "";

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setVoiceSupported(false);
      setVoiceStatus("Browser belum mendukung voice input. Gunakan input manual.");
      return undefined;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const clearTranscriptApplyTimeout = () => {
      if (transcriptApplyTimeoutRef.current) {
        window.clearTimeout(transcriptApplyTimeoutRef.current);
        transcriptApplyTimeoutRef.current = null;
      }
    };

    const applyVoiceTranscript = (transcript) => {
      const cleanTranscript = String(transcript || "").trim();
      if (!cleanTranscript) {
        return;
      }

      setVoiceTranscript(cleanTranscript);

      const parsed = parseVoiceTransactionCommand(cleanTranscript);
      if (!parsed.type && !parsed.amount && !parsed.categoryId && !parsed.description) {
        setVoiceStatus("Perintah belum dikenali. Coba: pengeluaran makan 25 ribu.");
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          voiceDraftStorageKey,
          JSON.stringify({
            type: parsed.type,
            amount: parsed.amount,
            categoryId: parsed.categoryId,
            description: parsed.description
          })
        );
      }

      clearTranscriptApplyTimeout();
      recognition.stop();
      setVoiceStatus("Perintah diterima. Mengarahkan ke Tambah Transaksi...");
      navigate("/tambah");
    };

    const scheduleTranscriptApply = () => {
      clearTranscriptApplyTimeout();
      transcriptApplyTimeoutRef.current = window.setTimeout(() => {
        applyVoiceTranscript(latestTranscriptRef.current);
      }, 900);
    };

    recognition.onstart = () => {
      clearTranscriptApplyTimeout();
      latestTranscriptRef.current = "";
      setVoiceListening(true);
      setVoiceStatus("Mendengarkan... Silakan bicara.");
    };

    recognition.onend = () => {
      clearTranscriptApplyTimeout();
      setVoiceListening(false);
      setVoiceStatus((prev) => 
        (prev === "Mendengarkan... Silakan bicara." || prev === "Menyalakan mikrofon...")
          ? "Ketuk ikon 🎤 untuk bicara." 
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
        latestTranscriptRef.current = latestFinalTranscript;
        applyVoiceTranscript(latestFinalTranscript);
        return;
      }

      if (latestInterimTranscript) {
        latestTranscriptRef.current = latestInterimTranscript;
        setVoiceTranscript(latestInterimTranscript);
        setVoiceStatus("Mendengar suara... lanjutkan bicara.");
        scheduleTranscriptApply();
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceListening(false);
        setVoiceStatus("Izin mikrofon ditolak. Aktifkan akses mic di browser.");
        return;
      }

      if (event.error === "audio-capture") {
        setVoiceListening(false);
        setVoiceStatus("Mikrofon tidak terdeteksi.");
        return;
      }

      if (event.error === "no-speech") {
        setVoiceStatus("Tidak ada suara terdeteksi. Coba bicara lebih dekat ke mikrofon.");
        return;
      }

      if (event.error === "network") {
        setVoiceStatus("Layanan voice browser bermasalah jaringan. Coba ulangi.");
        return;
      }

      setVoiceStatus("Voice input gagal. Coba lagi.");
    };

    recognitionRef.current = recognition;
    setVoiceSupported(true);

    return () => {
      clearTranscriptApplyTimeout();
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.stop();
      } catch (cleanupError) {
        console.warn("Gagal cleanup voice recognition", cleanupError);
      }
      recognitionRef.current = null;
    };
  }, [navigate]);

  const ensureMicrophonePermission = async () => {
    if (typeof window === "undefined") {
      return { ok: false, message: "Mode voice hanya tersedia di browser." };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        ok: false,
        message: "Browser tidak mendukung akses mikrofon (getUserMedia)."
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return { ok: true, message: "" };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          return {
            ok: false,
            message: "Izin mikrofon ditolak. Aktifkan di setting situs Chrome (icon gembok) lalu coba lagi."
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

  const handleToggleVoice = async (e) => {
    if (e && e.cancelable) e.preventDefault();
    
    if (!voiceSupported || !recognitionRef.current) {
      setVoiceStatus("Voice input belum tersedia di browser ini.");
      return;
    }

    if (voiceListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Gagal stop voice recognition", err);
      }
      return;
    }

    setVoiceTranscript("");
    setVoiceStatus("Menyalakan mikrofon...");

    const permission = await ensureMicrophonePermission();
    if (!permission.ok) {
      setVoiceStatus(permission.message);
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (startError) {
      if (startError instanceof Error && startError.name === "InvalidStateError") {
        setVoiceStatus("Mikrofon sedang inisialisasi. Tunggu sebentar lalu coba lagi.");
        return;
      }
      setVoiceStatus("Mikrofon gagal dinyalakan. Pastikan tidak dipakai aplikasi lain.");
      console.warn("Gagal start voice recognition", startError);
    }
  };

  return (
    <>
      <section className="space-y-2">
        <span className="text-[10px] font-medium tracking-widest uppercase text-on-surface-variant">TOTAL BALANCE</span>
        <div className="glass-card p-8 rounded-3xl relative overflow-hidden border border-primary/10 transition-transform active:scale-[0.98]">
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-on-surface-variant font-medium text-2xl">Rp</span>
              <span className="text-5xl md:text-6xl font-bold tracking-tight text-on-surface">
                {formatRupiah(summary.balance).replace('Rp', '').trim()}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span className="text-xs font-medium">+{formatRupiah(summary.income)} this month</span>
            </div>
          </div>
          {/* Decorative abstract background for hero */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Voice Input Section */}
      <section 
        className={`bg-surface-container-low rounded-3xl p-6 flex items-center justify-between transition-colors ${!voiceSupported ? 'opacity-50 grayscale' : ''}`}
      >
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-on-surface">Voice Input</h3>
          <p className="text-sm text-on-surface-variant line-clamp-1 break-words max-w-[200px] sm:max-w-xs">{voiceTranscript ? `"${voiceTranscript}"` : voiceStatus}</p>
        </div>
        <button 
          onClick={handleToggleVoice}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 select-none outline-none ${voiceListening ? 'bg-error text-on-error shadow-[0_0_20px_rgba(255,180,171,0.3)] animate-pulse scale-90' : 'bg-primary text-on-primary shadow-[0_0_20px_rgba(78,222,163,0.3)] hover:scale-105 active:scale-95 cursor-pointer'}`}
        >
          <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>mic</span>
        </button>
      </section>

      {/* Side-by-Side Income & Expenses */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-high p-5 rounded-3xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">south_west</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Income</span>
            <p className="text-xl font-bold text-on-surface">{formatRupiah(summary.income)}</p>
          </div>
        </div>
        <div className="bg-surface-container-high p-5 rounded-3xl space-y-4">
          <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined">north_east</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">Expenses</span>
            <p className="text-xl font-bold text-on-surface">{formatRupiah(summary.expense)}</p>
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-on-surface tracking-tight">Transaksi Hari Ini</h2>
        </div>
        
        <TransactionList
          transactions={transactions.filter(t => new Date(t.date).toDateString() === new Date().toDateString())}
          accountMap={accountMap}
          onSelectTransaction={setSelectedTransaction}
        />
      </section>

      <TransactionDetailModal
        transaction={selectedTransaction}
        accountMap={accountMap}
        onClose={() => setSelectedTransaction(null)}
        onDelete={deleteTransaction}
      />
    </>
  );
}

export default HomePage;
