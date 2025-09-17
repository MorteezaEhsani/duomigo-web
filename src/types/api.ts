/**
 * API types and interfaces
 */

import { z } from 'zod';

// RPC Parameter Types
export interface GetOrCreateUserParams {
  p_clerk_user_id: string;
  p_email?: string;
  p_display_name?: string;
}

export interface UpsertDailyActivityParams {
  p_user_id: string;
  p_tz: string;
  p_now_ts: string;
  p_minutes: number;
}

// API Request/Response Schemas
export const PingRequestSchema = z.object({
  minutes: z.number().int().min(0).optional().default(1),
  timezone: z.string().optional()
});

export type PingRequest = z.infer<typeof PingRequestSchema>;

export const QuestionCreateSchema = z.object({
  type: z.string(),
  level: z.string(),
  prompt: z.string(),
  target_lang: z.string(),
  media_url: z.string().optional(),
  explanation: z.string().optional(),
  is_published: z.boolean().optional().default(true)
});

export type QuestionCreateRequest = z.infer<typeof QuestionCreateSchema>;

export const QuestionUpdateSchema = z.object({
  id: z.string().uuid(),
  type: z.string().optional(),
  level: z.string().optional(),
  prompt: z.string().optional(),
  target_lang: z.string().optional(),
  media_url: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  is_published: z.boolean().optional()
});

export type QuestionUpdateRequest = z.infer<typeof QuestionUpdateSchema>;

export const CustomPracticeRequestSchema = z.object({
  type: z.string(),
  level: z.string()
});

export type CustomPracticeRequest = z.infer<typeof CustomPracticeRequestSchema>;

export const GradeRequestSchema = z.object({
  attemptId: z.string().uuid(),
  audioUrl: z.string().url(),
  transcript: z.string(),
  targetPhrase: z.string(),
  language: z.string()
});

export type GradeRequest = z.infer<typeof GradeRequestSchema>;

export const AnalyzeRequestSchema = z.object({
  attemptId: z.string().uuid()
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const SignedUrlRequestSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'PUT']).optional().default('GET')
});

export type SignedUrlRequest = z.infer<typeof SignedUrlRequestSchema>;

// Response Types
export interface ApiResponse<T = unknown> {
  ok?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StreakInfo {
  current_streak: number;
  best_streak: number;
}

export interface GradeResult {
  success: boolean;
  attemptId: string;
  feedback?: {
    pronunciation: string;
    grammar: string;
    fluency: string;
    overall: string;
    score: number;
  };
}

export interface AnalysisResult {
  attemptId: string;
  analysis: string;
  score: number;
}