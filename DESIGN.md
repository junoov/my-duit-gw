# Panduan Sistem Desain: Keanggunan Finansial Digital

Dokumen ini mendefinisikan bahasa visual untuk pengalaman finansial yang premium, modern, dan tepercaya. Sebagai desainer, tugas Anda bukan sekadar menyusun kotak, melainkan mengkurasi sebuah "Editorial Finansial" yang terasa hidup, berpori, dan berwibawa.

---

## 1. Creative North Star: "The Digital Private Bank"
Visi utama kita adalah mengubah aplikasi finansial yang kaku menjadi pengalaman selayaknya berkonsultasi di ruang privat perbankan yang eksklusif. Kita menghindari desain "template" yang generik dengan menggunakan:
*   **Asimetri Terencana:** Penggunaan ruang putih (white space) yang berani untuk memfokuskan perhatian pada data krusial.
*   **Kedalaman Organik:** Menghindari garis pemisah (border) yang keras, beralih ke transisi tonal yang lembut.
*   **Tipografi Editorial:** Skala kontras tinggi antara *Display* yang ekspresif dan *Body* yang fungsional.

---

## 2. Palet Warna & Aturan Visual

Sistem ini dibangun di atas spektrum hijau zamrud yang dalam, memberikan kesan stabilitas dan pertumbuhan.

### Aturan Utama: "No-Line Rule"
**Dilarang keras menggunakan garis border 1px solid** untuk memisahkan bagian atau seksi. Kedalaman dan batas antar elemen harus dicapai melalui:
1.  **Pergeseran Tonal:** Gunakan `surface-container-low` di atas `surface` untuk menciptakan area baru.
2.  **Shadow Ambient:** Gunakan bayangan yang sangat pudar untuk mengangkat elemen.

### Penggunaan Token Warna
*   **Primary (`#003527` & `#064e3b`):** Digunakan untuk elemen otoritas tertinggi dan latar belakang hero.
*   **Secondary (`#006c4b`):** Untuk aksi utama (CTA) yang membutuhkan perhatian namun tetap harmonis.
*   **Glass & Gradient:** Untuk elemen mengambang, gunakan `surface` dengan opasitas 80% dan *backdrop-blur* 16px. Gunakan gradasi halus dari `primary` ke `primary_container` pada kartu saldo untuk memberikan "jiwa" pada UI.

---

## 3. Tipografi: Vokal dan Penunjang

Kita menggunakan perpaduan **Manrope** untuk elemen tajuk yang modern dan **Inter** untuk keterbacaan data finansial yang presisi.

| Peran | Font | Ukuran | Kegunaan |
| :--- | :--- | :--- | :--- |
| **Display LG** | Manrope | 3.5rem | Angka saldo utama atau pesan sambutan. |
| **Headline MD** | Manrope | 1.75rem | Judul halaman atau ringkasan kategori. |
| **Title LG** | Inter | 1.375rem | Judul kartu atau modal. |
| **Body MD** | Inter | 0.875rem | Teks utama, keterangan transaksi. |
| **Label MD** | Inter | 0.75rem | Teks navigasi bawah atau keterangan mikro. |

**Catatan Editorial:** Selalu berikan *letter-spacing* negatif ringan (-0.02em) pada `Display` dan `Headline` untuk memberikan kesan premium yang padat.

---

## 4. Elevasi & Layering (Depth)

Lupakan grid yang datar. UI ini adalah tumpukan material fisik yang elegan.

*   **Layering Principle:** Gunakan hierarki permukaan. Letakkan kartu dengan `surface_container_lowest` di atas latar belakang `surface_container_low`. Ini menciptakan efek "angkat" alami tanpa polusi visual.
*   **Ambient Shadows:** Jika elemen harus mengambang (misal: *Floating Action Button*), gunakan bayangan dengan blur besar (24px-32px) dan opasitas rendah (4%-8%). Gunakan warna bayangan yang diambil dari `on_surface` yang di-tint, bukan abu-abu netral.
*   **Ghost Border Fallback:** Jika aksesibilitas membutuhkan pembatas, gunakan token `outline_variant` dengan opasitas maksimal 15%. Garis tidak boleh terlihat mendominasi konten.

---

## 5. Komponen Utama

### Kartu (Cards)
*   **Radius:** Wajib menggunakan `xl` (1.5rem / 24px) untuk kartu utama.
*   **Pemisah:** Dilarang menggunakan *divider line*. Gunakan jarak vertikal (`spacing.8`) atau perubahan warna latar belakang untuk memisahkan grup informasi.

### Tombol (Buttons)
*   **Primary:** Latar `secondary`, teks `on_secondary`. Bentuk *fully rounded* (`full`).
*   **Tertiary:** Tanpa latar belakang, menggunakan `primary_fixed_variant` sebagai warna teks.

### Input Field
*   Latar belakang menggunakan `surface_container_high`.
*   Tanpa border saat *idle*. Saat *active*, gunakan `surface_tint` dengan ketebalan 2px namun hanya di bagian bawah (editorial style) atau berikan bayangan lembut di seluruh area input.

### Komponen Tambahan: Wealth Gauge
Gunakan elemen visual lengkung (visualisasi progres) dengan warna `secondary_fixed` untuk menunjukkan kesehatan finansial pengguna, bukan sekadar angka mentah.

---

## 6. Do’s & Don’ts

### Do’s
*   **Gunakan Bahasa yang Manusiawi:** Gunakan "Saldo Tersedia" daripada "Balance", "Alokasi Dana" daripada "Budgeting".
*   **Bernapas:** Berikan ruang kosong yang luas. Jika ragu, tambahkan spasi menggunakan `spacing.6` atau `spacing.8`.
*   **Konsistensi Radius:** Gunakan `xl` untuk container besar dan `md` untuk elemen kecil seperti chip atau tombol mini.

### Don’ts
*   **Jangan gunakan hitam pekat (#000000):** Gunakan `on_surface` atau `primary` yang gelap untuk teks agar kontras tetap nyaman di mata.
*   **Jangan gunakan bayangan keras:** Jika bayangan terlihat jelas dalam sekilas mata, berarti itu terlalu gelap.
*   **Jangan gunakan ikon yang terlalu dekoratif:** Gunakan *line icon* yang bersih dengan ketebalan (stroke) yang konsisten dengan berat font `body`.

---
*Dokumen ini adalah panduan hidup. Gunakan intuisi desain Anda untuk menjaga agar setiap layar terasa seperti halaman majalah premium: bersih, informatif, dan berkelas.*