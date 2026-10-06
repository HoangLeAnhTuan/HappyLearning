# IELTS Speaking Part 2 Interactive Web App (MVP)
## Master Architecture, Setup Guide & Vibe-Coding Plan for Claude Code
**GitHub Repository:** [https://github.com/HoangLeAnhTuan/HappyLearning](https://github.com/HoangLeAnhTuan/HappyLearning)

---

## 1. Executive Summary & Product Vision

This project transforms two standalone static HTML educational tools (created by teacher Tracey Le for IELTS Speaking Part 2) into a modern, full-stack, responsive web application ready for free deployment on **Vercel** with a **Supabase** backend.

### Original Foundation Analysis
From the two source HTML files:
1. **Take-Home Outline + Pronunciation (`Input Mode`)**:
   - Structured 7-step scaffolding for IELTS Speaking Part 2.
   - Interactive gap-fill dropdowns (`[[option1|option2]]`) allowing students to customize their own story.
   - Text-to-Speech engine (`SpeechSynthesis`) with accent selection (US, UK, AU) and speed control (Slow, Normal, Fast).
   - Highlighting high-yield band-boosting collocations.
2. **Show Time (`Output & Performance Mode`)**:
   - 2-minute visual circular timer with warning milestones (yellow at 30s, red at 10s, beep sound at 0s).
   - Role swapping: **Speaker** (checks off speech structure items) vs. **Listener** (tracks heard collocations).
   - In-browser microphone recorder (`MediaRecorder`) for solo practice and local audio download.

### MVP Expansion Goals
- **Multi-Topic Support**: Dynamic topics loaded from Supabase rather than hardcoded to a single device prompt.
- **Teacher Admin CRUD**: A dedicated dashboard for teachers to create and edit new topics, cue cards, 7-step outlines, and collocations.
- **Hybrid Collocation Tracking**: Retain manual listener tapping while adding experimental in-browser **Speech-to-Text (Web Speech Recognition)** to auto-highlight spoken collocations in real-time.
- **Zero-Cost Deployment**: Built for 100% free hosting on Vercel Hobby + Supabase Free Tier (local-only audio recording blobs to preserve Supabase's 1GB storage cap).

---

## 2. System Architecture & Tech Stack

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                               │
│  ┌───────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │ Web Speech (TTS)      │  │ SpeechRecognition  │  │ MediaRecorder   │  │
│  │ (Accents & Speeds)    │  │ (Auto Collocations)│  │ (Local Blobs)   │  │
│  └───────────────────────┘  └────────────────────┘  └─────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Next.js 15 (App Router / TypeScript)                   │
│  - Tailwind CSS + Lucide Icons + Canvas-Confetti                         │
│  - Student Routes (Instant Guest Access, No Login Barrier)               │
│  - Teacher Admin Routes (Supabase Email/Password Auth Protected)         │
│  - SSR & Client Components with @supabase/ssr                            │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Supabase Cloud (Free Tier)                          │
│  - PostgreSQL Database: `topics`, `practice_sessions`                    │
│  - Supabase Auth: Teacher login (Email/Password)                         │
└──────────────────────────────────────────────────────────────────────────┘
```

| Component | Choice | Reason & Cost |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | Zero-configuration deploy on Vercel, modern SSR/CSR split. |
| **Styling** | Tailwind CSS + Lucide React | Clean, responsive UI with energetic color palette from the original app. |
| **Database** | Supabase (PostgreSQL) | Free tier (500MB DB), handles relational data & JSONB outlines effortlessly. |
| **Auth** | Supabase Auth (Email/Password) | Used for Teacher Admin access; students enter as guests without barriers. |
| **Audio Playback** | Web Speech API (`speechSynthesis`) | Built-in to browsers, zero API costs, supports US/UK/AU accents. |
| **Speech-to-Text** | `webkitSpeechRecognition` / Web Speech API | Client-side real-time transcript matching for collocations. |
| **Audio Recorder** | Web `MediaRecorder` API | Keeps recordings in browser memory; downloadable as `.webm`/`.m4a`. |
| **Hosting** | Vercel Free (Hobby) | Seamless GitHub integration, automatic SSL, serverless scalability. |

---

## 3. Database Schema (Supabase SQL)

Run this SQL script in the Supabase **SQL Editor** or let Claude Code run it via Supabase MCP:

```sql
-- 1. Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    cue_card JSONB NOT NULL, -- { prompt: string, bullet_points: string[] }
    steps JSONB NOT NULL,    -- Array of 7 step objects (cards, gaps, tips)
    collocations JSONB NOT NULL, -- Array of { category: string, color: string, items: string[] }
    motivational_quotes TEXT[] DEFAULT ARRAY[
        '💪 Every word you speak makes you stronger!',
        '🌟 Mistakes are proof that you’re learning!',
        '🚀 Small steps every day = big results!',
        '🎤 Speak with confidence – you’ve got this!',
        '🏆 Practice today, shine in the exam!'
    ],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Practice Sessions Table (Anonymous/Guest Logging)
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    student_nickname TEXT DEFAULT 'Anonymous',
    role TEXT CHECK (role IN ('solo', 'pair')),
    duration_seconds INT DEFAULT 120,
    collocations_heard_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- Public can read topics and create practice session logs
CREATE POLICY "Public read topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Public insert practice" ON public.practice_sessions FOR INSERT WITH CHECK (true);

-- Authenticated teachers can insert/update/delete topics
CREATE POLICY "Teacher manage topics" ON public.topics 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## 4. Supabase MCP Setup with Claude Code

If using **Claude Code CLI** to let the AI run queries and inspect the database directly:

1. Project Ref: `bzamzvlbfmxshmoujefn`
2. Generate a **Personal Access Token** at: `Supabase Dashboard -> Account -> Access Tokens`.
3. Link the MCP server in your project root terminal:

```bash
claude mcp add supabase -- npx -y @supabase/mcp-server --access-token <YOUR_ACCESS_TOKEN> --project-ref bzamzvlbfmxshmoujefn
```

*(Note: If you prefer not to use MCP, simply copy the SQL above into the Supabase Web SQL Editor).*

---

## 5. Step-by-Step Project Setup Guide

### Step 1: Initialize Next.js Project
Run the following in your workspace:
```bash
npx create-next-app@latest ielts-showtime \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --use-npm

cd ielts-showtime

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr lucide-react canvas-confetti
npm install -D @types/canvas-confetti
```

### Step 2: Configure Environment Variables
Verify `.env.local` in the project root (already configured locally):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Setup Supabase Browser & Server Clients
Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handled in middleware/server component contexts
          }
        },
      },
    }
  )
}
```

---

## 6. Seed Data (Porting the Original "Electronic Device" Topic)

Create a seed script `src/lib/seed-data.json` containing the original content:

```json
{
  "slug": "describe-an-electronic-device-you-use-often",
  "title": "Describe an electronic device you use often",
  "cue_card": {
    "prompt": "Describe an electronic device you use often",
    "bullet_points": [
      "⏳ How long you have had it",
      "📅 How often you have used it",
      "🛠️ What you have used it for",
      "💡 Why you use it so often"
    ]
  },
  "steps": [
    {
      "step": 1,
      "title": "👋 Introduction",
      "coach_tip": "Start with a big smile – confidence begins here! 😄",
      "templates": [
        "When it comes to [[an electronic device I use often]], my [[smartphone|laptop]] is the first one that comes to my mind."
      ]
    },
    {
      "step": 2,
      "title": "⏳ How long have you had it?",
      "coach_tip": "Share your story – it’s yours, so it’s easy! 🎁",
      "options": [
        {
          "label": "🎁 Option 1: A present",
          "text": "{{As far as I remember}}, it was a present from my [[parents|sister|uncle|best friend]] to congratulate me on [[my birthday|passing an exam|my graduation]]."
        },
        {
          "label": "🛍️ Option 2: I bought it",
          "text": "{{As far as I remember}}, I bought it in a [[mobile|laptop]] shop [[last year|a few years ago|when I was in high school]]."
        }
      ],
      "follow_up": "And it has been with me {{for quite a while now}}. In fact, I use it [[{{almost every single day}}|on a regular basis]]."
    },
    {
      "step": 3,
      "title": "🔋 Quick info",
      "coach_tip": "Honest and simple wins every time 👍",
      "options": [
        {
          "label": "👍 Option 1: All good",
          "text": "{{The good news is that}} it’s still working fine, so I really can’t complain about its [[quality|durability]]."
        },
        {
          "label": "👎 Option 2: A downside",
          "text": "{{The only downside is that}} [[the battery life has deteriorated over time|it’s running out of storage space|it tends to lag if I run too many programs at the same time]]. So, I guess {{it’s only a matter of time}} before I upgrade to a newer model."
        }
      ]
    },
    {
      "step": 4,
      "title": "✨ Describe your device",
      "coach_tip": "Paint a picture with your words! 🎨",
      "options": [
        {
          "label": "🆕 Option 1: Latest model",
          "text": "{{Talking about}} its appearance, it was {{the latest model}} on the market at that time. {{What really blew me away was}} its [[eye-catching design|sleek look|cutting-edge technology]]. What’s more, because it’s pretty [[lightweight]], I can easily fit it into my bag when I’m {{on the move}}."
        },
        {
          "label": "📼 Option 2: Second-hand / old",
          "text": "{{Talking about}} its appearance, it was [[a {{second-hand purchase}}|an old model]]. However, {{what really blew me away was}} its timeless design, which still looks just as good as the newer versions. What’s more, because it has a [[{{user-friendly interface}}]], I can {{navigate through}} all my apps and tasks effortlessly."
        }
      ]
    },
    {
      "step": 5,
      "title": "🛠️ What do you use it for?",
      "coach_tip": "Show off your vocabulary – you’ve got this! 💪",
      "templates": [
        "{{To be honest}}, this device has become an important part of my life.",
        "{{First and foremost}}, I mainly use it to [[take online classes|complete homework and assignments|keep track of deadlines|look up new words in the dictionary|search for learning materials]].",
        "{{On top of that}}, it’s my go-to device to [[binge-watch my favorite series|scroll through social media|wind down after a stressful day]].",
        "It also {{comes in handy}} when I want to [[keep in touch with my family and friends|keep up with the latest news]]."
      ]
    },
    {
      "step": 6,
      "title": "💖 Why do you use it so often?",
      "coach_tip": "Speak from the heart – the examiner can feel it! 💖",
      "templates": [
        "{{Ultimately}}, the reason why I use it so often is because it’s [[extremely convenient|really handy|a huge time-saver]]. {{To be honest}}, it has made my life so much easier and I can’t imagine my life without it."
      ]
    },
    {
      "step": 7,
      "title": "🎬 Closing sentence",
      "coach_tip": "Finish strong and leave a great impression! 🏆",
      "templates": [
        "All in all, {{I can confidently say that}} this device is {{hands down}} the best investment I’ve ever made."
      ]
    }
  ],
  "collocations": [
    {
      "category": "⏳ Start: how long & how often",
      "color": "#ff8a3d",
      "items": ["As far as I remember", "almost every single day", "for quite a while now"]
    },
    {
      "category": "🔋 Quick info",
      "color": "#1fb87a",
      "items": ["The good news is that", "The only downside is that", "it’s only a matter of time"]
    },
    {
      "category": "✨ Appearance",
      "color": "#9b5de5",
      "items": ["Talking about", "the latest model", "What really blew me away was", "on the move", "second-hand purchase", "user-friendly interface", "navigate through"]
    },
    {
      "category": "🛠️ Functions",
      "color": "#2bb3ff",
      "items": ["To be honest", "First and foremost", "On top of that", "comes in handy"]
    },
    {
      "category": "💖 Why + Closing",
      "color": "#ff5d8f",
      "items": ["Ultimately", "I can confidently say that", "hands down"]
    }
  ]
}
```

---

## 7. Key Feature Implementation Details

### A. Dynamic Gap-Selector Component (`GapText.tsx`)
Parses `[[option1|option2]]` into interactive, keyboard-accessible dropdown chips that cycle choices on click, and parses `{{collocation}}` into highlighted `<mark>` tags.

### B. Text-to-Speech Controller (`useSpeech.ts`)
- Wraps `window.speechSynthesis`.
- Tracks currently playing sentence and highlights its container element.
- Provides accent switching: `en-US`, `en-GB`, `en-AU` with pitch/rate adjustment.

### C. 2-Minute Circular Timer & Audio Recorder (`ShowTimeTimer.tsx` & `AudioRecorder.tsx`)
- SVG circular stroke dash offset formula: `565.5 * (1 - timeLeft / 120)`.
- Color thresholds:
  - $> 30s$: `#3ddc97` (Green)
  - $10s - 30s$: `#ffb703` (Yellow warning + "Finish strong with your closing sentence!")
  - $< 10s$: `#ff3d3d` (Red alert + Beep sound via Web Audio API oscillator)
