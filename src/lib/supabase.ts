import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  )
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (for API routes)
// Use ANON_KEY since RLS policies allow public insert/read
// SERVICE_ROLE_KEY is optional and only needed for admin operations
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  // Check if SERVICE_ROLE_KEY is valid (not placeholder)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const isValidServiceKey = serviceRoleKey && 
    serviceRoleKey.startsWith('eyJ') && 
    serviceRoleKey.length > 50

  // Use service role key only if it's valid, otherwise use anon key
  // ANON key works fine because RLS policies allow public access
  const key = isValidServiceKey ? serviceRoleKey : anonKey

  if (!supabaseUrl || !key) {
    console.error('⚠️ Missing Supabase credentials for server client')
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

