export type Gender = 'f' | 'm' | 'nb'
export type Habit = 'si' | 'a volte' | 'no'
export type Intent = 'date' | 'friends'

/** “Questo o quello”: one playful question with two answers, shown on the profile. */
export interface ThisOrThat {
  question: string
  a: string
  b: string
}

export interface User {
  id: string
  name: string
  age: number
  city: string
  hue: number
  emoji: string
  bio: string
  interests: string[]
  thisOrThat?: ThisOrThat
  /** supporter (ALONG Forever): never gives more likes or visibility */
  lifetime?: boolean
  gender: Gender
  intent: Intent[]
  look: Look
  /** ISO date (YYYY-MM-DD), only for yourself; age is derived from it */
  birthDate?: string
  /** 4:5 cropped JPEG (data: or signed URL), first = main photo. Empty = illustrated avatar */
  photos?: string[]
  work?: string
  languages?: string[]
  verified?: boolean
  verifiedAt?: number
  /** fingerprint of the main photo the verification was done on */
  verifiedFor?: string
  smoke?: Habit
  drink?: Habit
  distanceKm?: number
}

export interface Look {
  skin: number
  hair: 'short' | 'long' | 'bun' | 'curly' | 'buzz' | 'wavy' | 'bob'
  hairColor: string
  shirt: string
  glasses?: boolean
  beard?: boolean
  earring?: boolean
}

/** A like you received. `pick` is their answer to your “Questo o quello”, if they chose one. */
export interface Like {
  id: string
  userId: string
  pick?: string
  question?: string
  at: number
  status: 'new' | 'accepted' | 'declined'
}

export interface OutgoingLike {
  userId: string
  pick?: string
  at: number
  status: 'pending' | 'matched' | 'missed'
}

export interface Prefs {
  intent: Intent
  show: 'all' | 'f' | 'm'
  ageMin: number
  ageMax: number
  /** WhatsApp-style, reciprocal: if off you don't send nor see them */
  readReceipts?: boolean
  typingIndicator?: boolean
  verifiedOnly?: boolean
}

/** 'dilemma' = the opening card of a match: the “Questo o quello” answer sent with the like */
export type MessageKind = 'text' | 'voice' | 'system' | 'dilemma' | 'track' | 'farewell' | 'proposal'

export interface Message {
  id: string
  from: string
  kind: MessageKind
  text?: string
  duration?: number
  wave?: number[]
  question?: string
  /** playable URL of a real recording */
  audioUrl?: string
  seen?: boolean
  at: number
}

export type ChatStatus = 'active' | 'waiting' | 'closed' | 'evolved' | 'expired'

export interface Chat {
  id: string
  peerIds: string[]
  title: string
  messages: Message[]
  status: ChatStatus
  createdAt: number
  closedReason?: string
  unread: number
  /** for chats in the waiting room: what they sent with the like */
  incoming?: { question?: string; pick?: string }
}

export interface Toast {
  id: string
  tone: 'lime' | 'coral' | 'violet' | 'cyan' | 'gold'
  title: string
  body?: string
}

export interface AppState {
  version: number
  me: User
  users: Record<string, User>
  chats: Chat[]
  lifetime: boolean
  onboarded: boolean
  swipes: Record<string, 'pass' | 'like'>
  swipeHistory: string[]
  likesIn: Like[]
  likesOut: OutgoingLike[]
  prefs: Prefs
  daily: Daily
  blocked: string[]
  reports: Report[]
}

export interface Report {
  id: string
  userId: string
  reason: string
  details?: string
  at: number
}

export interface Daily {
  day: string
  seen: number
  liked: number
  matches: number
}
