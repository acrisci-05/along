/* Controllo dell'accesso: fa quello che fa l'app quando inserisci l'email e stampa la risposta vera.
   Uso: npm run check:auth -- tua@email.it   (legge VITE_SUPABASE_URL e la publishable key da .env.local) */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const file = process.env.ENV_FILE ?? '.env.local'
if (!fs.existsSync(file)) {
  console.log(`✗ Non trovo ${file} nella cartella attuale (${process.cwd()}).`)
  process.exit(1)
}
const env = Object.fromEntries(
  fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => /^\s*VITE_/.test(l)).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  }),
)
const url = env.VITE_SUPABASE_URL ?? ''
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
console.log('Indirizzo letto da .env.local:', JSON.stringify(url))
const problems = []
if (!url) problems.push('manca VITE_SUPABASE_URL')
if (/["'\s]/.test(url)) problems.push('l’indirizzo contiene virgolette o spazi: toglili')
if (url && !/^https?:\/\/[^/]+$/.test(url)) problems.push('l’indirizzo deve essere solo https://xxxx.supabase.co, senza niente dopo')
if (!key) problems.push('manca VITE_SUPABASE_PUBLISHABLE_KEY')
if (/["'\s]/.test(key)) problems.push('la chiave contiene virgolette o spazi: toglili')
if (/^sb_secret_|service_role/.test(key)) problems.push('ATTENZIONE: hai messo la chiave SEGRETA. Usa la Publishable key e rigenera la segreta su Supabase')
console.log('Chiave:', key ? `${key.slice(0, 15)}… (${key.length} caratteri)` : '(assente)')
if (problems.length) {
  problems.forEach((p) => console.log('✗', p))
  process.exit(1)
}

try {
  const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
  const body = await r.text()
  console.log(r.ok ? '✓ Server e chiave OK' : `✗ Server raggiunto ma risponde ${r.status}: ${body.slice(0, 200)}`)
  if (!r.ok) process.exit(1)
} catch (e) {
  console.log('✗ Server non raggiungibile:', e.cause?.code ?? e.message)
  process.exit(1)
}

const email = process.argv[2]
if (!email) {
  console.log('Per provare anche l’invio dell’email: npm run check:auth -- tua@email.it')
  process.exit(0)
}
const sb = createClient(url, key, { auth: { persistSession: false } })
const t = Date.now()
const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: 'http://localhost:5173' } })
const s = ((Date.now() - t) / 1000).toFixed(1)
if (!error) console.log(`✓ Email inviata a ${email} in ${s} s. Controlla la posta (anche lo spam).`)
else {
  console.log(`✗ Invio fallito dopo ${s} s → ${error.status ?? '-'} · ${error.message}`)
  if (/sending/i.test(error.message)) console.log('  → Supabase non riesce a spedire: controlla Authentication → Emails → SMTP Settings (o spegni Enable custom SMTP).')
  if (error.status === 429 || /rate limit|security purposes/i.test(error.message)) console.log('  → Troppe richieste: aspetta qualche minuto.')
}
