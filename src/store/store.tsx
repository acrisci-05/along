import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppState, Chat, Message, Prefs, ThisOrThat, Toast, User } from '../types'
import { AUTO_REPLIES, createInitialState, DEMO_VERSION, FAREWELL, INCOMING_POOL, todayKey } from '../data/mock'
import { ageFromBirth, isMinor, sameAgeGroup } from '../lib/age'
import { photoFingerprint } from '../lib/verify'
import { haptic, randomWave, uid } from '../lib/utils'

const KEY = 'along:state'

/** Everyone gets the same 3 active chats: paying never buys more chances. */
export const SLOTS = 3

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.version === DEMO_VERSION) {
        const merged = { ...createInitialState(), ...parsed }
        if (merged.me.birthDate) merged.me = { ...merged.me, age: ageFromBirth(merged.me.birthDate) }
        return merged
      }
    }
  } catch {
    /* storage unavailable */
  }
  return createInitialState()
}

type Awaitable<T> = T | Promise<T>

/** Account on the real backend (absent in the local demo). */
export interface Account {
  phase: 'loading' | 'signedOut' | 'needsProfile' | 'ready' | 'error'
  email?: string
  /** message to show on the sign-in screen (e.g. expired link) */
  notice?: string
  retry: () => void
  sendCode: (email: string) => Promise<string | null>
  verifyCode: (code: string) => Promise<string | null>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<string | null>
}

export interface NewProfile {
  name: string
  birthDate: string
  gender: User['gender']
  intent: User['intent']
  show: Prefs['show']
  thisOrThat: ThisOrThat
  photos: string[]
  look: User['look']
  hue: number
}

export interface MatchEvent {
  userId: string
  chatId: string
  waiting: boolean
  question?: string
  pick?: string
  fromMe: boolean
}

export interface Store {
  /** true in the local demo (simulated people), false on the real backend */
  demo: boolean
  account?: Account
  state: AppState
  limits: { slots: number }
  activeChats: Chat[]
  waitingChats: Chat[]
  typing: Record<string, string | undefined>
  toasts: Toast[]
  user: (id: string) => User
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  sendMessage: (chatId: string, text: string) => void
  sendVoice: (chatId: string, duration: number, extra?: { audioUrl?: string; wave?: number[]; blob?: Blob }) => void
  sendTrack: (chatId: string, title: string, artist: string) => void
  /** kind goodbye: the other person gets a gentle automatic message */
  closeElegantly: (chatId: string, text?: string) => void
  acceptWaiting: (chatId: string) => Awaitable<boolean>
  markRead: (chatId: string) => void
  /** tells the other person in the chat that you're typing */
  notifyTyping: (chatId: string) => void
  simulateIncoming: () => void
  setLifetime: (v: boolean) => void
  updateMe: (patch: Partial<User>) => void
  reset: () => void
  match: MatchEvent | null
  dismissMatch: () => void
  /** like with one tap; `pick` = their “Questo o quello” answer, optional */
  likeUser: (userId: string, pick?: string) => void
  passUser: (userId: string) => void
  newDay: () => void
  undoSwipe: () => string | null
  resetDeck: () => void
  acceptLike: (likeId: string) => void
  declineLike: (likeId: string) => void
  setPrefs: (p: Partial<Prefs>) => void
  completeOnboarding: (p: NewProfile) => Awaitable<string | null>
  blockUser: (userId: string) => void
  unblockUser: (userId: string) => void
  reportUser: (userId: string, reason: string, details?: string) => void
  injectSuspicious: () => void
  /** resolves with an error message, or null when verified */
  verifyMe: () => Awaitable<string | null>
  /** true if this person can see/meet userId (adult and 16-17 pools never mix) */
  allowed: (userId: string) => boolean
}

export const Ctx = createContext<Store | null>(null)

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

function bumpDaily(d: AppState['daily'], key: 'seen' | 'liked' | 'matches') {
  const day = todayKey()
  const base = d.day === day ? d : { day, seen: 0, liked: 0, matches: 0 }
  return { ...base, [key]: base[key] + 1 }
}

const activeCount = (chats: Chat[]) => chats.filter((c) => c.status === 'active').length

