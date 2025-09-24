"use client";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "../env";
import type { Database } from '@/types/database.types';

export const supabase = createClient<Database>(
  ENV.SUPABASE_URL!, 
  ENV.SUPABASE_ANON_KEY!
);
