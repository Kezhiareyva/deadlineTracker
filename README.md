# Deadline Tracker with WhatsApp Bot

Aplikasi Full-stack web untuk mengelola tugas dan memberikan pengingat (*reminders*) otomatis langsung ke nomor WhatsApp Anda. 

## Fitur Utama
- **WhatsApp Bot Terintegrasi**: Mengirim pesan pengingat langsung ke WhatsApp tujuan.
- **Smart Reminders**: Bot mengecek setiap menit dan mengirim pengingat persis 1 jam, 2 jam, 24 jam (dst) sebelum deadline.
- **Bot Interaktif**: Balas pesan bot dengan "yes [ID]" untuk menandai tugas telah selesai, atau "no [ID]" jika belum.
- **Modern UI**: Desain menggunakan teknik Glassmorphism dan animasi responsif (React + Vite).

## Teknologi
- **Frontend**: React, Vite, Axios, Lucide React (Icons).
- **Backend**: Node.js, Express, SQLite3, node-cron.
- **WhatsApp API**: `whatsapp-web.js` (Menggunakan sistem Puppeteer/Chromium tanpa biaya API resmi).

## Cara Menjalankan dengan Docker (Rekomendasi)
Proyek ini sudah dilengkapi dengan konfigurasi Docker agar mudah dijalankan tanpa perlu instalasi rumit.

1. Pastikan Anda sudah menginstal [Docker](https://www.docker.com/).
2. Buka terminal di folder proyek ini.
3. Jalankan perintah:
   ```bash
   docker-compose up --build -d
   ```
4. Buka browser dan akses: `http://localhost:5173`
5. Scan QR code yang muncul menggunakan HP Anda (Lewat fitur *Tautkan Perangkat* di WhatsApp).

## Cara Menjalankan Manual (Lokal)
Jika tidak ingin menggunakan Docker:

**1. Jalankan Backend**
```bash
cd backend
npm install
node server.js
```

**2. Jalankan Frontend**
```bash
cd frontend
npm install
npm run dev
```
Buka `http://localhost:5173`.

## Catatan Penting
- Folder `.wwebjs_auth/` dan file database `database.sqlite` secara otomatis di-*ignore* dari GitHub untuk alasan keamanan dan privasi. Jangan pernah meng-upload file sesi WhatsApp ke repository publik!
