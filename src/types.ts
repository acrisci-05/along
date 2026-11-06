export type Mode = 'local' | 'remote'

export type Category =
  | 'food'
  | 'drink'
  | 'sport'
  | 'cinema'
  | 'study'
  | 'walk'
  | 'gaming'
  | 'music'
  | 'books'
  | 'talk'
  | 'travel'

export type PlanStatus = 'OPEN' | 'ALMOST FULL' | 'FULL' | 'CONFIRMED' | 'EXPIRED'

export interface Dilemma {
  question: string
  options?: string[]
}

export interface BestieVouch {
  worstFlaw: string
  whyGoOut: string
  redFlag: string
  by: string
}

export interface User {
  id: string
  name: string
  age: number
  city: string
  hue: number
  emoji: string
  bio: string
  pronouns?: string
  interests: string[]
  habitats: string[]
  dilemma: Dilemma
  bestie?: BestieVouch
  karma: number
  badges: Array<'fast' | 'voice' | 'zero'>
  lifetime?: boolean
  travel?: string
  stickerFinish?: 'paper' | 'holo' | 'neon'
}

export interface PlanDetails {
  cuisine?: string
  budget?: string
  level?: string
  missing?: number
  film?: string
  language?: string
  studyMode?: 'silenzioso' | 'collaborativo'
  timezone?: string
  platform?: string
  track?: { title: string; artist: string; length: string }
  destination?: string
}

export interface Plan {
  id: string
  hostId: string
  title: string
  category: Category
  mode: Mode
  city: string
  habitat: string
  district?: string
  when: number
  whenLabel?: string
  capacity: number
  participants: string[]
  vibes: string[]
  dilemma: Dilemma
  details: PlanDetails
  privacy: boolean
  cost?: number
  confirmed?: boolean
  interested: string[]
  createdAt: number
}

export type MessageKind = 'text' | 'voice' | 'system' | 'dilemma' | 'track' | 'farewell'

export interface Message {
  id: string
  from: string
  kind: MessageKind
  text?: string
  duration?: number
  wave?: number[]
  question?: string
  at: number
}

export type ChatStatus = 'active' | 'waiting' | 'closed' | 'evolved' | 'expired'

export interface Chat {
  id: string
  planId?: string
  peerIds: string[]
  mode: Mode
  title: string
  messages: Message[]
  status: ChatStatus
  createdAt: number
  deadline?: number
  clockStopped?: boolean
  closedReason?: string
  unread: number
  incoming?: { answer: string; question: string }
}

export interface Toast {
  id: string
  tone: 'lime' | 'coral' | 'violet' | 'cyan' | 'gold'
  title: string
  body?: string
}

export interface MeStats {
  replyTimes: number[]
  voiceSent: number
  textSent: number
  elegantCloses: number
  ghosted: number
  clocksStopped: number
}

export interface AppState {
  version: number
  me: User
  users: Record<string, User>
  plans: Plan[]
  chats: Chat[]
  saved: string[]
  lifetime: boolean
  stats: MeStats
  travelDestinations: string[]
  onboarded: boolean
}
