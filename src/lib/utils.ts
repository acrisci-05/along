import type { Category, Chat, MeStats, Plan, PlanStatus, User } from '../types'

export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const H = 3_600_000

export const CATEGORY_META: Record<Category, { label: string; emoji: string; tone: string; text: string; ring: string }> = {
  food: { label: 'Food', emoji: '🍜', tone: 'bg-coral/15', text: 'text-coral', ring: 'ring-coral/40' },
  drink: { label: 'Drink', emoji: '🍹', tone: 'bg-coral/15', text: 'text-coral', ring: 'ring-coral/40' },
  sport: { label: 'Sport', emoji: '🎾', tone: 'bg-lime/15', text: 'text-lime', ring: 'ring-lime/40' },
  cinema: { label: 'Cinema', emoji: '🎬', tone: 'bg-violet/20', text: 'text-violet-300', ring: 'ring-violet/40' },
  study: { label: 'Studio', emoji: '📚', tone: 'bg-cyan/15', text: 'text-cyan', ring: 'ring-cyan/40' },
  walk: { label: 'Camminata', emoji: '🌅', tone: 'bg-lime/15', text: 'text-lime', ring: 'ring-lime/40' },
  gaming: { label: 'Gaming', emoji: '🎮', tone: 'bg-violet/20', text: 'text-violet-300', ring: 'ring-violet/40' },
  music: { label: 'Musica', emoji: '🎧', tone: 'bg-violet/20', text: 'text-violet-300', ring: 'ring-violet/40' },
  books: { label: 'Libri', emoji: '📖', tone: 'bg-violet/20', text: 'text-violet-300', ring: 'ring-violet/40' },
  talk: { label: 'Chiacchiere', emoji: '🌙', tone: 'bg-violet/20', text: 'text-violet-300', ring: 'ring-violet/40' },
  travel: { label: 'Travel', emoji: '✈️', tone: 'bg-cyan/15', text: 'text-cyan', ring: 'ring-cyan/40' },
}

export const LOCAL_CATEGORIES: Category[] = ['food', 'drink', 'sport', 'cinema', 'study', 'walk']
export const REMOTE_CATEGORIES: Category[] = ['gaming', 'music', 'books', 'talk', 'travel']

export function planStatus(p: Plan, now = Date.now()): PlanStatus {
  if (p.confirmed) return 'CONFIRMED'
  if (p.when + 3 * H < now && !p.whenLabel) return 'EXPIRED'
  const left = p.capacity - p.participants.length
  if (left <= 0) return 'FULL'
  if (left === 1 || p.participants.length / p.capacity >= 0.75) return 'ALMOST FULL'
  return 'OPEN'
}

export const STATUS_STYLE: Record<PlanStatus, string> = {
  OPEN: 'bg-lime text-ink',
  'ALMOST FULL': 'bg-coral text-ink',
  FULL: 'bg-cream/15 text-cream',
  CONFIRMED: 'bg-cyan text-ink',
  EXPIRED: 'bg-cream/5 text-cream/40 line-through',
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

export function whenLabel(ts: number, now = Date.now()): string {
  const d = new Date(ts)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((new Date(d).setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000)
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (diffDays === 0) return `Stasera · ${hh}`.replace('Stasera', d.getHours() < 18 ? 'Oggi' : 'Stasera')
  if (diffDays === 1) return `Domani · ${hh}`
  if (diffDays === -1) return `Ieri · ${hh}`
  if (diffDays > 1 && diffDays < 7) return `${WEEKDAYS[d.getDay()]} · ${hh}`
  return `${d.getDate()}/${d.getMonth() + 1} · ${hh}`
}

export function planWhen(p: Plan, now = Date.now()) {
  return p.whenLabel ?? whenLabel(p.when, now)
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Scaduto'
  const h = Math.floor(ms / H)
  const m = Math.floor((ms % H) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  if (h >= 1) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export type BeamTone = 'cyan' | 'ember' | 'alarm' | 'lime' | 'violet'

export function timerTone(chat: Chat, now = Date.now()): BeamTone {
  if (chat.mode === 'remote' || !chat.deadline) return 'violet'
  if (chat.clockStopped) return 'lime'
  const left = chat.deadline - now
  if (left > 12 * H) return 'cyan'
  if (left > 6 * H) return 'ember'
  return 'alarm'
}

export const TONE_TEXT: Record<BeamTone, string> = {
  cyan: 'text-cyan',
  ember: 'text-ember',
  alarm: 'text-alarm',
  lime: 'text-lime',
  violet: 'text-violet-300',
}

export function timeAgo(ts: number, now = Date.now()) {
  const diff = Math.max(0, now - ts)
  if (diff < 60_000) return 'ora'
  if (diff < H) return `${Math.floor(diff / 60_000)} min`
  if (diff < 24 * H) return `${Math.floor(diff / H)} h`
  return `${Math.floor(diff / (24 * H))} g`
}

export function affinity(me: User, other: User): number {
  const mine = new Set(me.interests.map((i) => i.toLowerCase()))
  const shared = other.interests.filter((i) => mine.has(i.toLowerCase())).length
  const base = 48 + shared * 14 + ((other.hue * 7) % 11)
  return Math.min(98, base)
}

export function sharedInterests(me: User, other: User) {
  const mine = new Set(me.interests.map((i) => i.toLowerCase()))
  return other.interests.filter((i) => mine.has(i.toLowerCase()))
}

export function meaningfulCount(chat: Chat) {
  return chat.messages.filter(
    (m) => m.kind === 'voice' || m.kind === 'dilemma' || ((m.kind === 'text' || m.kind === 'track') && (m.text?.trim().length ?? 0) >= 12),
  ).length
}

export function computeBadges(stats: MeStats) {
  const avg = stats.replyTimes.length ? stats.replyTimes.reduce((a, b) => a + b, 0) / stats.replyTimes.length : Infinity
  const total = stats.voiceSent + stats.textSent
  return {
    avgReply: avg,
    voiceRatio: total ? stats.voiceSent / total : 0,
    fast: avg < 120,
    voice: total > 0 && stats.voiceSent / total >= 0.25,
    zero: stats.ghosted === 0,
  }
}

export function formatReply(sec: number) {
  if (!isFinite(sec)) return '—'
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)} min`
  return `${Math.round(sec / 3600)} h`
}

export function randomWave(n = 22) {
  return Array.from({ length: n }, () => 2 + Math.round(Math.random() * 9))
}

export function euro(n: number) {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
}
