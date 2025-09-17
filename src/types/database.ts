/**
 * Database table types
 */

export interface User {
  id: string;
  clerk_user_id: string;
  email?: string;
  display_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  timezone?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id: string;
  type: string;
  level: string;
  prompt: string;
  target_lang: string;
  media_url?: string;
  explanation?: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  question_id: string;
  audio_url?: string;
  transcript?: string;
  feedback?: string;
  score?: number;
  created_at?: string;
  completed_at?: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  date: string;
  minutes_practiced: number;
  created_at?: string;
  updated_at?: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  best_streak: number;
  last_activity_date?: string;
  created_at?: string;
  updated_at?: string;
}