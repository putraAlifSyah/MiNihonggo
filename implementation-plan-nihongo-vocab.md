# 🇯🇵 Nihongo Vocab App — Implementation Plan

> Aplikasi web belajar kosakata bahasa Jepang berbasis spaced repetition, flashcard, dan test harian. Digunakan oleh beberapa anggota keluarga dengan satu akun admin.

---

## 1. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Vite + React + Tailwind CSS |
| Backend / API | Express.js (Node.js) |
| Database | SQLite (via `better-sqlite3`) — atau PostgreSQL jika skala lebih besar |
| Auth | JWT (jsonwebtoken) + bcrypt — disimpan di SQLite |
| File Upload | Multer (middleware Express untuk upload Excel) |
| Hosting | Lokal (localhost) + **Cloudflare Tunnel** (`cloudflared`) untuk akses publik |
| Excel Parsing | `xlsx` (SheetJS) — di Express API |
| AI Integration | Multi-provider via OpenAI-compatible API (OpenAI, Gemini, Claude, dll.) |

> **Kenapa SQLite?** Ringan, zero-config, satu file database, cocok untuk pemakaian keluarga (beberapa user). Bisa migrasi ke PostgreSQL kapan saja jika butuh scale.

> **Cloudflare Tunnel**: Jalankan `cloudflared tunnel --url http://localhost:5173` (frontend) dan `http://localhost:3000` (API). Tidak perlu buka port router, gratis, dan aman.

---

## 2. Struktur Database

### `users`
```sql
id UUID PRIMARY KEY
name TEXT
email TEXT UNIQUE
password_hash TEXT
role TEXT DEFAULT 'user'  -- 'admin' | 'user'
created_at TIMESTAMP
```

### `levels`
```sql
id SERIAL PRIMARY KEY
code TEXT UNIQUE  -- 'N5', 'N4', 'N3', 'N2', 'N1'
label TEXT
is_active BOOLEAN DEFAULT false  -- admin yang aktifkan kalau konten sudah diinput
```

### `categories`
```sql
id SERIAL PRIMARY KEY
level_id INT REFERENCES levels(id)
name TEXT  -- 'Kata Benda', 'Kata Kerja', 'Kata Sifat', 'Lainnya', 'Kanji', 'Grammar'
type TEXT  -- 'vocabulary' | 'kanji' | 'grammar'
```

### `words` (kosakata & kanji)
```sql
id SERIAL PRIMARY KEY
category_id INT REFERENCES categories(id)
japanese TEXT          -- 食べる
hiragana TEXT          -- たべる
romaji TEXT            -- taberu
meaning TEXT           -- makan
example_sentence_jp TEXT   -- 私は毎日ご飯を食べる。
example_sentence_id TEXT   -- Saya makan nasi setiap hari.
word_type TEXT         -- 'noun' | 'verb' | 'adjective' | 'other' | 'kanji'
-- Khusus Kanji:
onyomi TEXT            -- ショク
kunyomi TEXT           -- た.べる
stroke_count INT
created_at TIMESTAMP
```

### `grammar_patterns`
```sql
id SERIAL PRIMARY KEY
category_id INT REFERENCES categories(id)
pattern TEXT           -- 〜てください
meaning TEXT
example_jp TEXT
example_id TEXT
note TEXT
```

### `study_plans`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
level_id INT REFERENCES levels(id)
target_date DATE
words_per_day INT      -- dihitung otomatis
total_words INT
started_at TIMESTAMP
is_active BOOLEAN DEFAULT true
```

### `user_word_progress`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
word_id INT REFERENCES words(id)
status TEXT DEFAULT 'unseen'  -- 'unseen' | 'learning' | 'fuzzy' | 'known'
ease_factor FLOAT DEFAULT 2.5    -- untuk SRS
interval_days INT DEFAULT 1      -- SRS: hari sampai review berikutnya
repetitions INT DEFAULT 0
next_review_date DATE
last_reviewed_at TIMESTAMP
```

### `daily_sessions`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
session_date DATE
words_studied INT DEFAULT 0
words_tested INT DEFAULT 0
correct_count INT DEFAULT 0
duration_seconds INT
completed BOOLEAN DEFAULT false
```

### `test_results`
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
word_id INT REFERENCES words(id)
session_id UUID REFERENCES daily_sessions(id)
question_type TEXT    -- 'multiple_choice' | 'matching'
is_correct BOOLEAN
answered_at TIMESTAMP
```

