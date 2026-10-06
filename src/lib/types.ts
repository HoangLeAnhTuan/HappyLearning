export interface CueCard {
  prompt: string;
  bullet_points: string[];
}

export interface StepOption {
  label: string;
  text: string;
}

export interface Step {
  step: number;
  title: string;
  coach_tip: string;
  templates?: string[];
  options?: StepOption[];
  follow_up?: string;
}

export interface CollocationCategory {
  category: string;
  color?: string;
  items: string[];
}

export interface Topic {
  id: string;
  slug: string;
  title: string;
  cue_card: CueCard;
  steps: Step[];
  collocations: CollocationCategory[];
  motivational_quotes: string[];
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  name: string;
  class_name: string;
  access_code: string;
  created_by?: string | null;
  created_at: string;
  practice_count?: number;
}

export interface PracticeSession {
  id: string;
  topic_id: string;
  student_id?: string | null;
  student_nickname: string;
  class_name?: string | null;
  role: "speaker" | "listener" | "solo" | "pair";
  duration_seconds: number;
  collocations_heard_count: number;
  audio_url?: string | null;
  storage_path?: string | null;
  created_at: string;
  topics?: {
    title: string;
    slug: string;
  };
  students?: {
    name: string;
    class_name: string;
    access_code: string;
  };
}
