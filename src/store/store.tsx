import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppState, Chat, Message, Plan, Toast, User } from '../types'
import { AUTO_REPLIES, createInitialState, DEMO_VERSION, FAREWELL, INCOMING_POOL } from '../data/mock'
import { H, randomWave, uid } from '../lib/utils'

const KEY = 'along:state'

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.version === DEMO_VERSION) return parsed
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
  sendVoice: (chatId: string, duration: number) => void
  sendTrack: (chatId: string, title: string, artist: string) => void
  closeElegantly: (chatId: string) => void
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
}

const Ctx = createContext<Store | null>(null)

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
      later(() => setTyping((t) => ({ ...t, [chatId]: from })), 700)
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
      const plan = stateRef.current.plans.find((p) => p.id === planId)
      if (!plan) return { ok: false, reason: 'full' }
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
    (chatId: string, status: 'closed' | 'evolved') => {
      const now = Date.now()
      const s = stateRef.current
      const chat = s.chats.find((c) => c.id === chatId)
      if (!chat) return
      const wasActive = chat.status === 'active'
      const extra: Message[] =
        status === 'closed'
          ? [{ id: uid('m'), from: 'me', kind: 'farewell', text: FAREWELL, at: now }]
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
      const myPlans = s.plans.filter((p) => p.hostId === 'me').sort((a, b) => b.createdAt - a.createdAt)
      const plan = myPlans.find((p) => p.id === planId) ?? myPlans[0]
      if (!plan) {
        toast({ tone: 'coral', title: 'Nessun piano attivo', body: 'Crea un piano per ricevere richieste.' })
        return
      }
      const busy = new Set(s.chats.filter((c) => c.planId === plan.id && c.status !== 'closed').flatMap((c) => c.peerIds))
      const candidate = INCOMING_POOL.find((x) => !busy.has(x.userId)) ?? pick(INCOMING_POOL)
      const u = s.users[candidate.userId]
      const now = Date.now()
      const full = activeCount(s.chats) >= limits.slots
      const chat: Chat = {
        id: uid('c'),
        planId: plan.id,
        peerIds: [candidate.userId],
        mode: plan.mode,
        title: plan.title,
        status: full ? 'waiting' : 'active',
        createdAt: now,
        deadline: !full && plan.mode === 'local' ? now + 48 * H : undefined,
        unread: full ? 0 : 1,
        incoming: full ? { question: plan.dilemma.question, answer: candidate.answer } : undefined,
        messages: full ? [] : [{ id: uid('m'), from: candidate.userId, kind: 'dilemma', question: plan.dilemma.question, text: candidate.answer, at: now }],
      }
      setState((prev) => ({
        ...prev,
        chats: [chat, ...prev.chats],
        plans: prev.plans.map((p) => (p.id === plan.id && !p.interested.includes(candidate.userId) ? { ...p, interested: [...p.interested, candidate.userId] } : p)),
      }))
      toast(
        full
          ? { tone: 'gold', title: `${u.name} è in Sala d’Attesa 🔒`, body: `Ha risposto al tuo dilemma. Libera uno slot per farl* entrare.` }
          : { tone: 'violet', title: `${u.name} vuole unirsi`, body: `Ha risposto al dilemma di “${plan.title}”.` },
      )
    },
    [limits.slots, toast],
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
      sendVoice: (chatId, duration) => pushMine(chatId, { kind: 'voice', duration, wave: randomWave() }, 'voiceSent'),
      sendTrack: (chatId, title, artist) => pushMine(chatId, { kind: 'track', text: `${title} — ${artist}` }, 'textSent'),
      closeElegantly: (chatId) => finishChat(chatId, 'closed'),
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
      reset: () => {
        timers.current.forEach((t) => clearTimeout(t))
        timers.current = []
        setTyping({})
        setState({ ...createInitialState(), onboarded: true })
        toast({ tone: 'cyan', title: 'Dati demo ripristinati', body: 'Tutto è tornato allo stato iniziale.' })
      },
    }
  }, [state, limits, typing, toasts, user, toast, dismissToast, joinPlan, messageUser, pushMine, finishChat, stopClock, acceptWaiting, createPlan, simulateIncomingFor, setLifetime])

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