### `streaks`
```sql
user_id UUID REFERENCES users(id) PRIMARY KEY
current_streak INT DEFAULT 0
longest_streak INT DEFAULT 0
last_active_date DATE
```

### `badges`
```sql
id SERIAL PRIMARY KEY
key TEXT UNIQUE       -- 'first_100_words', '7_day_streak', dll
label TEXT
description TEXT
icon TEXT
```

### `user_badges`
```sql
user_id UUID
badge_id INT
earned_at TIMESTAMP
PRIMARY KEY (user_id, badge_id)
```

### `ai_settings` (per user)
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
user_id UUID REFERENCES users(id) UNIQUE
is_enabled BOOLEAN DEFAULT false       -- user opt-in, default OFF
provider TEXT                          -- 'openai' | 'google' | 'anthropic' | 'custom'
base_url TEXT                          -- endpoint, e.g. https://api.openai.com/v1
api_key TEXT                           -- disimpan terenkripsi (AES-256)
model_name TEXT                        -- e.g. 'gpt-4o', 'gemini-1.5-flash', 'claude-sonnet-4-6'
created_at TIMESTAMP
updated_at TIMESTAMP
```

> **Catatan keamanan**: `api_key` dienkripsi di server sebelum disimpan ke DB, menggunakan secret key dari `.env`. Tidak pernah dikirim kembali ke frontend dalam bentuk plain text — hanya ditampilkan sebagai `••••••••` setelah tersimpan.

---

## 3. Fitur & Halaman

### A. AUTH
- Login page (email + password)
- Register (user biasa, diinvite oleh admin atau register sendiri)
- Admin punya akses ke panel khusus

---

### B. DASHBOARD (Home)
Setelah login, user langsung lihat:
- **Pilih level aktif** (N5–N1, hanya yang sudah diaktifkan admin)
- **Progress hari ini**: kata yang sudah dipelajari / target harian
- **Tombol mulai**: Flashcard hari ini / Test hari ini
- **Streak counter**: 🔥 5 hari berturut-turut
- **Summary minggu ini**: mini grafik bar atau ring chart

---

### C. ONBOARDING — STUDY PLAN SETUP
Muncul saat user pertama kali pilih level baru:
1. User pilih level (N5/N4/...)
2. User pilih kategori yang mau dipelajari (semua, atau pilih tertentu)
3. User set **target tanggal selesai**
4. Sistem hitung: `words_per_day = total_words / sisa_hari`
5. Konfirmasi & mulai

---

### D. FLASHCARD MODE
Alur per sesi:
1. Tampilkan kartu depan: **Kanji / Kata Jepang**
2. User klik "Lihat Jawaban"
3. Tampil: hiragana, romaji, arti, contoh kalimat
4. User pilih salah satu:
   - ✅ **Sudah hafal** → status: `known`, interval naik (SRS)
   - 🔶 **Belum terlalu hafal** → status: `fuzzy`, interval sedang
   - ❌ **Belum hafal** → status: `learning`, muncul lagi di sesi hari ini

UI: Card flip animation, tombol di bawah, progress bar di atas.

---

### E. TEST HARIAN

#### Format 1: Pilihan Ganda
- Tampilkan kata Jepang
- Pilih 1 dari 4 opsi arti (1 benar, 3 dari kata lain secara acak)
- Bisa juga dibalik: tampilkan arti → pilih kata Jepangnya (Mode Terbalik)

#### Format 2: Cocok-Cocokan (Matching)
- Tampilkan 5–6 pasang kata dan arti secara acak
- User drag-and-drop atau tap untuk pasangkan
- Semua benar → lanjut; ada yang salah → highlight merah & coba lagi

#### Alur Test:
- Test hanya mencakup kata yang sudah masuk flashcard (status bukan `unseen`)
- Jumlah soal: 10–20 per sesi
- Hasil test → update `user_word_progress` & `test_results`
- Kata yang salah → `interval_days` direset, muncul lagi lebih cepat (SRS)

---

### F. SPACED REPETITION SYSTEM (SRS)
Menggunakan algoritma **SM-2** (sama seperti Anki):

```
Setelah jawab benar:
  - repetitions += 1
  - ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  - if repetitions == 1: interval = 1
  - if repetitions == 2: interval = 6
  - else: interval = round(interval * ease_factor)

