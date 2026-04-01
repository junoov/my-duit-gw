# 📋 Product Requirements Document (PRD)

## **Warta Artha — Aplikasi Pencatat Pengeluaran Harian**

| Field              | Detail                                      |
|--------------------|---------------------------------------------|
| **Nama Produk**    | Warta Artha                                 |
| **Versi Dokumen**  | 1.1 (Revisi: Penambahan Fitur Scan Struk)   |
| **Tanggal Dibuat** | 24 Maret 2026                               |
| **Status**         | Draft                                       |
| **Platform**       | Web App (PWA — Progressive Web App)         |
| **Target Device**  | Mobile-first, Responsive (Desktop & Tablet) |

---

## 1. Ringkasan Produk

**Warta Artha** adalah aplikasi web pencatat pengeluaran uang harian yang dirancang untuk membantu pengguna melacak, mengelola, dan menganalisis keuangan pribadi mereka secara real-time. Aplikasi ini dibangun dengan prinsip **offline-first**, sehingga pengguna dapat terus mencatat transaksi kapan saja dan di mana saja, bahkan tanpa koneksi internet. 

Aplikasi ini mendukung dua mode pencatatan: **Manual** dan **Scan Struk Otomatis (OCR)**, membuatnya sangat praktis bagi pengguna yang memiliki mobilitas tinggi. Aplikasi ini dapat di-install langsung ke layar utama perangkat (Home Screen) layaknya aplikasi native, memberikan pengalaman yang cepat, ringan, dan tanpa perlu mengunduh dari App Store/Play Store.

---

## 2. Latar Belakang & Masalah

### Masalah yang Diselesaikan
1. **Lupa mencatat pengeluaran & Malas mengetik:** Banyak orang kesulitan melacak uang yang keluar dan malas mengetik rincian belanja satu per satu.
2. **Aplikasi keuangan terlalu berat:** Banyak aplikasi pencatat keuangan yang memiliki fitur berlebihan, lambat dimuat, dan memakan banyak ruang penyimpanan di HP.
3. **Ketergantungan pada internet:** Sebagian besar aplikasi membutuhkan koneksi internet untuk berfungsi, padahal pengguna sering berada di area tanpa sinyal.
4. **Tidak ada gambaran visual pengeluaran:** Pengguna kesulitan memahami pola pengeluaran mereka tanpa representasi visual yang jelas.

### Solusi
Membangun web app **ultra-ringan** yang bisa:
- **Membaca struk otomatis via kamera (Fitur Scan Struk OCR)**, meminimalisir input manual.
- Dibuka secara **instan** (< 1 detik) karena menggunakan PWA.
- Bekerja secara **offline penuh** dengan sinkronisasi otomatis saat online.
- Memberikan **ringkasan visual** pengeluaran harian yang mudah dipahami.
- Di-install di Home Screen tanpa perlu App Store.

---

## 3. Tujuan & Metrik Keberhasilan

### Tujuan Utama
| # | Tujuan                                                              |
|---|---------------------------------------------------------------------|
| 1 | Pengguna dapat mencatat transaksi (manual/scan) dalam **< 5-10 detik**|
| 2 | Aplikasi dapat memindai dan mengekstrak nominal struk dengan akurasi **> 85%** |
| 3 | Aplikasi dapat digunakan **100% offline** (termasuk input manual)   |
| 4 | Waktu loading awal (First Contentful Paint) **< 1.5 detik**        |
| 5 | Bundle size aplikasi **< 300KB** (gzipped, kecuali library OCR)     |

---

## 4. Tech Stack

### Frontend
| Teknologi        | Keterangan                                                       |
|------------------|------------------------------------------------------------------|
| **React 18+**    | Library utama untuk membangun UI berbasis komponen                |
| **Vite**         | Build tool modern, sangat cepat untuk development & production   |
| **Tailwind CSS** | Utility-first CSS framework (sudah digunakan di desain existing) |
| **Vite PWA Plugin** | Plugin untuk mengubah aplikasi Vite menjadi PWA                  |

### Backend & Database
| Teknologi                  | Keterangan                                                            |
|----------------------------|-----------------------------------------------------------------------|
| **Firebase Authentication** | Untuk login/register pengguna                                         |
| **Cloud Firestore**         | Database NoSQL real-time dengan **offline persistence** bawaan       |
| **Firebase Hosting**        | Hosting gratis, cepat, dengan CDN global dan HTTPS otomatis          |

### OCR & Edge AI (Scan Struk)
| Teknologi        | Keterangan                                                       |
|------------------|------------------------------------------------------------------|
| **Tesseract.js** (atau API Eksternal ringan seperti **Google Cloud Vision**) | Digunakan untuk membaca teks dari foto struk belanja otomatis. Jika menggunakan Tesseract.js, pemrosesan dilakukan langsung di perangkat (offline-capable, namun memakan *resource*). Jika menggunakan Google Cloud Vision API, membutuhkan koneksi internet namun hasil lebih cepat dan akurat. |

---

## 5. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                   USER DEVICE                       │
│                                                     │
│  ┌──────────────┐    ┌─────────────────────────┐    │
│  │  React App   │◄──►│  Service Worker (PWA)    │    │
│  │  (Vite PWA)  │    │  - Cache aset statis     │    │
│  └──────┬───────┘    │  - Offline fallback       │    │
│         │            └─────────────────────────┘    │
│         │                                           │
│  ┌──────▼───────┐                                   │
│  │ OCR Scanner  │ (Tesseract.js lokal atau API Call)│
│  └──────┬───────┘                                   │
│         │                                           │
│  ┌──────▼───────────┐                               │
│  │  IndexedDB        │  ◄── Firebase Offline Cache  │
│  └──────┬───────────┘                               │
│         │                                           │
└─────────┼───────────────────────────────────────────┘
          │  (Saat Online)
          ▼
