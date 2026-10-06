# CLAUDE.md - Project Instructions for Claude Code

> **CRITICAL SECURITY DIRECTIVE - ZERO SECRET LEAKS:**
> - Never commit or push `.env`, `.env.local`, `.env*.local`, or any file containing secret API keys (`sb_secret_...`, `SUPABASE_SERVICE_ROLE_KEY`) to GitHub.
> - Ensure `.env.local` remains strictly ignored in `.gitignore` at all times.
> - Secrets must only be accessed via environment variables and never hardcoded in client-side code or public files.

---

## Project Overview
- **Project Name:** HappyLearning (Interactive English Speaking Web App)
- **GitHub Repository:** [https://github.com/HoangLeAnhTuan/HappyLearning](https://github.com/HoangLeAnhTuan/HappyLearning)
- **Deployment:** Vercel (Hobby Free Tier)
- **Backend:** Supabase (Free Tier PostgreSQL + Auth)
- **Master Plan:** Follow all architectural and component specifications in `PLAN.md`.

---

## Tech Stack & Architecture
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS + Lucide React Icons
- **Database:** Supabase PostgreSQL via `@supabase/ssr` and `@supabase/supabase-js`
- **Audio & Speech:**
  - Browser Text-to-Speech (`window.speechSynthesis`) for model pronunciation (US, UK, AU).
  - Browser Speech-to-Text (`webkitSpeechRecognition` / `SpeechRecognition`) for automated real-time collocation detection.
  - Browser `MediaRecorder` for in-memory audio recording, playback, and local file download (No cloud storage consumption).

---

## Core Guidelines & Conventions
1. **Student Mode (No Auth Barrier):** Students must be able to access topics, study outlines, and practice "Show Time" immediately without login.
2. **Teacher Mode (Auth Protected):** Use Supabase Auth (Email + Password) to protect `/admin` routes for creating/editing topics.
3. **Audio Handling:** Always store recordings in client memory (`Blob` / `URL.createObjectURL`). Do NOT upload audio files to Supabase Storage in order to stay within the 1GB free tier limit.
4. **Seed Topic:** Use the "Describe an electronic device you use often" seed data defined in `PLAN.md`.

---

## Key Development Commands
```bash
# Run local dev server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

---

## Execution Flow
Refer to **Section 8 of `PLAN.md`** to implement the application in 4 sequential milestones:
1. **Prompt 1:** Project Skeleton & Supabase Client/Database Setup
2. **Prompt 2:** Take-Home Outline + Pronunciation Page (`/topic/[slug]/outline`)
3. **Prompt 3:** Show Time Mode with Timer, Audio Recorder, and Collocation Tracking (`/topic/[slug]/showtime`)
4. **Prompt 4:** Topic Gallery (`/`) & Teacher Admin CRUD Dashboard (`/admin`)