Setelah jawab salah:
  - repetitions = 0
  - interval = 1
  - ease_factor = max(1.3, ease_factor - 0.2)

next_review_date = today + interval
```

Mapping ke status:
- `unseen` → belum pernah dilihat
- `learning` → interval < 3 hari
- `fuzzy` → interval 3–14 hari
- `known` → interval > 14 hari

---

### G. LATIHAN MENULIS KANJI
- Canvas HTML5, user tulis kanji dengan mouse/jari
- Di samping kanan: kanji referensi + urutan goresan (stroke order) ditampilkan sebagai GIF/SVG animasi (pakai data dari KanjiVG open-source)
- Tombol "Hapus" dan "Cek" (pengecekan visual, bukan AI — cukup tampilkan perbandingan saja)
- Hanya tersedia untuk kategori Kanji

---

### H. WEAK WORDS DASHBOARD
- Daftar kata yang paling sering salah (sort by error_count DESC)
- Filter: per kategori, per periode waktu
- Tombol "Pelajari Lagi" → langsung masuk flashcard mode untuk kata-kata ini

---

### I. ANALITIK (Per User)
Halaman analytics berisi:
- **Grafik harian**: kata dipelajari per hari (7 hari / 30 hari)
- **Pie/donut chart**: distribusi status kata (hafal / fuzzy / learning / unseen)
- **Heatmap aktivitas**: mirip GitHub contribution graph
- **Progress per kategori**: progress bar per kategori (Kata Benda, Kata Kerja, dll.)
- **Tingkat akurasi test**: rata-rata benar per kategori
- **Kata paling sering salah**: top 10

---

### J. GAMIFIKASI
#### Streak
- Belajar setiap hari → streak bertambah
- Tidak belajar → streak reset ke 0
- Tampilkan di dashboard dan profil

#### Badge System
| Badge Key | Trigger |
|---|---|
| `first_word` | Hafal kata pertama |
| `first_100` | Hafal 100 kata |
| `first_500` | Hafal 500 kata |
| `streak_7` | 7 hari berturut-turut |
| `streak_30` | 30 hari berturut-turut |
| `n5_complete` | Selesaikan semua kosakata N5 |
| `test_perfect` | Test sempurna 100% |
| `speed_demon` | Selesaikan 30 kata dalam 5 menit |

---

### K. FITUR AI (Opsional, Per User)

> Semua fitur AI hanya aktif jika user sudah mengaktifkan AI di Settings dan memasukkan API key. Jika AI dinonaktifkan, semua tombol/fitur AI tersembunyi — pengalaman belajar tetap 100% bisa dipakai tanpa AI.

#### K1. Pengaturan AI (`/settings/ai`)
Halaman konfigurasi AI per user:
- **Toggle on/off** AI features
- **Pilih provider**: OpenAI / Google Gemini / Anthropic Claude / Custom (OpenAI-compatible)
- **Input base URL** (untuk provider custom, e.g. `https://openrouter.ai/api/v1`)
- **Input API Key** (dienkripsi sebelum disimpan)
- **Input nama model** (bebas, e.g. `gpt-4o-mini`, `gemini-1.5-flash`, `llama-3-8b`)
- **Tombol "Test Koneksi"** → kirim request sederhana untuk validasi key & model
- Provider preset yang populer (tinggal klik, base URL terisi otomatis):

| Provider | Base URL Default |
|---|---|
| OpenAI | `https://api.openai.com/v1` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` |
| Anthropic Claude | `https://api.anthropic.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Ollama (lokal) | `http://localhost:11434/v1` |

> **Rekomendasi model hemat**: `gpt-4o-mini` (OpenAI), `gemini-1.5-flash` (Google), atau model lokal via Ollama — semuanya cukup untuk penjelasan kosakata.

---

#### K2. Penjelasan Kata Otomatis (AI Word Explainer)
Tersedia di halaman flashcard & test — tombol **"Tanya AI 🤖"** muncul di kartu kata:
- Klik → AI menjelaskan kata dalam konteks:
  - Nuansa penggunaan (formal/informal, situasi)
  - Perbedaan dengan kata mirip (e.g. 見る vs 見える)
  - Contoh kalimat tambahan yang natural
  - Tips mnemonik untuk mengingat
