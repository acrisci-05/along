import type { User } from '../types'

export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const H = 3_600_000

export function timeAgo(ts: number, now = Date.now()) {
  const diff = Math.max(0, now - ts)
  if (diff < 60_000) return 'ora'
  if (diff < H) return `${Math.floor(diff / 60_000)} min`
  if (diff < 24 * H) return `${Math.floor(diff / H)} h`
  return `${Math.floor(diff / (24 * H))} g`
}

export function sharedInterests(me: User, other: User) {
  const mine = new Set(me.interests.map((i) => i.toLowerCase()))
  return other.interests.filter((i) => mine.has(i.toLowerCase()))
}

/** Profiles with more in common come first. */
export function affinity(me: User, other: User): number {
  return sharedInterests(me, other).length * 10 + (other.verified ? 3 : 0) + (other.photos?.length ? 2 : 0)
}

export function randomWave(n = 22) {
  return Array.from({ length: n }, () => 2 + Math.round(Math.random() * 9))
}

/** Light haptic feedback on phones that support it. */
export function haptic(pattern: number | number[] = 10) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}