- `AudioRecorder`: Uses `MediaRecorder` with `audio/webm` or `audio/mp4`, provides instant playback and local download (`my-speaking-practice.webm`).

### D. Hybrid Collocation Detection (`useSpeechRecognition.ts`)
- Initializes `window.webkitSpeechRecognition` with `continuous: true` and `interimResults: true`.
- Normalizes spoken words (lowercase, strip punctuation).
- Automatically marks matched collocations from the 20-word bank while still allowing the manual listener click fallback.
- Triggers `canvas-confetti` when $> 10$ collocations are detected or heard.

---

## 8. Vibe-Coding Prompts for Claude Code

Execute the project sequentially by feeding the following prompts to **Claude Code**:

### 🎯 Prompt 1: Project Skeleton & Database Connection
> "I want to build an IELTS Speaking Part 2 interactive web app using Next.js 15 App Router, Tailwind CSS, and Supabase.
> 1. Verify that `@supabase/supabase-js`, `@supabase/ssr`, and `lucide-react` are installed.
> 2. Create the Supabase client utilities in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`.
> 3. Read the schema from `PLAN.md` and verify or create the `topics` table in Supabase.
> 4. Create a seed script or route to insert the default 'electronic device' topic from `PLAN.md` into the database."

### 🎯 Prompt 2: Outline & Pronunciation Page (`/topic/[slug]/outline`)
> "Build the 'Take-home Outline + Pronunciation' page under `src/app/topic/[slug]/outline/page.tsx`:
> 1. Render the top motivation banner with animated rotating quotes.
> 2. Display the 7-step outline cards. Parse `[[optionA|optionB]]` into clickable interactive gap-pill buttons that cycle through choices when clicked. Highlight `{{collocations}}` in yellow badge marks.
> 3. Implement the top audio control bar: Accent selector (US, UK, AU), Speed selector (0.7x, 0.9x, 1.1x), 'Play Whole Answer', 'Play Step', and 'Stop'.
> 4. Use Web Speech Synthesis with smooth scrolling and high-contrast sentence highlighting while playing."

### 🎯 Prompt 3: Show Time Mode with Timer & Auto-Collocations (`/topic/[slug]/showtime`)
> "Build the 'Show Time' practice screen under `src/app/topic/[slug]/showtime/page.tsx`:
> 1. Role switcher header: 'Speaker: A' vs 'Listener: B' with a 'Swap roles' button.
> 2. 2-minute SVG circular countdown timer with audio beep alert and color shifting at 30s and 10s.
> 3. Audio recorder using MediaRecorder for solo practice with in-memory preview and local file download.
> 4. Speaker checklist with animated progress bar.
> 5. Listener Collocations grid (20 collocations grouped into 5 categories).
> 6. Add Web Speech Recognition (`webkitSpeechRecognition`) so that when the speaker talks, matching collocations are automatically highlighted in real time, while keeping manual click functionality as a fallback."

### 🎯 Prompt 4: Topic Gallery & Teacher Admin Dashboard
> "Create the following supporting routes:
> 1. Home page (`src/app/page.tsx`): Displays available topics as vibrant cards with quick links to 'Study Outline' or 'Show Time'.
> 2. Teacher Admin page (`src/app/admin/page.tsx`): A form protected by Supabase Auth (or an admin passcode) allowing teachers to create new IELTS Speaking Part 2 topics with custom cue cards, steps, and collocations."

---

## 9. Vercel Deployment Checklist

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: complete IELTS Speaking MVP"
   git branch -M main
   git remote add origin https://github.com/HoangLeAnhTuan/HappyLearning.git
   git push -u origin main
   ```
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Select your repository.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
5. Click **Deploy**. Vercel will complete the build and assign your free live domain (`https://your-project.vercel.app`).
