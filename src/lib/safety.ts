/** Lightweight, on-device message checks. Heuristics only: they warn, never read for anyone else. */

export type OutgoingRisk = 'phone' | 'address' | 'social'
export type IncomingRisk = 'money' | 'code' | 'photo' | 'offapp'

const PHONE = /(\+?\d[\d\s.-]{7,}\d)/
const ADDRESS = /\b(via|viale|vico|vicolo|piazza|corso|largo|salita|calata)\s+[A-ZÀ-Üa-zà-ü'. ]{2,40}\s*,?\s*\d{1,4}\b/i
const SOCIAL = /(@[a-z0-9_.]{3,})|\b(instagram|insta|ig|telegram|whatsapp|snap(chat)?|tiktok)\b/i

export function scanOutgoing(text: string): OutgoingRisk | null {
  if (PHONE.test(text)) return 'phone'
  if (ADDRESS.test(text)) return 'address'
  if (SOCIAL.test(text)) return 'social'
  return null
}

const MONEY = /\b(soldi|bonifico|ricarica|ricaricami|paypal|iban|prestito|prestami|postepay|satispay|bitcoin|crypto)\b|\d+\s?(€|euro)\b.*\b(mandami|prestami|ricaric|serv)/i
const CODE = /\b(codice|otp|pin|verifica|password)\b.*\b(mandami|dimmi|inviami|leggimi|girami)\b|\b(mandami|dimmi|inviami|girami)\b.*\b(codice|otp|pin)\b/i
const PHOTO = /\b(foto|pic|video)\b.*\b(nud[aoei]|intim[aei]|senza vestiti|hot|osé|spinte?)\b/i
const OFFAPP = /\b(scrivimi|sentiamoci|passiamo|continuiamo|aggiungimi)\b.*\b(whatsapp|telegram|instagram|snap(chat)?|signal)\b/i

export function scanIncoming(text: string): IncomingRisk | null {
  if (MONEY.test(text)) return 'money'
  if (CODE.test(text)) return 'code'
  if (PHOTO.test(text)) return 'photo'
  if (OFFAPP.test(text)) return 'offapp'
  return null
}

export const OUTGOING_COPY: Record<OutgoingRisk, { title: string; body: string }> = {
  phone: { title: 'Stai per condividere un numero di telefono', body: 'Va bene se ti fidi. Molte persone aspettano di essersi viste almeno una volta prima di dare il numero.' },
  address: { title: 'Stai per condividere un indirizzo', body: 'Per i primi incontri è meglio un luogo pubblico. Evita di dare l’indirizzo di casa o del lavoro.' },
  social: { title: 'Stai per condividere un contatto social', body: 'Dal tuo profilo social si possono scoprire molte cose su di te. Condividilo solo se ti senti tranquill*.' },
}

export const INCOMING_COPY: Record<IncomingRisk, string> = {
  money: 'Ti ha chiesto soldi o una ricarica. Su ALONG nessuno dovrebbe chiederti denaro: è il segnale di truffa più comune.',
  code: 'Ti ha chiesto un codice. Non condividere mai codici di verifica o password: servono a rubare account.',
  photo: 'Ti ha chiesto foto intime. Non sei tenut* a mandare niente, e puoi segnalarlo.',
  offapp: 'Vuole spostare la conversazione su un’altra app. Spesso è un modo per evitare i controlli: valuta con calma.',
}

export const REPORT_REASONS = [
  'Profilo falso o truffa',
  'Molestie o messaggi offensivi',
  'Contenuti inappropriati',
  'Mi ha chiesto soldi',
  'Ha un’età diversa da quella dichiarata',
  'Altro',
] as const
