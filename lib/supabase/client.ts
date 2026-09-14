import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let clientInstance: any = null

export function createClient() {
  if (!clientInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or Anon Key is missing. Please set environment variables.')
    }
    clientInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  }
  return clientInstance
}

export const supabase = createClient()