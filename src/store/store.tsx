import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppState, Chat, Like, Message, Plan, Prefs, Toast, User } from '../types'
import { AUTO_REPLIES, createInitialState, DEMO_VERSION, FAREWELL, INCOMING_POOL, SAMPLE_ANSWERS, todayKey } from '../data/mock'
import { ageFromBirth, isMinor, sameAgeGroup } from '../lib/age'
import { affinity, H, planStatus, randomWave, uid } from '../lib/utils'

const KEY = 'along:state'

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

export const FREE_LIMITS = { slots: 3, plans: 3, travel: 1 }
export const LIFETIME_LIMITS = { slots: 5, plans: Infinity, travel: Infinity }

export type JoinResult = { ok: true; chatId: string } | { ok: false; reason: 'slots' | 'full' | 'exists'; chatId?: string }
export type CreateResult = { ok: true; planId: string } | { ok: false; reason: 'limit' }

export interface PlanDraft {
  title: string
  category: Plan['category']
  mode: Plan['mode']
  habitat: string
  when: number
  whenLabel?: string
  capacity: number
  dilemma: string
  vibes: string[]
  privacy: boolean
  cost?: number
  details: Plan['details']
}

interface Store {
  state: AppState
  limits: typeof FREE_LIMITS
  activeChats: Chat[]
  waitingChats: Chat[]
  hostedActivePlans: Plan[]
  typing: Record<string, string | undefined>
  toasts: Toast[]
  user: (id: string) => User
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  toggleSave: (planId: string) => void
  joinPlan: (planId: string, answer: string) => JoinResult
  messageUser: (userId: string, answer: string) => JoinResult
  sendMessage: (chatId: string, text: string) => void
  sendVoice: (chatId: string, duration: number, extra?: { audioUrl?: string; wave?: number[] }) => void
  sendTrack: (chatId: string, title: string, artist: string) => void
  closeElegantly: (chatId: string, text?: string) => void
  evolveChat: (chatId: string) => void
  stopClock: (chatId: string) => void
  acceptWaiting: (chatId: string) => boolean
  markRead: (chatId: string) => void
  createPlan: (draft: PlanDraft) => CreateResult
  simulateIncoming: () => void
  setLifetime: (v: boolean) => void
  updateMe: (patch: Partial<User>) => void
  addTravel: (dest: string) => boolean
  removeTravel: (dest: string) => void
  setOnboarded: () => void
  reset: () => void
  match: MatchEvent | null
  dismissMatch: () => void
  likeUser: (userId: string, answer: string) => void
  passUser: (userId: string) => void
  newDay: () => void
  undoSwipe: () => string | null
  resetDeck: () => void
  acceptLike: (likeId: string) => void
  declineLike: (likeId: string) => void
  setPrefs: (p: Partial<Prefs>) => void
  proposeMeetup: (chatId: string, p: { title: string; when: string; place: string }) => void
  completeOnboarding: (p: NewProfile) => void
  /** true if this person can see/meet userId (adult and 16-17 pools never mix) */
  allowed: (userId: string) => boolean
  planVisible: (plan: Plan) => boolean
}

export interface NewProfile {
  name: string
  birthDate: string
  gender: User['gender']
  intent: User['intent']
  show: Prefs['show']
  dilemma: string
  photo?: string
  look: User['look']
  hue: number
}

export interface MatchEvent {
  userId: string
  chatId: string
  waiting: boolean
  answer: string
  question: string
  fromMe: boolean
}

const Ctx = createContext<Store | null>(null)

