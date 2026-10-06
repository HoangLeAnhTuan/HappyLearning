-- ==============================================================================
-- HAPPYLEARNING DATABASE SCHEMA (IDEMPOTENT & PRODUCTION HARDENED)
-- PostgreSQL Schema with Strict Row Level Security (RLS) & Student Access Codes
-- ==============================================================================

-- 1. Topics Table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    cue_card JSONB NOT NULL,
    steps JSONB NOT NULL,
    collocations JSONB NOT NULL,
    motivational_quotes TEXT[] DEFAULT ARRAY[
        'Every word you speak makes you stronger!',
        'Mistakes are proof that you are learning!',
        'Small steps every day = big results!',
        'Speak with confidence – you have got this!',
        'Practice today, shine in the exam!'
    ],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Students Table (Student Access Code System)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    access_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist in students if table was created previously
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS access_code TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Index for fast access code lookups during student sign-in
CREATE INDEX IF NOT EXISTS idx_students_access_code ON public.students(access_code);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON public.students(class_name);

-- 3. Practice Sessions Table
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_nickname TEXT DEFAULT 'Học viên',
    class_name TEXT,
    role TEXT CHECK (role IN ('speaker', 'listener', 'solo', 'pair')),
    duration_seconds INT DEFAULT 120,
    collocations_heard_count INT DEFAULT 0,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Migration helper: Safely add missing columns to practice_sessions if table already existed
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS student_nickname TEXT DEFAULT 'Học viên';
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 120;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS collocations_heard_count INT DEFAULT 0;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 5. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_id ON public.practice_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_topic_id ON public.practice_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at ON public.practice_sessions(created_at DESC);

-- ==============================================================================
-- 6. Enable Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 7. Row Level Security Policies (Production Hardened)
-- ==============================================================================

-- --- Topics Policies ---
-- Public can read topics
DROP POLICY IF EXISTS "Public read topics" ON public.topics;
CREATE POLICY "Public read topics" ON public.topics 
  FOR SELECT 
  USING (true);

-- Only authenticated teachers can insert/update/delete topics
DROP POLICY IF EXISTS "Teacher manage topics" ON public.topics;
CREATE POLICY "Teacher manage topics" ON public.topics 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- --- Students Policies ---
-- Strictly authenticated teachers only for students table direct access
-- Public student verification is securely routed through server endpoint with rate limiting
DROP POLICY IF EXISTS "Public lookup student by access_code" ON public.students;
DROP POLICY IF EXISTS "Teacher manage students" ON public.students;
CREATE POLICY "Teacher manage students" ON public.students 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- --- Practice Sessions Policies ---
-- Public insertion permitted for logging practice
DROP POLICY IF EXISTS "Public insert practice" ON public.practice_sessions;
CREATE POLICY "Public insert practice" ON public.practice_sessions 
  FOR INSERT 
  WITH CHECK (true);

-- Only authenticated teachers can view student practice logs directly
DROP POLICY IF EXISTS "Teacher view practice" ON public.practice_sessions;
CREATE POLICY "Teacher view practice" ON public.practice_sessions 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- ==============================================================================
-- 8. Supabase Storage Bucket Setup (Audio 96kbps ~1.4MB/recording)
-- ==============================================================================
-- Automatically created via API or can be initialized manually with SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'practice-recordings',
  'practice-recordings',
  true,
  15728640, -- 15MB limit per audio file
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a'];

-- Storage bucket RLS policies
DROP POLICY IF EXISTS "Public Access Audio" ON storage.objects;
CREATE POLICY "Public Access Audio" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'practice-recordings');

DROP POLICY IF EXISTS "Public Upload Audio" ON storage.objects;
CREATE POLICY "Public Upload Audio" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'practice-recordings');
