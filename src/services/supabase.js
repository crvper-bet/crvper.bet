import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 'https://kxckzzuhdjptcdtvecwy.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_bfCK-qaKn0eTnLeKqaYgVA_1d9UVcAI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Add them to your .env file to enable Supabase features.'
  );
}

// Create client only when credentials are available
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export default supabase;