- Response di-stream (streaming API) agar terasa cepat
- Di-cache per kata: jika sudah pernah dijelaskan, pakai cache — tidak memanggil API lagi

#### K3. Generate Contoh Kalimat Baru
- Tombol **"Buat Kalimat Baru 🤖"** di halaman detail kata
- AI generate 3 contoh kalimat baru dengan kata tersebut
- Kalimat bisa langsung disimpan ke database (dengan persetujuan user)
- Berguna untuk kata yang contoh kalimatnya kosong di database

#### K4. AI Tutor Chat (`/ai-tutor`)
Halaman chat khusus untuk tanya-jawab bahasa Jepang:
- Pertanyaan bebas: grammar, kosakata, budaya, JLPT tips
- Sistem prompt dikunci sebagai tutor bahasa Jepang
- Context-aware: bisa dikirim kata/grammar yang sedang dipelajari sebagai konteks
- Riwayat chat disimpan di `localStorage` (tidak ke database — privasi)
- Contoh pertanyaan: "apa bedanya は dan が?", "kapan pakai てform?", "jelaskan N4 grammar ～ようにする"

#### K5. Analisis Jawaban Salah + Saran Belajar
- Setelah sesi test selesai, jika ada kata yang salah → tombol **"Analisis AI 🤖"**
- AI membaca daftar kata yang salah dan memberikan:
  - Pola kesalahan (e.g. "kamu sering salah di kata kerja bentuk て")
  - Saran fokus belajar minggu ini
  - Latihan spesifik yang direkomendasikan
- Dipanggil sekali per sesi (bukan per kata)

---

#### Arsitektur AI di Backend (Express.js)

```javascript
// POST /api/ai/explain-word
// POST /api/ai/generate-sentences
// POST /api/ai/analyze-mistakes
// POST /api/ai/chat

async function callAI(userId, messages, systemPrompt) {
  const settings = await getAISettings(userId); // ambil dari DB, decrypt API key
  if (!settings?.is_enabled) throw new Error('AI not enabled');

  const response = await fetch(`${settings.base_url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.api_key}`,
    },
    body: JSON.stringify({
      model: settings.model_name,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: true, // untuk streaming response
    })
  });
  
  return response; // di-pipe langsung ke client (SSE / ReadableStream)
}
```

> **Catatan**: Semua request AI lewat backend — API key tidak pernah terekspos ke frontend. Frontend hanya menerima response teks.

---

### L. ADMIN PANEL
Hanya bisa diakses user dengan `role = 'admin'`.

#### L1. Manajemen Konten
- **Upload Excel** per level → parsing otomatis ke database
  - Parser baca sheet: Kata Benda, Kata Kerja, Kata Sifat, Lainnya, Kanji, Grammar
  - Preview data sebelum disimpan
  - Duplikat otomatis dideteksi
- **Tambah/Edit/Hapus kata** manual (CRUD form)
- **Aktifkan/nonaktifkan level** (N5 aktif → muncul di pilihan user)
- **Tambah contoh kalimat** per kata

#### L2. Manajemen User
- Lihat daftar semua user
- Lihat progress & statistik per user
- Reset progress user (jika diminta)
- Promote/demote admin
- Hapus akun

#### L3. Dashboard Admin
- Total user aktif hari ini
- Total kata dipelajari hari ini (semua user)
- Leaderboard: siapa yang paling banyak belajar minggu ini

---

## 4. Navigasi / Sitemap

```
/                         → Redirect ke /dashboard atau /login
/login                    → Halaman login
/register                 → Halaman register

/dashboard                → Home user (pilih level, progress hari ini)
/setup/:levelCode         → Onboarding setup study plan
/flashcard                → Sesi flashcard hari ini
/test                     → Test harian (pilihan ganda + matching)
/kanji-practice           → Latihan menulis kanji
/weak-words               → Kata-kata yang sering salah
/analytics                → Analitik personal
/profile                  → Profil & badges
/leaderboard              → Leaderboard keluarga
/ai-tutor                 → AI Tutor chat (hanya muncul jika AI diaktifkan)

/settings                 → Pengaturan akun
/settings/ai              → Konfigurasi AI (provider, API key, model)

/admin                    → Admin dashboard
/admin/content            → Manajemen konten (upload, CRUD)
/admin/users              → Manajemen user
```

---

