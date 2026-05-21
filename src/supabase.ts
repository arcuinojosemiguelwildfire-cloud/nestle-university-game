import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Supabase integration is inactive.');
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

export interface ScoreSaveResult {
  success: boolean;
  error?: string;
  data?: any;
}

export async function savePlayerScore(
  firstName: string,
  surname: string,
  score: number
): Promise<ScoreSaveResult> {
  const supabase = getSupabase();
  if (!supabase) {
    console.info('Supabase not configured. Score was not saved to database.');
    return {
      success: false,
      error: 'Supabase credentials are not configured in your environment.'
    };
  }

  const fName = firstName.trim();
  const sName = surname.trim();

  try {
    const { data, error } = await supabase
      .from('player_scores')
      .insert([
        {
          first_name: fName,
          surname: sName,
          score: score,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Database Error:', error);
      return { success: false, error: error.message };
    }

    console.log('Successfully stored score in Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Supabase Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