/** Moves waiting chats into free slots. */
function promote(chats: Chat[], now: number) {
  let free = SLOTS - activeCount(chats)
  const promoted: Chat[] = []
  if (free <= 0) return { chats, promoted }
  const ids = new Set<string>()
  for (const w of chats.filter((c) => c.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)) {
    if (free-- <= 0) break
    ids.add(w.id)
  }
  const next = chats.map((c) => {
    if (!ids.has(c.id)) return c
    const opened: Chat = {
      ...c,
      status: 'active',
      createdAt: now,
      unread: 1,
      messages: [
        { id: uid('m'), from: 'system', kind: 'system', text: 'Uno slot si è liberato: la conversazione è attiva.', at: now },
        ...(c.incoming?.pick ? [{ id: uid('m'), from: c.peerIds[0], kind: 'dilemma' as const, question: c.incoming.question, text: c.incoming.pick, at: now }] : []),
        ...c.messages,
      ],
    }
    promoted.push(opened)
    return opened
  })
  return { chats: next, promoted }
}

function newMatchChat(userId: string, name: string, opener: { question?: string; pick?: string; from: string }, s: AppState): { chat: Chat; full: boolean } {
  const now = Date.now()
  const full = activeCount(s.chats) >= SLOTS
  const chat: Chat = {
    id: uid('c'),
    peerIds: [userId],
    title: name,
    status: full ? 'waiting' : 'active',
    createdAt: now,
    unread: full ? 0 : 1,
    incoming: full ? { question: opener.question, pick: opener.pick } : undefined,
    messages: full
      ? []
      : [
          { id: uid('m'), from: 'system', kind: 'system', text: 'È un match! Rompi il ghiaccio.', at: now },
          ...(opener.pick ? [{ id: uid('m'), from: opener.from, kind: 'dilemma' as const, question: opener.question, text: opener.pick, at: now }] : []),
        ],
  }
  return { chat, full }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)
  const [typing, setTyping] = useState<Record<string, string | undefined>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [match, setMatch] = useState<MatchEvent | null>(null)
  const timers = useRef<number[]>([])
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore quota / private mode */
    }
  }, [state])

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = uid('t')
      setToasts((prev) => [...prev.slice(-2), { ...t, id }])
      later(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3600)
    },
    [later],
  )
  const dismissToast = useCallback((id: string) => setToasts((p) => p.filter((t) => t.id !== id)), [])

  const user = useCallback(
    (id: string): User => (id === 'me' ? state.me : state.users[id] ?? { ...state.me, id, name: 'Utente', emoji: '👤', photos: undefined }),
    [state.me, state.users],
  )

  const allowed = useCallback(
    (id: string) => {
      if (id === 'me' || id === 'system') return true
      const u = state.users[id]
      return !!u && sameAgeGroup(state.me, u) && !state.blocked.includes(id)
    },
    [state.me, state.users, state.blocked],
  )

  const announcePromoted = useCallback(
    (promoted: Chat[]) => promoted.forEach((c) => toast({ tone: 'gold', title: `${c.title} è entrat* dalla Sala d’Attesa`, body: 'Uno slot si è liberato.' })),
    [toast],
  )

  /** simulated replies, so the demo feels alive */
  const scheduleReply = useCallback(
    (chatId: string) => {
      const chat = stateRef.current.chats.find((c) => c.id === chatId)
      if (!chat || chat.status !== 'active') return
      const from = chat.peerIds[0]
      later(() => {
        setTyping((t) => ({ ...t, [chatId]: from }))
        setState((prev) => ({ ...prev, chats: prev.chats.map((c) => (c.id === chatId ? { ...c, messages: c.messages.map((m) => (m.from === 'me' && !m.seen ? { ...m, seen: true } : m)) } : c)) }))
      }, 700)
      later(() => {
        setTyping((t) => ({ ...t, [chatId]: undefined }))
        setState((prev) => {
          const c = prev.chats.find((x) => x.id === chatId)
          if (!c || c.status !== 'active') return prev
          const m: Message =
            Math.random() < 0.2
              ? { id: uid('m'), from, kind: 'voice', duration: 6 + Math.round(Math.random() * 30), wave: randomWave(), at: Date.now() }
              : { id: uid('m'), from, kind: 'text', text: pick(AUTO_REPLIES), at: Date.now() }
          return { ...prev, chats: prev.chats.map((x) => (x.id === chatId ? { ...x, messages: [...x.messages, m] } : x)) }
        })
      }, 1900 + Math.random() * 1400)
    },
    [later],
  )

  const pushMine = useCallback(
    (chatId: string, m: Omit<Message, 'id' | 'from' | 'at'>) => {
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((c) => (c.id === chatId && c.status === 'active' ? { ...c, messages: [...c.messages, { ...m, id: uid('m'), from: 'me', at: Date.now() }] } : c)),
      }))
      scheduleReply(chatId)
    },
    [scheduleReply],
  )

  const likeUser = useCallback(
    (userId: string, chosen?: string) => {
      const s0 = stateRef.current
      const u = s0.users[userId]
      if (!u || !sameAgeGroup(s0.me, u)) return
      haptic()
      setState((prev) => ({
        ...prev,
        swipes: { ...prev.swipes, [userId]: 'like' },
        swipeHistory: [...prev.swipeHistory, userId],
        likesOut: [...prev.likesOut.filter((l) => l.userId !== userId), { userId, pick: chosen, at: Date.now(), status: 'pending' }],
        daily: bumpDaily(bumpDaily(prev.daily, 'seen'), 'liked'),
      }))
      // demo: about half of the likes come back
      const matched = Math.random() < 0.55
      later(() => {
        const s = stateRef.current
        if (!matched) {
          setState({ ...s, likesOut: s.likesOut.map((l) => (l.userId === userId ? { ...l, status: 'missed' } : l)) })
          return
        }
        const { chat, full } = newMatchChat(userId, u.name, { question: u.thisOrThat?.question, pick: chosen, from: 'me' }, s)
        setState({ ...s, chats: [chat, ...s.chats], likesOut: s.likesOut.map((l) => (l.userId === userId ? { ...l, status: 'matched' } : l)), daily: bumpDaily(s.daily, 'matches') })
        setMatch({ userId, chatId: chat.id, waiting: full, question: u.thisOrThat?.question, pick: chosen, fromMe: true })
        haptic([12, 60, 18])
        if (!full) scheduleReply(chat.id)
      }, 1600 + Math.random() * 1400)
    },
    [later, scheduleReply],
  )

  const acceptLike = useCallback((likeId: string) => {
    const s = stateRef.current
    const like = s.likesIn.find((l) => l.id === likeId)
    const u = like && s.users[like.userId]
    if (!like || !u || !sameAgeGroup(s.me, u)) return
    const { chat, full } = newMatchChat(like.userId, u.name, { question: like.question, pick: like.pick, from: like.userId }, s)
    setState({ ...s, chats: [chat, ...s.chats], likesIn: s.likesIn.map((l) => (l.id === likeId ? { ...l, status: 'accepted' } : l)), swipes: { ...s.swipes, [like.userId]: 'like' }, daily: bumpDaily(s.daily, 'matches') })
    setMatch({ userId: like.userId, chatId: chat.id, waiting: full, question: like.question, pick: like.pick, fromMe: false })
    haptic([12, 60, 18])
  }, [])

  const closeChat = useCallback(
    (chatId: string, reason: string, extra: Message[]) => {
      const s = stateRef.current
      const chat = s.chats.find((c) => c.id === chatId)
      if (!chat) return
      const marked = s.chats.map((c) => (c.id === chatId ? { ...c, status: 'closed' as const, closedReason: reason, incoming: undefined, messages: [...c.messages, ...extra] } : c))
      const { chats, promoted } = chat.status === 'active' ? promote(marked, Date.now()) : { chats: marked, promoted: [] }
      setState({ ...s, chats })
      announcePromoted(promoted)
    },
    [announcePromoted],
  )

  const store: Store = useMemo(() => {
    const activeChats = state.chats.filter((c) => c.status === 'active')
    const waitingChats = state.chats.filter((c) => c.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
    return {
      demo: true,
      state,
      limits: { slots: SLOTS },
      activeChats,
      waitingChats,
      typing,
      toasts,
      user,
      toast,
      dismissToast,
      allowed,
      match,
      dismissMatch: () => setMatch(null),
      sendMessage: (chatId, text) => pushMine(chatId, { kind: 'text', text }),
      sendVoice: (chatId, duration, extra) => pushMine(chatId, { kind: 'voice', duration, wave: extra?.wave ?? randomWave(), audioUrl: extra?.audioUrl }),
      sendTrack: (chatId, title, artist) => pushMine(chatId, { kind: 'track', text: `${title} · ${artist}` }),
      closeElegantly: (chatId, text) => {
        closeChat(chatId, 'Chiusa con gentilezza', [{ id: uid('m'), from: 'me', kind: 'farewell', text: text ?? FAREWELL, at: Date.now() }])
        toast({ tone: 'lime', title: 'Chat chiusa con gentilezza', body: 'L’altra persona riceve il tuo messaggio. Nessuno resta appeso.' })
      },
      acceptWaiting: (chatId) => {
        const s = stateRef.current
        if (activeCount(s.chats) >= SLOTS) return false
        const reordered = s.chats.map((c) => (c.id === chatId ? { ...c, createdAt: 0 } : c))
        setState({ ...s, chats: promote(reordered, Date.now()).chats })
        return true
      },
      markRead: (chatId) =>
        setState((prev) => (prev.chats.some((c) => c.id === chatId && c.unread) ? { ...prev, chats: prev.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)) } : prev)),
      notifyTyping: () => {},
      simulateIncoming: () => {
        const s = stateRef.current
        const taken = new Set([...s.likesIn.map((l) => l.userId), ...s.chats.flatMap((c) => c.peerIds)])
        const pool = (isMinor(s.me) ? Object.values(s.users).filter(isMinor).map((u) => u.id) : INCOMING_POOL).filter((id) => !taken.has(id) && s.users[id] && sameAgeGroup(s.me, s.users[id]))
        if (!pool.length) {
          toast({ tone: 'gold', title: 'Nessun nuovo profilo', body: 'Hai già ricevuto like da tutte le persone della demo.' })
          return
        }
        const id = pick(pool)
        const tot = s.me.thisOrThat
        const chosen = tot && Math.random() < 0.7 ? (Math.random() < 0.5 ? tot.a : tot.b) : undefined
        setState((prev) => ({ ...prev, likesIn: [{ id: uid('l'), userId: id, question: chosen ? tot?.question : undefined, pick: chosen, at: Date.now(), status: 'new' }, ...prev.likesIn] }))
        toast({ tone: 'violet', title: `Piaci a ${s.users[id].name}`, body: 'Guarda in “Like” e decidi tu.' })
      },
      setLifetime: (v) => setState((prev) => ({ ...prev, lifetime: v, me: { ...prev.me, lifetime: v } })),
      updateMe: (patch) => setState((prev) => ({ ...prev, me: { ...prev.me, ...patch } })),
      likeUser,
      passUser: (userId) => setState((prev) => ({ ...prev, swipes: { ...prev.swipes, [userId]: 'pass' }, swipeHistory: [...prev.swipeHistory, userId], daily: bumpDaily(prev.daily, 'seen') })),
      newDay: () => setState((prev) => ({ ...prev, daily: { day: todayKey(), seen: 0, liked: 0, matches: 0 } })),
      undoSwipe: () => {
        const s = stateRef.current
        const last = s.swipeHistory[s.swipeHistory.length - 1]
        if (!last || s.swipes[last] !== 'pass') return null
        const swipes = { ...s.swipes }
        delete swipes[last]
        setState({ ...s, swipes, swipeHistory: s.swipeHistory.slice(0, -1), daily: { ...s.daily, seen: Math.max(0, s.daily.seen - 1) } })
        return last
      },
      resetDeck: () =>
        setState((prev) => {
          const keep = Object.fromEntries(Object.entries(prev.swipes).filter(([, v]) => v === 'like'))
          return { ...prev, swipes: keep, swipeHistory: prev.swipeHistory.filter((id) => keep[id]) }
        }),
      acceptLike,
      declineLike: (likeId) => setState((prev) => ({ ...prev, likesIn: prev.likesIn.map((l) => (l.id === likeId ? { ...l, status: 'declined' } : l)) })),
      setPrefs: (p) => setState((prev) => ({ ...prev, prefs: { ...prev.prefs, ...p, ...(isMinor(prev.me) ? { intent: 'friends' as const } : {}) } })),
      completeOnboarding: (np) => {
        const base = createInitialState()
        const age = ageFromBirth(np.birthDate)
        const minor = age < 18
        const me: User = {
          ...base.me,
          name: np.name.trim(),
          age,
          birthDate: np.birthDate,
          gender: np.gender,
          intent: minor ? ['friends'] : np.intent,
          thisOrThat: np.thisOrThat,
          photos: np.photos,
          look: np.look,
          hue: np.hue,
          bio: '',
          interests: [],
        }
        const peers = Object.values(base.users).filter((u) => sameAgeGroup(me, u))
        const likers = (minor ? peers : peers.filter((u) => ['u-federico', 'u-aurora', 'u-omar'].includes(u.id))).slice(0, 2)
        const now = Date.now()
        setTyping({})
        setMatch(null)
        setState({
          ...base,
          me,
          onboarded: true,
          chats: [],
          likesIn: likers.map((u, i) => ({ id: uid('l'), userId: u.id, question: i === 0 ? np.thisOrThat.question : undefined, pick: i === 0 ? np.thisOrThat.a : undefined, at: now - (i + 1) * 47 * 60_000, status: 'new' as const })),
          prefs: { ...base.prefs, intent: minor ? 'friends' : np.intent.includes('date') ? 'date' : 'friends', show: np.show, ageMin: minor ? 16 : Math.max(18, age - 8), ageMax: minor ? 17 : Math.min(60, age + 10) },
        })
        toast({ tone: 'lime', title: `Benvenut* su ALONG, ${me.name}`, body: minor ? 'Modalità Amici, solo con persone della tua età.' : 'Il tuo profilo è pronto.' })
        return null
      },
      blockUser: (userId) => {
        const s = stateRef.current
        const now = Date.now()
        const marked = s.chats.map((c) =>
          c.peerIds.includes(userId) && (c.status === 'active' || c.status === 'waiting')
            ? { ...c, status: 'closed' as const, closedReason: 'Persona bloccata', incoming: undefined, messages: [...c.messages, { id: uid('m'), from: 'system', kind: 'system' as const, text: 'Hai bloccato questa persona. La chat è chiusa.', at: now }] }
            : c,
        )
        const closedActive = s.chats.some((c) => c.status === 'active' && c.peerIds.includes(userId))
        const { chats, promoted } = closedActive ? promote(marked, now) : { chats: marked, promoted: [] as Chat[] }
        setState({ ...s, chats, blocked: s.blocked.includes(userId) ? s.blocked : [...s.blocked, userId], likesIn: s.likesIn.filter((l) => l.userId !== userId) })
        announcePromoted(promoted)
      },
      unblockUser: (userId) => setState((prev) => ({ ...prev, blocked: prev.blocked.filter((x) => x !== userId) })),
      reportUser: (userId, reason, details) =>
        setState((prev) => ({ ...prev, reports: [...prev.reports, { id: uid('r'), userId, reason, details: details?.trim() || undefined, at: Date.now() }] })),
      verifyMe: () => {
        setState((prev) => ({ ...prev, me: { ...prev.me, verified: true, verifiedAt: Date.now(), verifiedFor: photoFingerprint(prev.me) } }))
        return null
      },
      injectSuspicious: () => {
        const s = stateRef.current
        const chat = s.chats.find((c) => c.status === 'active')
        if (!chat) {
          toast({ tone: 'coral', title: 'Nessuna chat attiva', body: 'Apri una conversazione per provare l’avviso.' })
          return
        }
        const from = chat.peerIds[0]
        setState((prev) => ({
          ...prev,
          chats: prev.chats.map((c) =>
            c.id === chat.id ? { ...c, unread: c.unread + 1, messages: [...c.messages, { id: uid('m'), from, kind: 'text' as const, text: 'Ehi, mi faresti una ricarica di 20 euro su PayPal? Te li ridò stasera, promesso', at: Date.now() }] } : c,
          ),
        }))
        toast({ tone: 'gold', title: 'Messaggio sospetto inviato', body: `Apri la chat con ${s.users[from]?.name ?? 'la persona'} per vedere l’avviso.` })
      },
      reset: () => {
        timers.current.forEach((t) => clearTimeout(t))
        timers.current = []
        setTyping({})
        setMatch(null)
        setState({ ...createInitialState(), onboarded: false })
      },
    }
  }, [state, typing, toasts, user, toast, dismissToast, allowed, match, pushMine, closeChat, likeUser, acceptLike, announcePromoted])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(iv)
  }, [interval])
  return now
}
