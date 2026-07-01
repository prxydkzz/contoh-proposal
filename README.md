# Kas Kuliah — Aplikasi Catatan Keuangan

Aplikasi pencatat pemasukan & pengeluaran sederhana, dibangun dengan HTML, CSS,
dan JavaScript murni (tanpa framework, tanpa perlu install Node.js). Cocok
untuk belajar sekaligus dipakai sehari-hari.

## Cara menjalankan di VS Code

1. Buka folder `finance-app` ini di VS Code (`File > Open Folder...`).
2. Install ekstensi **Live Server** (oleh Ritwick Dey) dari tab Extensions.
3. Klik kanan pada `index.html` → pilih **Open with Live Server**.
4. Browser akan terbuka otomatis. Daftar akun baru, lalu login.

Tanpa Live Server pun sebenarnya bisa langsung dibuka dengan klik dua kali pada
`index.html`, tapi Live Server lebih disarankan karena auto-refresh saat kode
diubah.

## Struktur folder

```
finance-app/
├─ index.html          # Halaman login, daftar, lupa sandi
├─ dashboard.html       # Halaman utama aplikasi setelah login
├─ css/
│  └─ style.css         # Semua styling
├─ js/
│  ├─ storage.js        # Lapisan data (localStorage)
│  ├─ auth.js           # Logika login/daftar/lupa sandi
│  └─ app.js             # Logika dasbor, transaksi, target, grafik, laporan
└─ README.md
```

## Catatan penting

- **Data disimpan di browser** (localStorage), per perangkat. Ini artinya
  data tidak sinkron antar perangkat dan akan hilang jika cache browser
  dibersihkan. Untuk versi yang lebih serius, langkah selanjutnya adalah
  memindahkan bagian `js/storage.js` ke pemanggilan API menuju backend
  (misalnya Node.js + database seperti MySQL/PostgreSQL/Firebase).
- Kata sandi disimpan apa adanya di `localStorage` untuk kebutuhan belajar.
  **Jangan pakai pola ini untuk aplikasi produksi** — pada backend sungguhan,
  kata sandi wajib di-hash (contoh: bcrypt) sebelum disimpan.
- Grafik memakai library [Chart.js](https://www.chartjs.org/) dan unduh PDF
  memakai [jsPDF](https://github.com/parallax/jsPDF), keduanya dimuat dari
  CDN sehingga butuh koneksi internet saat pertama kali dibuka.

## Menjadikannya aplikasi HP (Android & iPhone)

Aplikasi ini sudah disiapkan sebagai **PWA (Progressive Web App)** — artinya
bisa di-"install" dari browser HP dan muncul sebagai ikon aplikasi biasa,
tanpa lewat Play Store/App Store. File yang mengatur ini: `manifest.json`,
`service-worker.js`, dan `icons/`.

**Syarat penting:** untuk bisa di-install di HP sungguhan, aplikasi harus
diakses lewat **HTTPS** (bukan sekadar dibuka dari file lokal). Live Server
di laptop hanya jalan di `localhost`, jadi tidak bisa langsung dibuka dari
HP. Solusinya, unggah dulu ke hosting gratis:

1. **Netlify Drop** (paling cepat, tanpa akun wajib):
   buka [app.netlify.com/drop](https://app.netlify.com/drop), lalu seret
   folder `finance-app` ke halaman itu. Netlify akan memberi alamat
   `https://nama-acak.netlify.app`.
2. **GitHub Pages**: unggah folder ini ke repository GitHub, lalu aktifkan
   Pages di menu Settings → Pages.
3. **Vercel**: `npm i -g vercel`, lalu jalankan `vercel` di dalam folder ini.

Setelah dapat alamat HTTPS, buka alamat itu dari HP:

- **Android (Chrome):** akan muncul notifikasi "Tambahkan ke layar utama" /
  "Install app" otomatis. Kalau tidak muncul, tekan menu titik tiga → *Add
  to Home screen* / *Install app*.
- **iPhone (Safari — wajib Safari, bukan Chrome):** tekan ikon *Share*
  (kotak dengan panah ke atas) → *Add to Home Screen* → *Add*.

Setelah di-install, ikon "Kas Kuliah" muncul di layar utama, terbuka tanpa
address bar seperti aplikasi native, dan tetap bisa dibuka meski sinyal
internet lemah (halaman sudah di-cache oleh `service-worker.js`). Data tetap
tersimpan di penyimpanan lokal HP tersebut (localStorage per browser/perangkat).

### Kalau butuh aplikasi "asli" untuk Play Store / App Store

PWA sudah cukup untuk sebagian besar kebutuhan sehari-hari, tapi kalau nanti
mau benar-benar dipublikasikan ke Play Store/App Store, langkah lanjutannya
adalah membungkus proyek ini dengan
[Capacitor](https://capacitorjs.com/) (dari tim Ionic) — proyek web ini bisa
dipakai hampir tanpa ubah, tinggal tambah `npx cap init`, `npx cap add
android`, dan `npx cap add ios`, lalu build lewat Android Studio / Xcode.
Ini butuh langkah tambahan (akun developer, proses build native) sehingga
disarankan hanya dilakukan setelah versi PWA-nya terasa sudah matang dan
sering dipakai.

## Ide pengembangan lanjutan

- Tambah pengaturan batas pengeluaran harian per kategori (saat ini masih
  angka tetap di `js/app.js`, cari variabel `DAILY_LIMIT`).
- Tambah filter tanggal pada riwayat pemasukan/pengeluaran.
- Ganti localStorage dengan backend supaya data bisa diakses dari HP dan
  laptop sekaligus.