┌─────────────────────────────────────────────────────┐
│                 FIREBASE CLOUD                       │
│                                                     │
│  ┌────────────────┐    ┌────────────────────────┐   │
│  │  Firebase Auth  │    │  Cloud Firestore       │   │
│  └────────────────┘    └────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 6. Struktur Halaman & Fitur

### 6.1. Halaman Beranda (Home)
*(Sesuai dengan desain di `beranda_home/code.html`)*

---

### 6.2. Halaman Tambah Transaksi (Revisi 2 Mode)
> **Status:** Perlu didesain dan dibuat

Terdapat **2 Tab Mode Input** di bagian atas halaman: **Input Manual** dan **Scan Struk**.

#### Mode 1: Input Manual
| Komponen                   | Deskripsi                                                               |
|----------------------------|-------------------------------------------------------------------------|
| **Toggle Tipe**            | Switch antara "Pengeluaran" (merah) dan "Pemasukan" (hijau)            |
| **Input Nominal**          | Input angka besar dengan format Rupiah otomatis (Rp xx.xxx.xxx)        |
| **Pilih Kategori**         | Grid ikon kategori yang bisa dipilih                                   |
| **Input Deskripsi**        | Text field opsional (Merchant/Catatan)                                 |
| **Pemilih Tanggal**        | Date & time picker                                                      |

#### Mode 2: Scan Struk (Otomatis)
| Komponen                   | Deskripsi                                                               |
|----------------------------|-------------------------------------------------------------------------|
| **Tombol Buka Kamera**     | Mengaktifkan kamera bawaan HP untuk memfoto struk kasir                |
| **Tombol Galeri**          | Memilih foto struk dari galeri HP                                      |
| **Scanning Indicator**     | Animasi loading saat AI memproses teks di gambar (OCR)                 |
| **Auto-Fill Preview**      | Setelah proses selesai, form **Nominal** dan **Deskripsi (Merchant)** terisi otomatis berdasarkan teks struk. Pengguna dapat **mengedit** hasilnya apabila AI keliru. |
| **Kategorisasi Cerdas**    | (Opsional) Saran kategori otomatis berdasarkan nama merchant.           |

#### Interaksi & Logika:
- Saat Scan Struk berhasil, pengguna diberi kesempatan memverifikasi nilai (`Total: Rp 150.000`) sebelum memencet "Simpan".
- Transaksi tetap akan disimpan ke Firestore/IndexedDB setelah konfirmasi.

---

### 6.3. Halaman Laporan (Statistik) & 6.4. Halaman Autentikasi
*(Tetap sama seperti rencana awal)*

---

## 7. Struktur Data (Firestore Schema)

### Sub-collection: `users/{userId}/transactions/{transactionId}`
```json
{
  "type": "expense",
  "amount": 125000,
  "category": "kebutuhan_harian",
  "description": "Indomaret Point",
  "icon": "shopping_bag",
  "date": "2026-03-24T14:20:00+07:00",
  "inputMethod": "scan", // NEW: 'manual' atau 'scan'
  "receiptImageRef": "path/to/storage/image.jpg", // NEW (opsional jika foto struk disimpan)
  "createdAt": "2026-03-24T14:20:30+07:00"
}
```

---

## 8. Alur Pengguna (User Flow) Tambahan

### Flow 1: Mencatat Pengeluaran via Input Manual
```
Beranda → Tap "Tambah" → Tab "Manual" → Isi Nominal → Pilih Kategori → Simpan
```

### Flow 2: Mencatat Pengeluaran via Scan Struk
```
Beranda → Tap "Tambah" → Pilih Tab "Scan Struk" 
→ Buka Kamera / Upload dari Galeri 
→ Aplikasi memindai gambar (OCR Loading...)
→ Nominal dan Deskripsi (nama toko) terisi otomatis ke dalam form
→ Pengguna verifikasi/edit jika ada yang salah 
→ Tap "Simpan" → Selesai
```

---

## 9. Roadmap & Milestones (Penyesuaian)

### Fase 1: MVP (Minimum Viable Product) — Minggu 1-2
- [x] Desain UI Beranda
- [ ] Setup project React + Vite + Firebase + PWA
- [ ] Form Input Transaksi **Manual**
- [ ] Kalkulasi saldo & Laporan Dasar

### Fase 2: Integrasi Scan & AI — Minggu 3-4
- [ ] Integrasi library OCR/Camera API (Tesseract.js / Firebase ML Vision)
- [ ] UI/UX Mode Scan Struk (Loading state, error handling foto buram)
- [ ] Fitur Auto-fill form hasil OCR
- [ ] Offline persistence (Firestore)

### Fase 3: Polish & Enhancement — Minggu 5+
- [ ] Grafik Laporan lengkap
- [ ] Penyimpanan gambar struk ke Firebase Storage
- [ ] Push notifications & Multi-akun

---

> **Dokumen ini akan diperbarui seiring perkembangan project.**
> 
> *Dibuat oleh: AI Assistant — Revisi Scan Struk — 24 Maret 2026*
