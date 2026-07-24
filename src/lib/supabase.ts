import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'momentum-board-auth',
      flowType: 'implicit',
    },
    global: {
      headers: { 'x-client-info': 'momentum-board/1.0' },
    },
  },
)

export async function getOrCreateSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      return session
    }
  } catch {
    // Session retrieval failed, continue to refresh/create
  }

  try {
    const { data: refreshData } = await supabase.auth.refreshSession()
    if (refreshData?.session?.user?.id) {
      return refreshData.session
    }
  } catch {
    // Refresh failed (no stored refresh token), continue to create
  }

  const { data, error: signInError } = await supabase.auth.signInAnonymously()
  if (signInError) throw new Error(`Authentication failed: ${signInError.message}`)
  return data.session
}