## 5. Logika Bisnis Utama

### Hitung words_per_day
```javascript
function calculateWordsPerDay(totalWords, targetDate) {
  const today = new Date();
  const target = new Date(targetDate);
  const daysLeft = Math.max(1, Math.ceil((target - today) / (1000 * 60 * 60 * 24)));
  return Math.ceil(totalWords / daysLeft);
}
```

### Pilih kata untuk flashcard hari ini
```javascript
// Prioritas:
// 1. Kata yang next_review_date <= hari ini (SRS review)
// 2. Kata baru (unseen), ambil sejumlah sisa kuota harian
// 3. Kata fuzzy/learning yang belum review hari ini

async function getTodayFlashcards(userId, studyPlan) {
  const reviews = await getDueReviews(userId);          // next_review_date <= today
  const newWords = await getNewWords(userId, studyPlan.level_id, 
    Math.max(0, studyPlan.words_per_day - reviews.length));
  return [...reviews, ...newWords];
}
```

### Update progress setelah flashcard/test
```javascript
function updateSRS(progress, quality) {
  // quality: 0 = belum hafal, 1 = fuzzy, 2 = hafal
  // Berdasarkan SM-2
  let { ease_factor, interval_days, repetitions } = progress;
  
  if (quality < 1) {
    repetitions = 0;
    interval_days = 1;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  } else {
    const q = quality === 2 ? 5 : 3; // map ke skala SM-2
    ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    ease_factor = Math.max(1.3, ease_factor);
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
    repetitions += 1;
  }
  
  const next_review_date = addDays(new Date(), interval_days);
  const status = interval_days <= 2 ? 'learning' : interval_days <= 14 ? 'fuzzy' : 'known';
  
  return { ease_factor, interval_days, repetitions, next_review_date, status };
}
```

---

## 6. Excel Import Format

Admin upload file Excel dengan sheet berikut (format ini baku):

### Sheet: Kata Benda / Kata Kerja / Kata Sifat / Lainnya
| Kolom | Keterangan |
|---|---|
| japanese | Kata dalam kanji/hiragana (食べる) |
| hiragana | Cara baca (たべる) |
| romaji | Transliterasi (taberu) |
| meaning | Arti dalam bahasa Indonesia |
| example_sentence_jp | Contoh kalimat (opsional) |
| example_sentence_id | Terjemahan contoh kalimat (opsional) |

### Sheet: Kanji
| Kolom | Keterangan |
|---|---|
| kanji | Huruf kanji (食) |
| onyomi | Cara baca on (ショク) |
| kunyomi | Cara baca kun (た.べる) |
| meaning | Arti |
| example | Contoh kata/kalimat |
| stroke_count | Jumlah goresan |

### Sheet: Grammar
| Kolom | Keterangan |
|---|---|
| pattern | Pola grammar (〜てください) |
| meaning | Arti/fungsi |
| example_jp | Contoh kalimat |
| example_id | Terjemahan |
| note | Catatan tambahan |

---

## 7. UI/UX Guidelines

- **Style**: Clean, minimal, fokus konten — tidak ramai
- **Font**: 
  - UI: Inter atau Geist
  - Kanji/Jepang: Noto Sans JP (Google Fonts)
- **Warna**: Aksen merah-putih (tema Jepang), latar putih/abu muda
- **Mobile-first**: Layout harus nyaman di HP karena sering dipakai sambil santai
- **Animasi**: Card flip untuk flashcard, transisi halus antar halaman
- **Dark mode**: Opsional, bisa ditambah belakangan

---

## 8. Urutan Development (Fase)

### Fase 0 — Setup Lokal & Infrastruktur (1–2 hari)
- [ ] Init project: `vite + react` (frontend) + `express` (backend) di monorepo atau dua folder terpisah
- [ ] Setup SQLite dengan `better-sqlite3` + skema awal
- [ ] Setup Cloudflare Tunnel:
  ```bash
  # Install cloudflared
  brew install cloudflared  # atau download binary
  
  # Jalankan tunnel (tidak perlu akun untuk quick tunnel)
  cloudflared tunnel --url http://localhost:3000  # backend
  cloudflared tunnel --url http://localhost:5173  # frontend
  ```
- [ ] `.env` setup: `JWT_SECRET`, `AI_ENCRYPTION_KEY`, `PORT`
- [ ] CORS config Express untuk allow Vite dev server

