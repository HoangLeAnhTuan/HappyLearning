# HappyLearning - IELTS Speaking Part 2 Interactive Web App (v1.0.0)

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.8-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-CSS%204-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Storage-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**HappyLearning** is an interactive, full-stack educational web application designed for IELTS Speaking Part 2 practice. Built with Next.js (App Router), Tailwind CSS, Web Speech API, and Supabase PostgreSQL & Storage.

---

## 🚀 Key Features

### 1. 📖 Student Practice Hub
* **Structured 7-Step IELTS Scaffolding:** Comprehensive step-by-step cue card templates with interactive gap-fills (`[[option1|option2]]`) and band-boosting collocations.
* **Smart Text-to-Speech (TTS):** Browser-native pronunciation engine supporting **US (American)**, **UK (British)**, and **AU (Australian)** accents with speed adjustments (*Slow 0.8x, Normal 1.0x, Fast 1.2x*).
* **Two Practice Modes:**
  * **🎤 Speaker Mode:** 2-minute visual circular timer with warning milestones (30s yellow, 10s red, sound alerts), full step checklist, and high-fidelity 96kbps audio recording.
  * **🎧 Listener / Peer Mode:** Collocation spotter counter with synchronized audio playback (-5s/+5s seek, 0.75x/1x/1.25x speed, scrubber) and automated/manual collocation matching.
* **Student Access Code System:** Seamless login with student access codes generated per class.

### 2. 👩🏫 Teacher Portal & Studio Dashboard (`/teacher`)
* **Topic Management (CRUD):** Visual topic editor to create, edit, clone, and delete IELTS Speaking cue cards, 7-step templates, and collocations.
* **Student Roster & Access Codes:** Generate secure student codes, filter by class, and track practice session volume.
* **Audio Review & Smart Pop-up Player:**
  * Interactive waveform banner with live duration decoding for `.webm`/`.wav` recordings.
  * Seek controls (`-10s`, `-5s`, `+5s`, `+10s`), timeline scrubber, volume/mute controls, and playback speed options (`0.75x`, `1.0x`, `1.25x`, `1.5x`).
  * Direct audio download.
* **Custom Delete Confirmation:** Safe permanent deletion of practice records and associated audio files from Supabase Storage.

### 3. 🔒 Security & Performance
* **Zero Hardcoded Secrets:** Strict environment variable isolation (`.env.local` strictly excluded from git).
* **Row-Level Security (RLS):** Supabase database policies protecting topics, student access codes, and practice sessions.
* **IP Rate Limiting & Auth Guard:** In-memory sliding window rate limiter on uploads and authentication endpoints.
* **Automated Security Test Suite:** 23 passing tests covering rate limits, parameter clamping, SQL injection prevention, and code validation.

---

## 🛠️ Architecture & Tech Stack

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                               │
│  ┌───────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │ Web Speech (TTS)      │  │ SpeechRecognition  │  │ MediaRecorder   │  │
│  │ (Accents & Speeds)    │  │ (Collocation HUD)  │  │ (96kbps Audio)  │  │
│  └───────────────────────┘  └────────────────────┘  └─────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Next.js 16 (App Router / TypeScript)                   │
│  - Tailwind CSS 4 + Lucide Icons + Canvas-Confetti                       │
│  - Student Access Guard & Teacher Session Auth                           │
│  - Dynamic SSR & Interactive Client Studio                               │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Supabase Cloud (PostgreSQL)                         │
│  - PostgreSQL Database: `topics`, `students`, `practice_sessions`        │
│  - Storage Bucket: `practice-recordings`                                 │
│  - Row Level Security (RLS) & Service Role Administration                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Getting Started

### 1. Prerequisites
* **Node.js**: v18+ or v20+
* **npm** / **yarn** / **pnpm**
* **Supabase Project** (free tier supported)

### 2. Installation
```bash
# Clone repository
git clone https://github.com/HoangLeAnhTuan/HappyLearning.git
cd HappyLearning

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory (refer to `.env.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Database Setup
Run the SQL migration located in `supabase/schema.sql` in your Supabase SQL Editor.

### 5. Running the Application
```bash
# Start local development server
npm run dev

# Run security test suite
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Security & Quality Verification

```bash
$ npm test
=================================================
🔒 RUNNING HAPPYLEARNING SECURITY & AUTH TEST SUITE
=================================================
  ✅ PASS: IP Detection & Headers
  ✅ PASS: IP Rate Limiter
  ✅ PASS: Mass Assignment & Value Clamping
  ✅ PASS: Student Access Code Security
=================================================
SUMMARY: 23 passed, 0 failed
=================================================
```

---

## 📦 Version History

* **`v1.0.0` (Official Release):**
  * Complete 7-step IELTS Speaking Part 2 interactive learning system.
  * Speaker & Listener dual practice studio with TTS pronunciation and 96kbps audio recording.
  * Supabase Storage bucket integration with two-way sync for practice sessions.
  * Teacher portal with student access code system, visual topic editor, smart pop-up audio player, and permanent delete tools.
  * Clean UI without layout shifts, rate limits, and full test coverage.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
