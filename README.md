# MiNihonggo

A web-based Japanese vocabulary learning app powered by spaced repetition, flashcards, and AI-generated daily tests. Built for family use with a single admin account.

![Stack](https://img.shields.io/badge/React-Vite-blue) ![Stack](https://img.shields.io/badge/Express-Node.js-green) ![Stack](https://img.shields.io/badge/SQLite-Database-orange) ![Stack](https://img.shields.io/badge/AI-OpenAI--compatible-purple)

---

## Features

- Flashcard system with 3D flip animation and SM-2 Spaced Repetition (SRS)
- Daily test with 6 question types: multiple choice, JP to ID translation, ID to JP translation, kanji reading, drag-and-drop matching, and essay/comprehension
- Open-ended answer grading by AI with contextual feedback
- AI Word Explainer on flashcards (streaming explanation of word nuance, similar words, and mnemonics)
- AI Tutor chat for free-form Japanese Q&A
- Per-user AI settings (supports OpenAI, Google Gemini, Anthropic, OpenRouter, and local Ollama)
- Wrong answers are saved and resurface in the next session automatically
- Study plan generator based on target completion date
- Analytics: donut chart, plan progress, badges, study history
- Family leaderboard
- Admin panel: Excel upload, word CRUD, user management
- Streak system and badge gamification
- Dark mode glassmorphism UI with smooth animations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + Tailwind CSS v4 |
| Backend | Express.js (Node.js) |
| Database | SQLite via better-sqlite3 |
| Auth | JWT + bcrypt |
| AI | OpenAI-compatible API |
| Animations | Framer Motion |

---

## Project Structure

```
MiNihonggo/
- frontend/     Vite + React application
- backend/      Express.js REST API
- README.md
```

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to a long random string.

### 3. Run the backend

```bash
cd backend
node index.js
```

API runs at http://localhost:3000

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

App runs at http://localhost:5173

### 5. Create your first account

Go to http://localhost:5173/register and sign up. The first registered user is automatically granted admin privileges.

---

## Excel Import Format

Admin users can upload vocabulary via Excel. The file should contain the following sheets:

**Vocabulary sheets** (Kata Benda, Kata Kerja, Kata Sifat, Lainnya)

| Column | Description |
|---|---|
| japanese | Word in kanji or kana |
| hiragana | Reading in hiragana |
| romaji | Romanized reading |
| meaning | Indonesian translation |
| example_sentence_jp | Example sentence (optional) |
| example_sentence_id | Translated example (optional) |

**Kanji sheet**

| Column | Description |
|---|---|
| kanji | Kanji character |
| onyomi | On reading |
| kunyomi | Kun reading |
| meaning | Meaning |
| example | Example word or sentence |
| stroke_count | Number of strokes |

**Grammar sheet**

| Column | Description |
|---|---|
| pattern | Grammar pattern (e.g. ~てください) |
| meaning | Meaning or function |
| example_jp | Example sentence |
| example_id | Translated example |
| note | Additional notes |

---

## AI Configuration

Each user can configure their own AI provider in the AI Settings page (`/settings/ai`):

1. Select a provider preset (fills in the base URL automatically)
2. Enter your API key
3. Enter the model name
4. Click Test Connection to verify
5. Save

API keys are encrypted with AES-256-GCM on the server and never sent back to the browser in plain text.

**Supported providers:**

| Provider | Base URL |
|---|---|
| Google Gemini | https://generativelanguage.googleapis.com/v1beta/openai |
| OpenAI | https://api.openai.com/v1 |
| Anthropic | https://api.anthropic.com/v1 |
| OpenRouter | https://openrouter.ai/api/v1 |
| Ollama (local) | http://localhost:11434/v1 |

Recommended budget models: `gemini-2.0-flash-lite` (Google), `gpt-4o-mini` (OpenAI), or any free model via OpenRouter.

---

## Public Access via Cloudflare Tunnel

To access the app from outside your home network without opening router ports:

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
cloudflared tunnel --url http://localhost:5173
```

No account required for a quick tunnel. For a stable URL, use a named tunnel with `cloudflared tunnel create`.

---

## Security Notes

- API keys are never stored in plain text. They are encrypted with AES-256-GCM before being written to the database.
- All AI requests are proxied through the backend. The frontend never directly contacts the AI provider.
- The SQLite database file and `.env` are excluded from version control via `.gitignore`.
- JWT tokens expire and must be refreshed by logging in again.

---

## License

MIT License - free to use and modify.