### Fase 1 — MVP (2–3 minggu)
- [ ] Auth: register, login, JWT middleware
- [ ] Database schema & migrations (SQLite)
- [ ] Admin: upload Excel + parsing (Multer + SheetJS)
- [ ] Halaman flashcard (dengan 3 tombol status)
- [ ] Study plan setup (target tanggal → words/day)
- [ ] Dashboard sederhana

### Fase 2 — Core Features (2 minggu)
- [ ] SRS logic (SM-2 algorithm)
- [ ] Test harian: pilihan ganda
- [ ] Test harian: cocok-cocokan (matching)
- [ ] Streak system
- [ ] Admin: CRUD manual kata

### Fase 3 — AI Integration (1–2 minggu)
- [ ] Tabel `ai_settings` + enkripsi API key (AES-256 via `crypto` Node.js)
- [ ] Halaman `/settings/ai` (form provider/key/model + test koneksi)
- [ ] Backend: fungsi `callAI()` universal (OpenAI-compatible)
- [ ] Streaming response (SSE) dari Express ke React
- [ ] Fitur: AI Word Explainer (tombol di flashcard)
- [ ] Fitur: Generate contoh kalimat
- [ ] Fitur: AI Tutor Chat (`/ai-tutor`)
- [ ] Fitur: Analisis jawaban salah post-test
- [ ] Cache penjelasan kata (simpan di tabel `ai_word_cache`)

### Fase 4 — Enhancement (1–2 minggu)
- [ ] Halaman Analitik (grafik, heatmap)
- [ ] Weak Words Dashboard
- [ ] Badge system
- [ ] Mode Terbalik (arti → kata Jepang)
- [ ] Latihan menulis kanji (canvas)

### Fase 5 — Polish (1 minggu)
- [ ] Leaderboard keluarga
- [ ] Admin: manajemen user
- [ ] Notifikasi reminder (browser push atau email)
- [ ] Mobile responsiveness audit
- [ ] Performance optimization

---

## 9. Pertimbangan Tambahan

- **Offline support**: Bisa pakai PWA + cache flashcard di localStorage agar bisa dipakai tanpa internet
- **Data backup**: Export progress per user ke CSV (dari admin panel); backup SQLite cukup copy 1 file `.db`
- **Multi-level**: User bisa punya study plan aktif untuk beberapa level sekaligus
- **Grammar mode**: Grammar patterns bisa dijadikan flashcard tersendiri (baca pola → tebak artinya)
- **Leaderboard**: Tampilkan ranking anggota keluarga berdasarkan kata yang dihafal minggu ini (friendly competition)
- **AI privacy**: API key user tidak pernah meninggalkan server. Percakapan AI Tutor tidak disimpan ke DB (hanya localStorage)
- **AI tanpa internet lokal**: Dukung Ollama (`http://localhost:11434/v1`) agar AI bisa jalan offline di jaringan rumah
- **Cloudflare Tunnel tips**: 
  - Gunakan named tunnel (bukan quick tunnel) agar URL-nya tetap/stabil: `cloudflared tunnel create nihongo-app`
  - Set config di `~/.cloudflared/config.yml` untuk auto-start
  - Batasi akses dengan Cloudflare Access (zero trust) jika mau lebih aman — gratis untuk ≤50 user

---

## 10. Struktur Folder Project

```
nihongo-vocab/
├── frontend/              # Vite + React
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   │   ├── flashcard/
│   │   │   ├── ai/        # AIExplainer, AIChatWidget, dll
│   │   │   └── settings/
│   │   ├── hooks/
│   │   └── lib/           # API client, helpers
│   └── vite.config.js
│
├── backend/               # Express.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── words.js
│   │   ├── progress.js
│   │   ├── ai.js          # semua endpoint AI
│   │   └── admin.js
│   ├── middleware/
│   │   ├── auth.js        # JWT verify
│   │   └── aiEnabled.js   # cek AI settings user
│   ├── services/
│   │   ├── srs.js         # SM-2 logic
│   │   ├── ai.js          # callAI(), streaming, cache
│   │   └── encryption.js  # enkripsi/dekripsi API key
│   ├── db/
│   │   ├── schema.sql
│   │   └── index.js       # better-sqlite3 instance
│   └── index.js
│
├── .env
└── README.md
```
