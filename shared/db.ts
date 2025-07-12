import { createClient } from '@supabase/supabase-js'

/**
 * Shared Supabase client instance used on both front-end and back-end.
 * Uses public anon key which is safe for client-side usage.
 */
export const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
)
