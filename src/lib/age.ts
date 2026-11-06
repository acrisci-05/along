import type { User } from '../types'

export const MIN_AGE = 16
export const ADULT_AGE = 18

export function ageFromBirth(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number)
  let age = now.getFullYear() - y
  const beforeBirthday = now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)
  if (beforeBirthday) age--
  return age
}

export const isMinor = (u: Pick<User, 'age'>) => u.age < ADULT_AGE

/** Adults (18+) and minors (16-17) live in fully separated pools. */
export const sameAgeGroup = (a: Pick<User, 'age'>, b: Pick<User, 'age'>) => isMinor(a) === isMinor(b)
