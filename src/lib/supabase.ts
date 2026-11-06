import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client, created lazily so the demo bundle stays small.
 * Credentials come from .env.local (never commit it). Only the public
 * "publishable" key belongs here: the secret / service_role key must never
 * reach the browser or the chat.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const backendConfigured = Boolean(url && key)
export const backendHost = url ? url.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null

let client: Promise<SupabaseClient> | null = null

export function getSupabase(): Promise<SupabaseClient> {
  if (!backendConfigured) return Promise.reject(new Error('Backend non configurato: manca .env.local'))
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }),
  )
  return client
}

/** Reads the public list of Habitats: proves URL, key, schema and RLS are all in place. */
export async function checkBackend(): Promise<{ ok: boolean; detail: string }> {
  if (!backendConfigured) return { ok: false, detail: 'Non collegato: aggiungi VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY in .env.local' }
  try {
    const sb = await getSupabase()
    const { count, error } = await sb.from('habitats').select('name', { count: 'exact', head: true })
    if (error) {
      // anon users can't read habitats (RLS: authenticated only): reaching the API is enough
      if (error.code === '42501' || /permission|not allowed|JWT/i.test(error.message)) return { ok: true, detail: `Collegato a ${backendHost} (regole di sicurezza attive)` }
      if (error.code === '42P01' || /does not exist|schema cache/i.test(error.message)) return { ok: false, detail: 'Collegato, ma le tabelle mancano: esegui “npx supabase db push”' }
      return { ok: false, detail: error.message }
    }
    return { ok: true, detail: `Collegato a ${backendHost}${count !== null ? ` · ${count} habitat` : ''}` }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'Errore di rete' }
  }
}
