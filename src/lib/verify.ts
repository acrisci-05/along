import type { User } from '../types'

export const GESTURES = [
  { icon: '✋', text: 'Mano aperta accanto al viso' },
  { icon: '👍', text: 'Pollice in su vicino alla guancia' },
  { icon: '✌️', text: 'Due dita a V sotto il mento' },
  { icon: '☝️', text: 'Un dito che indica il naso' },
]

/** Short fingerprint of the main photo, to suspend the badge when it changes. */
export function photoFingerprint(u: Pick<User, 'photos'>): string | undefined {
  const src = u.photos?.[0]
  if (!src) return undefined
  let h = 0
  for (let i = 0; i < src.length; i += 97) h = (h * 31 + src.charCodeAt(i)) | 0
  return `${src.length}:${h}`
}

export type VerifyStatus = 'verified' | 'suspended' | 'none'

export function verifyStatus(u: User): VerifyStatus {
  if (!u.verified) return 'none'
  if (u.id !== 'me') return 'verified'
  return u.verifiedFor && u.verifiedFor === photoFingerprint(u) ? 'verified' : 'suspended'
}

export const isVerified = (u: User) => verifyStatus(u) === 'verified'