/** Daily selection counter, rolling over at midnight. */
function bumpDaily(d: AppState['daily'], key: 'seen' | 'answered' | 'matches') {
  const day = todayKey()
  const base = d.day === day ? d : { day, seen: 0, answered: 0, matches: 0 }
  return { ...base, [key]: base[key] + 1 }
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

function activeCount(chats: Chat[]) {
  return chats.filter((c) => c.status === 'active').length
}

/** Moves waiting chats into free slots. Returns new chats + promoted list. */
function promote(chats: Chat[], limit: number, now: number) {
  let free = limit - activeCount(chats)
  const promoted: Chat[] = []
  if (free <= 0) return { chats, promoted }
  const waiting = chats.filter((c) => c.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
  const ids = new Set<string>()
  for (const w of waiting) {
    if (free <= 0) break
    ids.add(w.id)
    free--
  }
  const next = chats.map((c) => {
    if (!ids.has(c.id)) return c
    const opened: Chat = {
      ...c,
      status: 'active',
      createdAt: now,
      deadline: c.mode === 'local' ? now + 48 * H : undefined,
      unread: 1,
      messages: c.incoming
        ? [
            { id: uid('m'), from: 'system', kind: 'system', text: 'Uno slot si è liberato: questa conversazione è entrata dalla Sala d’Attesa.', at: now },
            { id: uid('m'), from: c.peerIds[0], kind: 'dilemma', question: c.incoming.question, text: c.incoming.answer, at: now },
            ...c.messages,
          ]
        : c.messages,
    }
    promoted.push(opened)
    return opened
  })
  return { chats: next, promoted }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)
  const [typing, setTyping] = useState<Record<string, string | undefined>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [match, setMatch] = useState<MatchEvent | null>(null)
  const timers = useRef<number[]>([])
  const stateRef = useRef(state)
  stateRef.current = state

  const limits = state.lifetime ? LIFETIME_LIMITS : FREE_LIMITS

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore quota / private mode */
    }
  }, [state])

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms)
    timers.current.push(t)
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
    (id: string): User => (id === 'me' ? state.me : state.users[id] ?? { ...state.me, id, name: 'Utente', emoji: '👤' }),
    [state.me, state.users],
  )

  const allowed = useCallback(
    (id: string) => {
      if (id === 'me' || id === 'system') return true
      const u = state.users[id]
      return !!u && sameAgeGroup(state.me, u)
    },
    [state.me, state.users],
  )
  const planVisible = useCallback((p: Plan) => allowed(p.hostId) && p.participants.every(allowed), [allowed])

  const announcePromoted = useCallback(
    (promoted: Chat[]) => {
      promoted.forEach((c) => {
        const u = stateRef.current.users[c.peerIds[0]]
        toast({ tone: 'gold', title: `${u?.name ?? 'Qualcuno'} è entrat* dalla Sala d’Attesa`, body: 'Slot liberato con successo. Nuova conversazione attiva.' })
      })
    },
    [toast],
  )

  /** Ghosting watchdog: local timers that hit zero expire the chat. */
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const s = stateRef.current
      const expiring = s.chats.filter((c) => c.status === 'active' && c.mode === 'local' && c.deadline && !c.clockStopped && c.deadline < now)
      if (!expiring.length) return
      const lim = s.lifetime ? LIFETIME_LIMITS.slots : FREE_LIMITS.slots
      const ids = new Set(expiring.map((c) => c.id))
      const marked = s.chats.map((c) =>
        ids.has(c.id)
          ? { ...c, status: 'expired' as const, closedReason: 'Timer 48h scaduto', messages: [...c.messages, { id: uid('m'), from: 'system', kind: 'system' as const, text: 'Il timer di 48 ore è scaduto senza un ritrovo confermato.', at: now }] }
          : c,
      )
      const { chats, promoted } = promote(marked, lim, now)
      setState({ ...s, chats, stats: { ...s.stats, ghosted: s.stats.ghosted + expiring.length } })
      toast({ tone: 'coral', title: 'Timer scaduto', body: `${expiring.length} connessione è scaduta. Il badge Zero Ghosting è a rischio!` })
      announcePromoted(promoted)
    }
    tick()
    const iv = window.setInterval(tick, 10_000)
    return () => clearInterval(iv)
  }, [toast, announcePromoted])

  const scheduleReply = useCallback(
    (chatId: string, kind: 'generic' | 'dilemma' = 'generic') => {
      const s = stateRef.current
      const chat = s.chats.find((c) => c.id === chatId)
      if (!chat || chat.status !== 'active') return
      const from = pick(chat.peerIds)
      later(() => {
        setTyping((t) => ({ ...t, [chatId]: from }))
        setState((prev) => ({ ...prev, chats: prev.chats.map((c) => (c.id === chatId ? { ...c, messages: c.messages.map((m) => (m.from === 'me' && !m.seen ? { ...m, seen: true } : m)) } : c)) }))
      }, 700)
      later(() => {
        setTyping((t) => ({ ...t, [chatId]: undefined }))
        setState((prev) => {
          const c = prev.chats.find((x) => x.id === chatId)
          if (!c || c.status !== 'active') return prev
          const remote = c.mode === 'remote'
          const voice = remote ? Math.random() < 0.45 : Math.random() < 0.15
          const pool = kind === 'dilemma' ? AUTO_REPLIES.dilemma : remote ? [...AUTO_REPLIES.remote, ...AUTO_REPLIES.generic] : AUTO_REPLIES.generic
          const m: Message = voice && kind !== 'dilemma'
            ? { id: uid('m'), from, kind: 'voice', duration: 6 + Math.round(Math.random() * 30), wave: randomWave(), at: Date.now() }
            : { id: uid('m'), from, kind: 'text', text: pick(pool), at: Date.now() }
          return { ...prev, chats: prev.chats.map((x) => (x.id === chatId ? { ...x, messages: [...x.messages, m] } : x)) }
        })
      }, 1900 + Math.random() * 1400)
    },
    [later],
  )

  const pushMine = useCallback(
    (chatId: string, m: Omit<Message, 'id' | 'from' | 'at'>, statKey: 'textSent' | 'voiceSent') => {
      const now = Date.now()
      setState((prev) => {
        const chat = prev.chats.find((c) => c.id === chatId)
        if (!chat || chat.status !== 'active') return prev
        let lastPeer: Message | undefined
        for (let i = chat.messages.length - 1; i >= 0; i--) {
          const msg = chat.messages[i]
          if (msg.from === 'me') break
          if (msg.from !== 'system') { lastPeer = msg; break }
        }
        const replyTimes = [...prev.stats.replyTimes]
        if (lastPeer && now - lastPeer.at < 30 * 60_000) replyTimes.push((now - lastPeer.at) / 1000)
        return {
          ...prev,
          stats: { ...prev.stats, replyTimes: replyTimes.slice(-40), [statKey]: prev.stats[statKey] + 1 },
          chats: prev.chats.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, { ...m, id: uid('m'), from: 'me', at: now }] } : c)),
        }
      })
      scheduleReply(chatId)
    },
    [scheduleReply],
  )

  const startChat = useCallback(
    (opts: { planId?: string; peerIds: string[]; mode: Plan['mode']; title: string; question: string; answer: string }): JoinResult => {
      const s = stateRef.current
      const existing = s.chats.find((c) => c.planId === opts.planId && c.peerIds.join() === opts.peerIds.join() && (c.status === 'active' || c.status === 'waiting'))
      if (existing) return { ok: false, reason: 'exists', chatId: existing.id }
      if (activeCount(s.chats) >= limits.slots) return { ok: false, reason: 'slots' }
      const now = Date.now()
      const chat: Chat = {
        id: uid('c'),
        planId: opts.planId,
        peerIds: opts.peerIds,
        mode: opts.mode,
        title: opts.title,
        status: 'active',
        createdAt: now,
        deadline: opts.mode === 'local' ? now + 48 * H : undefined,
        unread: 0,
        messages: [{ id: uid('m'), from: 'me', kind: 'dilemma', question: opts.question, text: opts.answer, at: now }],
      }
      setState((prev) => ({
        ...prev,
        chats: [chat, ...prev.chats],
        plans: opts.planId
          ? prev.plans.map((p) => (p.id === opts.planId && !p.participants.includes('me') ? { ...p, participants: [...p.participants, 'me'] } : p))
          : prev.plans,
      }))
      scheduleReply(chat.id, 'dilemma')
      return { ok: true, chatId: chat.id }
    },
    [limits.slots, scheduleReply],
  )

  const joinPlan = useCallback(
    (planId: string, answer: string): JoinResult => {
      const s = stateRef.current
      const plan = s.plans.find((p) => p.id === planId)
      if (!plan) return { ok: false, reason: 'full' }
      const okAge = [plan.hostId, ...plan.participants].every((id) => id === 'me' || (s.users[id] && sameAgeGroup(s.me, s.users[id])))
      if (!okAge) return { ok: false, reason: 'full' }
      if (plan.participants.length >= plan.capacity && !plan.participants.includes('me')) return { ok: false, reason: 'full' }
      const peers = plan.participants.filter((id) => id !== 'me')
      return startChat({ planId, peerIds: peers.length ? peers : [plan.hostId], mode: plan.mode, title: plan.title, question: plan.dilemma.question, answer })
    },
    [startChat],
  )

  const messageUser = useCallback(
    (userId: string, answer: string): JoinResult => {
      const s = stateRef.current
      const u = s.users[userId]
      return startChat({ peerIds: [userId], mode: u.city === s.me.city ? 'local' : 'remote', title: `Tu & ${u.name}`, question: u.dilemma.question, answer })
    },
    [startChat],
  )

  const finishChat = useCallback(
    (chatId: string, status: 'closed' | 'evolved', farewellText?: string) => {
      const now = Date.now()
      const s = stateRef.current
      const chat = s.chats.find((c) => c.id === chatId)
      if (!chat) return
      const wasActive = chat.status === 'active'
      const extra: Message[] =
        status === 'closed'
          ? [{ id: uid('m'), from: 'me', kind: 'farewell', text: farewellText ?? FAREWELL, at: now }]
          : [{ id: uid('m'), from: 'system', kind: 'system', text: 'Missione compiuta: vi vedete dal vivo / contatti scambiati. Slot liberato 🎉', at: now }]
      const marked = s.chats.map((c) =>
        c.id === chatId ? { ...c, status, closedReason: status === 'closed' ? 'Chiusura con eleganza' : 'Evoluta dal vivo', incoming: undefined, messages: [...c.messages, ...extra] } : c,
      )
      const { chats, promoted } = wasActive ? promote(marked, limits.slots, now) : { chats: marked, promoted: [] }
      setState({
        ...s,
        chats,
        me: status === 'closed' ? { ...s.me, karma: s.me.karma + 15 } : { ...s.me, karma: s.me.karma + 10 },
        stats: status === 'closed' ? { ...s.stats, elegantCloses: s.stats.elegantCloses + 1 } : s.stats,
      })
      toast(
        status === 'closed'
          ? { tone: 'lime', title: '+15 Punti Karma', body: 'Chiusura con eleganza inviata. Grazie per non fare ghosting.' }
          : { tone: 'cyan', title: '+10 Karma · Crew evoluta', body: 'Ora tocca alla vita reale. Slot liberato!' },
      )
      announcePromoted(promoted)
    },
    [limits.slots, toast, announcePromoted],
  )

  /** Sends a meetup ticket; the peer accepts it (simulated) and the 48h clock stops. */
  const proposeMeetup = useCallback(
    (chatId: string, prop: { title: string; when: string; place: string }) => {
      const now = Date.now()
      const msgId = uid('m')
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, { id: msgId, from: 'me', kind: 'proposal', proposal: { ...prop, status: 'pending' }, at: now }] } : c)),
      }))
      const chat = stateRef.current.chats.find((c) => c.id === chatId)
      const from = chat?.peerIds[0] ?? ''
      later(() => {
        setTyping((t) => ({ ...t, [chatId]: from }))
        setState((prev) => ({ ...prev, chats: prev.chats.map((c) => (c.id === chatId ? { ...c, messages: c.messages.map((m) => (m.from === 'me' && !m.seen ? { ...m, seen: true } : m)) } : c)) }))
      }, 900)
      later(() => {
        setTyping((t) => ({ ...t, [chatId]: undefined }))
        const at = Date.now()
        setState((prev) => {
          const c = prev.chats.find((x) => x.id === chatId)
          if (!c || c.status !== 'active') return prev
          return {
            ...prev,
            me: { ...prev.me, karma: prev.me.karma + 5 },
            stats: { ...prev.stats, clocksStopped: prev.stats.clocksStopped + 1 },
            plans: prev.plans.map((p) => (c.planId === p.id ? { ...p, confirmed: true } : p)),
            chats: prev.chats.map((x) =>
              x.id === chatId
                ? {
                    ...x,
                    clockStopped: true,
                    messages: [
                      ...x.messages.map((m) => (m.id === msgId && m.proposal ? { ...m, proposal: { ...m.proposal, status: 'accepted' as const } } : m)),
                      { id: uid('m'), from, kind: 'text', text: 'Perfetto, ci sto! Ci vediamo lì.', at },
                      { id: uid('m'), from: 'system', kind: 'system', text: `Uscita confermata: ${prop.title}, ${prop.when}, ${prop.place}. Timer fermato.`, at: at + 1 },
                    ],
                  }
                : x,
            ),
          }
        })
        toast({ tone: 'cyan', title: 'Uscita confermata', body: `${prop.when}, ${prop.place}. +5 Karma.` })
      }, 2400)
    },
    [later, toast],
  )

  const stopClock = useCallback(
    (chatId: string) => {
      const now = Date.now()
      setState((prev) => {
        const chat = prev.chats.find((c) => c.id === chatId)
        return {
          ...prev,
          me: { ...prev.me, karma: prev.me.karma + 5 },
          stats: { ...prev.stats, clocksStopped: prev.stats.clocksStopped + 1 },
          plans: prev.plans.map((p) => (chat?.planId === p.id ? { ...p, confirmed: true } : p)),
          chats: prev.chats.map((c) =>
            c.id === chatId
              ? { ...c, clockStopped: true, messages: [...c.messages, { id: uid('m'), from: 'system', kind: 'system', text: '⏹ Stop the Clock! Ritrovo confermato, il timer 48h è fermo.', at: now }] }
              : c,
          ),
        }
      })
      toast({ tone: 'cyan', title: 'Ritrovo confermato', body: 'Timer fermato. +5 Karma per la puntualità.' })
    },
    [toast],
  )

  const acceptWaiting = useCallback(
    (chatId: string) => {
      const s = stateRef.current
      if (activeCount(s.chats) >= limits.slots) return false
      const now = Date.now()
      const target = s.chats.find((c) => c.id === chatId)
      if (!target) return false
      const reordered = s.chats.map((c) => (c.id === chatId ? { ...c, createdAt: 0 } : c))
      const { chats } = promote(reordered, activeCount(s.chats) + 1, now)
      setState({ ...s, chats })
      return true
    },
    [limits.slots],
  )

  const simulateIncomingFor = useCallback(
    (planId?: string) => {
      const s = stateRef.current
      const plan = s.plans.find((p) => p.id === planId)
      const taken = new Set([
        ...s.likesIn.filter((l) => l.status === 'new').map((l) => l.userId),
        ...s.chats.filter((c) => c.status === 'active' || c.status === 'waiting').flatMap((c) => c.peerIds),
      ])
      const question = plan?.dilemma.question ?? s.me.dilemma.question
      const samples = SAMPLE_ANSWERS[question]
      const pool = isMinor(s.me)
        ? Object.values(s.users).filter((x) => isMinor(x)).map((x) => ({ userId: x.id, answer: samples ? pick(samples) : 'Bella domanda! Te lo racconto di persona.' }))
        : INCOMING_POOL.map((x) => ({ ...x, answer: samples ? pick(samples) : x.answer }))
      const fresh = pool.filter((x) => !taken.has(x.userId) && s.users[x.userId] && sameAgeGroup(s.me, s.users[x.userId]))
      if (!fresh.length) {
        toast({ tone: 'gold', title: 'Nessun nuovo profilo', body: 'Hai già ricevuto risposte da tutte le persone della demo.' })
        return
      }
      const candidate = pick(fresh)
      const u = s.users[candidate.userId]
      const like: Like = {
        id: uid('l'),
        userId: candidate.userId,
        question,
        answer: candidate.answer,
        at: Date.now(),
        status: 'new',
      }
      setState((prev) => ({
        ...prev,
        likesIn: [like, ...prev.likesIn],
        plans: plan ? prev.plans.map((p) => (p.id === plan.id && !p.interested.includes(u.id) ? { ...p, interested: [...p.interested, u.id] } : p)) : prev.plans,
      }))
      toast({ tone: 'violet', title: `${u.name} ha risposto al tuo dilemma 💌`, body: 'Leggi la risposta in “Like” e decidi tu.' })
    },
    [toast],
  )

  /** Opens a 1:1 match chat, respecting the slot limit (else Sala d’Attesa). */
  const openMatch = useCallback(
    (userId: string, opener: { question: string; answer: string; fromMe: boolean }, s: AppState) => {
      const now = Date.now()
      const u = s.users[userId]
      const plan = s.plans.find((p) => p.hostId === userId && planStatus(p, now) !== 'EXPIRED' && planStatus(p, now) !== 'FULL')
      const mode: Plan['mode'] = u.city === s.me.city || (plan?.mode === 'local' && s.travelDestinations.some((d) => d.toLowerCase() === u.city.toLowerCase())) ? 'local' : 'remote'
      const lim = s.lifetime ? LIFETIME_LIMITS.slots : FREE_LIMITS.slots
      const full = activeCount(s.chats) >= lim
      const chat: Chat = {
        id: uid('c'),
        planId: opener.fromMe ? plan?.id : undefined,
        peerIds: [userId],
        mode,
        title: opener.fromMe && plan ? plan.title : `Match con ${u.name}`,
        status: full ? 'waiting' : 'active',
        createdAt: now,
        deadline: !full && mode === 'local' ? now + 48 * H : undefined,
        unread: full ? 0 : 1,
        incoming: full ? { question: opener.question, answer: opener.answer } : undefined,
        messages: full
          ? []
          : [
              { id: uid('m'), from: 'system', kind: 'system', text: `⚡ È una scintilla! Foto svelate. ${mode === 'local' ? 'Avete 48 ore per vedervi dal vivo.' : 'Modalità Audio-Capsule: niente timer.'}`, at: now },
              { id: uid('m'), from: opener.fromMe ? 'me' : userId, kind: 'dilemma', question: opener.question, text: opener.answer, at: now },
            ],
      }
      return { chat, full }
    },
    [],
  )

  const likeUser = useCallback(
    (userId: string, answer: string) => {
      const now = Date.now()
      const s0 = stateRef.current
      const u = s0.users[userId]
      if (!u || !sameAgeGroup(s0.me, u)) return
      setState((prev) => ({
        ...prev,
        swipes: { ...prev.swipes, [userId]: 'like' },
        swipeHistory: [...prev.swipeHistory, userId],
        likesOut: [...prev.likesOut.filter((l) => l.userId !== userId), { userId, answer, at: now, status: 'pending' }],
        stats: { ...prev.stats, textSent: prev.stats.textSent + 1 },
        daily: bumpDaily(bumpDaily(prev.daily, 'seen'), 'answered'),
      }))
      const chance = Math.min(0.92, 0.5 + (affinity(s0.me, u) - 50) / 80)
      const matched = Math.random() < chance
      later(() => {
        const s = stateRef.current
        if (!matched) {
          setState({ ...s, likesOut: s.likesOut.map((l) => (l.userId === userId ? { ...l, status: 'missed' } : l)) })
          return
        }
        const { chat, full } = openMatch(userId, { question: u.dilemma.question, answer, fromMe: true }, s)
        setState({
          ...s,
          chats: [chat, ...s.chats],
          likesOut: s.likesOut.map((l) => (l.userId === userId ? { ...l, status: 'matched' } : l)),
          daily: bumpDaily(s.daily, 'matches'),
          plans: chat.planId ? s.plans.map((p) => (p.id === chat.planId && !p.participants.includes('me') ? { ...p, participants: [...p.participants, 'me'] } : p)) : s.plans,
        })
        setMatch({ userId, chatId: chat.id, waiting: full, answer, question: u.dilemma.question, fromMe: true })
        if (!full) scheduleReply(chat.id, 'dilemma')
      }, 1800 + Math.random() * 1600)
    },
    [later, openMatch, scheduleReply],
  )

  const acceptLike = useCallback(
    (likeId: string) => {
      const s = stateRef.current
      const like = s.likesIn.find((l) => l.id === likeId)
      if (!like || !sameAgeGroup(s.me, s.users[like.userId])) return
      const { chat, full } = openMatch(like.userId, { question: like.question, answer: like.answer, fromMe: false }, s)
      setState({ ...s, chats: [chat, ...s.chats], likesIn: s.likesIn.map((l) => (l.id === likeId ? { ...l, status: 'accepted' } : l)), swipes: { ...s.swipes, [like.userId]: 'like' }, daily: bumpDaily(s.daily, 'matches') })
      setMatch({ userId: like.userId, chatId: chat.id, waiting: full, answer: like.answer, question: like.question, fromMe: false })
    },
    [openMatch],
  )

  const createPlan = useCallback(
    (d: PlanDraft): CreateResult => {
      const s = stateRef.current
      const now = Date.now()
      const hosted = s.plans.filter((p) => p.hostId === 'me' && p.when + 3 * H > now)
      if (hosted.length >= limits.plans) return { ok: false, reason: 'limit' }
      const plan: Plan = {
        id: uid('p'),
        hostId: 'me',
        title: d.title.trim() || 'Piano senza titolo',
        category: d.category,
        mode: d.mode,
        city: s.me.city,
        habitat: d.habitat,
        district: undefined,
        when: d.when,
        whenLabel: d.whenLabel,
        capacity: d.capacity,
        participants: ['me'],
        vibes: d.vibes,
        dilemma: { question: d.dilemma.trim(), options: [] },
        details: d.details,
        privacy: d.privacy,
        cost: d.cost,
        interested: [],
        createdAt: now,
      }
      setState((prev) => ({ ...prev, plans: [plan, ...prev.plans], me: { ...prev.me, karma: prev.me.karma + 2 } }))
      toast({ tone: 'lime', title: 'Piano pubblicato ⚡', body: 'Il tuo Gatekeeper è attivo. Arriveranno risposte, non “ciao”.' })
      later(() => simulateIncomingFor(plan.id), 7000)
      return { ok: true, planId: plan.id }
    },
    [limits.plans, toast, later, simulateIncomingFor],
  )

  const setLifetime = useCallback(
    (v: boolean) => {
      const s = stateRef.current
      const lim = v ? LIFETIME_LIMITS.slots : FREE_LIMITS.slots
      const { chats, promoted } = v ? promote(s.chats, lim, Date.now()) : { chats: s.chats, promoted: [] as Chat[] }
      setState({ ...s, lifetime: v, chats, me: { ...s.me, lifetime: v } })
      announcePromoted(promoted)
    },
    [announcePromoted],
  )

  const store: Store = useMemo(() => {
    const activeChats = state.chats.filter((c) => c.status === 'active')
    const waitingChats = state.chats.filter((c) => c.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
    const now = Date.now()
    return {
      state,
      limits,
      activeChats,
      waitingChats,
      hostedActivePlans: state.plans.filter((p) => p.hostId === 'me' && p.when + 3 * H > now),
      typing,
      toasts,
      user,
      toast,
      dismissToast,
      toggleSave: (planId) =>
        setState((prev) => ({ ...prev, saved: prev.saved.includes(planId) ? prev.saved.filter((x) => x !== planId) : [...prev.saved, planId] })),
      joinPlan,
      messageUser,
      sendMessage: (chatId, text) => pushMine(chatId, { kind: 'text', text }, 'textSent'),
      sendVoice: (chatId, duration, extra) => pushMine(chatId, { kind: 'voice', duration, wave: extra?.wave ?? randomWave(), audioUrl: extra?.audioUrl }, 'voiceSent'),
      sendTrack: (chatId, title, artist) => pushMine(chatId, { kind: 'track', text: `${title} · ${artist}` }, 'textSent'),
      closeElegantly: (chatId, text) => finishChat(chatId, 'closed', text),
      evolveChat: (chatId) => finishChat(chatId, 'evolved'),
      stopClock,
      acceptWaiting,
      markRead: (chatId) =>
        setState((prev) => (prev.chats.some((c) => c.id === chatId && c.unread) ? { ...prev, chats: prev.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)) } : prev)),
      createPlan,
      simulateIncoming: () => simulateIncomingFor(),
      setLifetime,
      updateMe: (patch) => setState((prev) => ({ ...prev, me: { ...prev.me, ...patch } })),
      addTravel: (dest) => {
        const s = stateRef.current
        const clean = dest.trim()
        if (!clean) return false
        if (s.travelDestinations.length >= limits.travel) return false
        if (s.travelDestinations.some((d) => d.toLowerCase() === clean.toLowerCase())) return true
        setState((prev) => ({ ...prev, travelDestinations: [...prev.travelDestinations, clean] }))
        return true
      },
      removeTravel: (dest) => setState((prev) => ({ ...prev, travelDestinations: prev.travelDestinations.filter((d) => d !== dest) })),
      setOnboarded: () => setState((prev) => ({ ...prev, onboarded: true })),
      allowed,
      planVisible,
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
          dilemma: { question: np.dilemma, options: [] },
          photo: np.photo,
          look: np.look,
          hue: np.hue,
          bio: '',
          interests: [],
          habitats: [],
          bestie: undefined,
          karma: 100,
          badges: [],
        }
        const users = base.users
        const peers = Object.values(users).filter((u) => sameAgeGroup(me, u))
        const samples = SAMPLE_ANSWERS[np.dilemma] ?? ['Bella domanda! Te lo racconto di persona.', 'Ci devo pensare, ma ho già un’idea.']
        const likers = (minor ? peers : peers.filter((u) => ['u-federico', 'u-aurora', 'u-omar'].includes(u.id))).slice(0, 2)
        const now = Date.now()
        setTyping({})
        setMatch(null)
        setState({
          ...base,
          me,
          onboarded: true,
          chats: [],
          plans: base.plans.filter((p) => p.hostId !== 'me').map((p) => ({ ...p, participants: p.participants.filter((id) => id !== 'me') })),
          saved: [],
          likesIn: likers.map((u, i) => ({ id: uid('l'), userId: u.id, question: np.dilemma, answer: samples[i % samples.length], at: now - (i + 1) * 47 * 60_000, status: 'new' as const })),
          likesOut: [],
          swipes: {},
          swipeHistory: [],
          savedBy: peers.slice(0, 2).map((u) => u.id),
          stats: { replyTimes: [], voiceSent: 0, textSent: 0, elegantCloses: 0, ghosted: 0, clocksStopped: 0 },
          prefs: { ...base.prefs, intent: minor ? 'friends' : np.intent.includes('date') ? 'date' : 'friends', show: np.show, ageMin: minor ? 16 : Math.max(18, age - 8), ageMax: minor ? 17 : Math.min(60, age + 10) },
        })
        toast({ tone: 'lime', title: `Benvenut* su ALONG, ${me.name}`, body: minor ? 'Modalità Amici, solo con persone della tua età.' : 'Il tuo profilo è pronto. Inizia a scoprire.' })
      },
      match,
      dismissMatch: () => setMatch(null),
      likeUser,
      passUser: (userId) =>
        setState((prev) => ({ ...prev, swipes: { ...prev.swipes, [userId]: 'pass' }, swipeHistory: [...prev.swipeHistory, userId], daily: bumpDaily(prev.daily, 'seen') })),
      newDay: () => setState((prev) => ({ ...prev, daily: { day: todayKey(), seen: 0, answered: 0, matches: 0 } })),
      undoSwipe: () => {
        const s = stateRef.current
        const last = s.swipeHistory[s.swipeHistory.length - 1]
        if (!last || s.swipes[last] !== 'pass') return null
        const swipes = { ...s.swipes }
        delete swipes[last]
        setState({ ...s, swipes, swipeHistory: s.swipeHistory.slice(0, -1) })
        return last
      },
      resetDeck: () =>
        setState((prev) => {
          const keep = Object.fromEntries(Object.entries(prev.swipes).filter(([, v]) => v === 'like'))
          return { ...prev, swipes: keep, swipeHistory: prev.swipeHistory.filter((id) => keep[id]) }
        }),
      acceptLike,
      declineLike: (likeId) => {
        setState((prev) => ({ ...prev, likesIn: prev.likesIn.map((l) => (l.id === likeId ? { ...l, status: 'declined' } : l)), me: { ...prev.me, karma: prev.me.karma + 3 } }))
        toast({ tone: 'lime', title: '“Non stavolta” inviato con gentilezza', body: '+3 Karma. Nessuno resta appeso.' })
      },
      setPrefs: (p) => setState((prev) => ({ ...prev, prefs: { ...prev.prefs, ...p, ...(isMinor(prev.me) ? { intent: 'friends' as const } : {}) } })),
      proposeMeetup,
      reset: () => {
        timers.current.forEach((t) => clearTimeout(t))
        timers.current = []
        setTyping({})
        setMatch(null)
        setState({ ...createInitialState(), onboarded: false })
      },
    }
  }, [state, limits, typing, toasts, user, toast, dismissToast, joinPlan, messageUser, pushMine, finishChat, stopClock, acceptWaiting, createPlan, simulateIncomingFor, setLifetime, match, likeUser, acceptLike, proposeMeetup, allowed, planVisible])

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

/** Photos stay blurred until there is (or was) a match / chat with that person. */
export function useRevealed() {
  const { state } = useStore()
  return useCallback((id: string) => id === 'me' || state.chats.some((c) => c.peerIds.includes(id)), [state.chats])
}
