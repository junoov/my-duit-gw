# OpenRouter Setup

## Menjalankan Project + AI Parser

1. Install dependency:

```bash
npm install
```

2. Jalankan mode dev dengan AI server:

```bash
npm run dev:ai
```

3. Buka app di `http://localhost:5173`.

## Deploy ke Vercel

API AI sudah tersedia sebagai Vercel Function:

- `POST /api/ai/receipt-parse`
- `GET /api/health`

Di Vercel Project Settings -> Environment Variables, isi minimal:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (disarankan `openrouter/free`)
- `OPENROUTER_MODEL_FALLBACKS` (contoh: `google/gemma-3-12b-it:free,openai/gpt-oss-120b:free`)
- `VITE_ENABLE_AI_RECEIPT=true`

Opsional:

- `APP_ORIGIN` (domain publik app, misalnya `https://money-notes.vercel.app`)

Setelah deploy, frontend langsung memanggil endpoint AI yang sama (`/api/ai/receipt-parse`) tanpa perlu server lokal.

## Cara Cek AI Server

Endpoint health check:

```bash
http://localhost:8787/api/health
```

Jika `ready: true`, API key OpenRouter sudah terbaca.

## Konfigurasi Environment

Gunakan `.env.local` untuk key rahasia.

Variabel utama:

- `OPENROUTER_API_KEY`: API key OpenRouter (wajib)
- `OPENROUTER_MODEL`: model OpenRouter utama, default `openrouter/free`
- `OPENROUTER_MODEL_FALLBACKS`: daftar fallback model gratis dipisah koma (contoh: `google/gemma-3-12b-it:free,openai/gpt-oss-120b:free`)
- `AI_SERVER_PORT`: port server AI lokal, default `8787`
- `VITE_ENABLE_AI_RECEIPT`: `true`/`false` untuk menyalakan parser AI di frontend

## Alur Scan dengan AI

1. OCR lokal membaca teks struk.
2. Parser lokal isi data awal (fallback).
3. Frontend memanggil `/api/ai/receipt-parse`.
4. AI memperkaya `amount`, `merchant`, `lineItems`, dan `suggestedCategoryId`.
5. User verifikasi lalu simpan transaksi.
