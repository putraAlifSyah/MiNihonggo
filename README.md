# MiNihonggo

Aplikasi web belajar kosakata bahasa Jepang berbasis spaced repetition, flashcard, dan test harian. Cocok dipakai bersama keluarga dengan satu akun admin.

---

## Fitur Utama

- Flashcard dengan animasi flip dan sistem SRS (Spaced Repetition SM-2)
- Test harian dengan 6 tipe soal: pilihan ganda, terjemahan, baca kanji, drag-and-drop matching, dan essay
- Penilaian jawaban terbuka menggunakan AI (OpenAI-compatible)
- AI Word Explainer di flashcard (streaming penjelasan nuansa kata)
- AI Tutor Chat untuk tanya jawab bebas tentang bahasa Jepang
- Pengaturan AI per user (support OpenAI, Google Gemini, Anthropic, OpenRouter, Ollama)
- Soal salah tersimpan dan muncul kembali di sesi berikutnya
- Rencana belajar otomatis berdasarkan target tanggal selesai
- Analytics: donut chart, progress plan, badges, riwayat
- Leaderboard anggota keluarga
- Admin panel: upload Excel, CRUD kata, kelola user
- Streak system dan badge gamifikasi
- Dark mode glassmorphism UI

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Vite + React + Tailwind CSS v4 |
| Backend | Express.js (Node.js) |
| Database | SQLite via better-sqlite3 |
| Auth | JWT + bcrypt |
| AI | OpenAI-compatible API (Gemini, OpenAI, Claude, Ollama) |
| Animasi | Framer Motion |

---

## Struktur Folder

```
MiNihonggo/
- frontend/       Vite + React app
- backend/        Express.js API
- README.md
```

---

## Cara Menjalankan

### 1. Install dependensi

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Setup environment

Salin file contoh env di backend:

```bash
cd backend
cp .env.example .env
```

Isi JWT_SECRET dengan string acak yang panjang.

### 3. Jalankan backend

```bash
cd backend
node index.js
```

Backend berjalan di http://localhost:3000

### 4. Jalankan frontend

```bash
cd frontend
npm run dev
```

Frontend berjalan di http://localhost:5173

### 5. Register akun pertama

Buka http://localhost:5173/register dan daftar. User pertama otomatis menjadi admin.

---

## Format Excel untuk Import Kata

Admin bisa upload file Excel dengan sheet berikut:

- Sheet "Kata Benda", "Kata Kerja", "Kata Sifat", "Lainnya": kolom japanese, hiragana, romaji, meaning, example_sentence_jp, example_sentence_id
- Sheet "Kanji": kolom kanji, onyomi, kunyomi, meaning, example, stroke_count
- Sheet "Grammar": kolom pattern, meaning, example_jp, example_id, note

---

## Pengaturan AI

Setiap user bisa mengatur AI sendiri di menu Pengaturan AI:

1. Pilih provider (Google Gemini, OpenAI, Anthropic, OpenRouter, atau Ollama lokal)
2. Masukkan API key
3. Masukkan nama model
4. Klik Test Koneksi untuk verifikasi
5. Simpan

API key dienkripsi AES-256 di server dan tidak pernah dikirim kembali ke browser.

Provider yang didukung:

| Provider | Base URL |
|---|---|
| Google Gemini | https://generativelanguage.googleapis.com/v1beta/openai |
| OpenAI | https://api.openai.com/v1 |
| Anthropic | https://api.anthropic.com/v1 |
| OpenRouter | https://openrouter.ai/api/v1 |
| Ollama (lokal) | http://localhost:11434/v1 |

---

## Akses Publik via Cloudflare Tunnel

Untuk akses dari luar jaringan rumah tanpa buka port router:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
cloudflared tunnel --url http://localhost:5173
```

---

## Lisensi

MIT License - bebas digunakan dan dimodifikasi.
