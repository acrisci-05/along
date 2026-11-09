import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RealtimeChannel, Session, SupabaseClient } from '@supabase/supabase-js'
import type { AppState, Chat, ChatStatus, Habit, Like, Look, Message, MessageKind, OutgoingLike, Prefs, ThisOrThat, Toast, User } from '../types'
import { FAREWELL, todayKey } from '../data/mock'
import { ageFromBirth, isMinor, sameAgeGroup } from '../lib/age'
import { getSupabase } from '../lib/supabase'
import { photoFingerprint } from '../lib/verify'
import { haptic, uid } from '../lib/utils'
import { Ctx, SLOTS, type Account, type MatchEvent, type Store } from './store'

/* ───────────────────────── righe del database ───────────────────────── */

const PROFILE_COLUMNS =
  'id, name, gender, intent, show_pref, city, bio, work, languages, smoke, drink, interests, this_or_that, avatar, verified, verified_at, verified_photo, lifetime, read_receipts, typing_indicator'

interface ProfileRow {
  id: string
  name: string
  gender: User['gender']
  intent: User['intent']
  show_pref: Prefs['show']
  city: string
  bio: string
  work: string | null
  languages: string[]
  smoke: Habit | null
  drink: Habit | null
  interests: string[]
  this_or_that: ThisOrThat | null
  avatar: { look?: Look; hue?: number; emoji?: string } | null
  verified: boolean
  verified_at: string | null
  verified_photo: string | null
  lifetime: boolean
  read_receipts: boolean
  typing_indicator: boolean
}
interface PhotoRow { id: string; owner: string; position: number; path: string; blurred_path: string }
interface LikeRow { id: string; from_user: string; to_user: string; question: string | null; answer: string | null; status: 'pending' | 'matched' | 'declined'; created_at: string }
interface MemberRow { chat_id: string; user_id: string; status: ChatStatus; closed_reason: string | null; last_read_at: string | null; joined_at: string }
interface ChatRow { id: string; kind: 'match' | 'crew'; created_at: string }
interface MessageRow { id: string; chat_id: string; sender: string | null; kind: MessageKind; text: string | null; question: string | null; audio_path: string | null; duration: number | null; wave: number[] | null; created_at: string }

/** Things only this device remembers (per account): discovery filters, names of blocked people. */
interface LocalBits {
  prefs: Prefs
  blockedNames: Record<string, Pick<User, 'name' | 'age' | 'hue' | 'emoji' | 'look' | 'gender'>>
}

const DEFAULT_LOOK: Look = { skin: 2, hair: 'short', hairColor: '#2a1d14', shirt: '#24473a' }

function emptyMe(): User {
  return { id: 'me', name: '', age: 18, city: 'Napoli', hue: 140, emoji: '🙂', bio: '', interests: [], gender: 'nb', intent: ['friends'], look: DEFAULT_LOOK }
}

function emptyState(): AppState {
  return {
    version: 0,
    me: emptyMe(),
    users: {},
    chats: [],
    lifetime: false,
    onboarded: false,
    swipes: {},
    swipeHistory: [],
    likesIn: [],
    likesOut: [],
    prefs: { intent: 'date', show: 'all', ageMin: 18, ageMax: 60, readReceipts: true, typingIndicator: true },
    daily: { day: todayKey(), seen: 0, liked: 0, matches: 0 },
    blocked: [],
    reports: [],
  }
}

const localKey = (id: string) => `along:u:${id}`
function readLocal(id: string): Partial<LocalBits> {
  try {
    return JSON.parse(localStorage.getItem(localKey(id)) ?? '{}') as Partial<LocalBits>
  } catch {
    return {}
  }
}
function writeLocal(id: string, bits: Partial<LocalBits>) {
  try {
    localStorage.setItem(localKey(id), JSON.stringify({ ...readLocal(id), ...bits }))
  } catch {
    /* private mode */
  }
}

function hashHue(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h) % 360
}

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0)
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('sv-SE')

/** Italian, human messages for the errors people can actually hit, plus the technical detail. */
function friendly(e: unknown): string {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e ?? '')
  const status = e && typeof e === 'object' && 'status' in e ? Number((e as { status: unknown }).status) : 0
  const detail = `(dettaglio: ${[status || null, msg || (e as Error)?.name].filter(Boolean).join(' · ') || 'nessuno'})`
  const wait = msg.match(/after (\d+) seconds?/i)?.[1]
  if (wait) return `Per sicurezza aspetta ${wait} secondi prima di chiedere un’altra email.`
  if (/rate limit|too many|security purposes/i.test(msg) || status === 429) return 'Troppi tentativi. Aspetta qualche minuto e riprova.'
  if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(msg)) return 'Codice sbagliato o scaduto. Controlla l’email o chiedine uno nuovo.'
  if (/sending|smtp|mail/i.test(msg)) return `Supabase non riesce a spedire l’email: controlla il mittente in Authentication → Emails → SMTP Settings. ${detail}`
  if (/Invalid API key/i.test(msg)) return `Chiave non valida in .env.local: ricopiala con il pulsante di copia. ${detail}`
  if (/Failed to fetch|NetworkError|network|Load failed/i.test(msg)) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Connessione assente. Controlla la rete e riprova.'
    return `Il server non ha risposto. Controlla l’indirizzo in .env.local (deve finire con .supabase.co). ${detail}`
  }
  if (status >= 500) return `Errore del server Supabase. ${detail}`
  if (/duplicate key/i.test(msg)) return 'Già fatto.'
  if (/JWT|not authenticated|Non autenticato/i.test(msg)) return 'Sessione scaduta. Accedi di nuovo.'
  return msg.replace(/^.*?ERROR:\s*/, '') || `Qualcosa non ha funzionato. ${detail}`
}

async function dataUrlToBlob(src: string): Promise<Blob> {
  return (await fetch(src)).blob()
}

/* ───────────────────────── provider ───────────────────────── */

export function RealStoreProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Account['phase']>('loading')
  // an expired or already-used email link comes back as #error=…
  const [notice] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1))
    if (!params.get('error') && !params.get('error_code')) return undefined
    window.history.replaceState(null, '', window.location.pathname)
    return params.get('error_code') === 'otp_expired' ? 'Il link è scaduto o è già stato usato. Chiedine uno nuovo.' : 'Accesso non riuscito. Riprova.'
  })
  const [email, setEmail] = useState<string>()
  const [state, setState] = useState<AppState>(emptyState)
  const [typing, setTyping] = useState<Record<string, string | undefined>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [match, setMatch] = useState<MatchEvent | null>(null)

  const sbRef = useRef<SupabaseClient | null>(null)
  const meRef = useRef<string | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const signed = useRef(new Map<string, { url: string; exp: number }>())
  const myPhotos = useRef<Array<PhotoRow & { url: string }>>([])
  const loaded = useRef(false)
  const booted = useRef(false)
  const refreshing = useRef<Promise<void> | null>(null)
  const again = useRef(false)
  const debounce = useRef<number | undefined>(undefined)
  const dbChannel = useRef<RealtimeChannel | null>(null)
  const typingChannels = useRef(new Map<string, RealtimeChannel>())
  const typingTimers = useRef(new Map<string, number>())
  const lastTypingSent = useRef(new Map<string, number>())
  const pendingSwipes = useRef<Record<string, 'like' | 'pass'>>({})

  const loc = useCallback((id: string | null) => (id === null ? 'system' : id === meRef.current ? 'me' : id), [])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = uid('t')
    setToasts((prev) => [...prev.slice(-2), { ...t, id }])
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3600)
  }, [])
  const fail = useCallback((title: string, e: unknown) => toast({ tone: 'coral', title, body: friendly(e) }), [toast])

  useEffect(() => {
    if (phase === 'ready' && meRef.current) writeLocal(meRef.current, { prefs: state.prefs })
  }, [phase, state.prefs])

  /** Signed URLs, reused while valid so images don't reload on every refresh. */
  const signUrls = useCallback(async (bucket: string, paths: string[]) => {
    const now = Date.now()
    const out = new Map<string, string>()
    const missing: string[] = []
    for (const p of paths) {
      const hit = signed.current.get(`${bucket}/${p}`)
      if (hit && hit.exp - now > 10 * 60_000) out.set(p, hit.url)
      else missing.push(p)
    }
    if (missing.length) {
      const { data } = await sbRef.current!.storage.from(bucket).createSignedUrls(missing, 3600)
      for (const d of data ?? []) {
        if (!d.signedUrl || !d.path) continue
        signed.current.set(`${bucket}/${d.path}`, { url: d.signedUrl, exp: now + 3600_000 })
        out.set(d.path, d.signedUrl)
      }
    }
    return out
  }, [])

  /* ───────────── caricamento completo dal database ───────────── */

  const load = useCallback(async () => {
    const sb = sbRef.current!
    const me = meRef.current!
    const [profilesR, agesR, photosR, swipesR, likesR, membersR, blocksR] = await Promise.all([
      sb.from('profiles').select(PROFILE_COLUMNS).order('updated_at', { ascending: false }).limit(500),
      sb.rpc('profile_ages'),
      sb.from('photos').select('id, owner, position, path, blurred_path').order('position'),
      sb.from('swipes').select('target, kind, created_at').eq('user_id', me),
      sb.from('likes').select('*').order('created_at', { ascending: false }),
      sb.from('chat_members').select('*'),
      sb.from('blocks').select('blocked'),
    ])
    const err = [profilesR, agesR, photosR, swipesR, likesR, membersR, blocksR].find((r) => r.error)?.error
    if (err) throw err

    const profiles = profilesR.data as unknown as ProfileRow[]
    const mine = profiles.find((p) => p.id === me)
    if (!mine) {
      setPhase('needsProfile')
      return
    }
    const ages = new Map((agesR.data as Array<{ id: string; age: number; birth_date: string | null }>).map((a) => [a.id, a]))
    const members = (membersR.data as MemberRow[]).filter((m) => m)
    const myChatIds = members.filter((m) => m.user_id === me).map((m) => m.chat_id)
    const [chatsR, msgsR] = myChatIds.length
      ? await Promise.all([
          sb.from('chats').select('id, kind, created_at').in('id', myChatIds),
          sb.from('messages').select('id, chat_id, sender, kind, text, question, audio_path, duration, wave, created_at').in('chat_id', myChatIds).order('created_at', { ascending: true }).limit(2000),
        ])
      : [{ data: [] as ChatRow[], error: null }, { data: [] as MessageRow[], error: null }]
    if (chatsR.error) throw chatsR.error
    if (msgsR.error) throw msgsR.error
    const chatRows = (chatsR.data as ChatRow[]).filter((c) => c.kind === 'match')
    const msgRows = msgsR.data as MessageRow[]

    const photos = photosR.data as PhotoRow[]
    const voicePaths = msgRows.filter((m) => m.audio_path).map((m) => m.audio_path!)
    const [photoUrls, voiceUrls] = await Promise.all([
      photos.length ? signUrls('photos', photos.map((p) => p.path)) : new Map<string, string>(),
      voicePaths.length ? signUrls('voice', voicePaths) : new Map<string, string>(),
    ])
    const photosOf = new Map<string, PhotoRow[]>()
    for (const p of photos) photosOf.set(p.owner, [...(photosOf.get(p.owner) ?? []), p])
    myPhotos.current = (photosOf.get(me) ?? []).map((p) => ({ ...p, url: photoUrls.get(p.path) ?? '' }))

    const local = readLocal(me)
    const toUser = (p: ProfileRow): User => {
      const rows = photosOf.get(p.id) ?? []
      const urls = rows.map((r) => photoUrls.get(r.path)).filter((u): u is string => !!u)
      const isMe = p.id === me
      return {
        id: loc(p.id),
        name: p.name,
        age: ages.get(p.id)?.age ?? 18,
        birthDate: isMe ? ages.get(p.id)?.birth_date ?? undefined : undefined,
        city: p.city,
        hue: p.avatar?.hue ?? hashHue(p.id),
        emoji: p.avatar?.emoji ?? '🙂',
        bio: p.bio,
        interests: p.interests,
        thisOrThat: p.this_or_that ?? undefined,
        lifetime: p.lifetime,
        gender: p.gender,
        intent: p.intent,
        look: p.avatar?.look ?? DEFAULT_LOOK,
        photos: urls.length ? urls : undefined,
        work: p.work ?? undefined,
        languages: p.languages,
        smoke: p.smoke ?? undefined,
        drink: p.drink ?? undefined,
        // the tick follows the photo it was given on
        verified: isMe ? p.verified : p.verified && !!rows[0] && p.verified_photo === rows[0].id,
        verifiedAt: p.verified_at ? ms(p.verified_at) : undefined,
      }
    }
    const meUser = toUser(mine)
    if (mine.verified) meUser.verifiedFor = mine.verified_photo && mine.verified_photo === myPhotos.current[0]?.id ? photoFingerprint(meUser) : 'foto-cambiata'
    const users: Record<string, User> = {}
    for (const p of profiles) if (p.id !== me) users[p.id] = toUser(p)
    const profileById = new Map(profiles.map((p) => [p.id, p]))

    // swipes & daily selection
    const today = todayKey()
    const swipes: AppState['swipes'] = {}
    const history: string[] = []
    let seen = 0
    let liked = 0
    for (const s of (swipesR.data as Array<{ target: string; kind: 'pass' | 'like'; created_at: string }>).sort((a, b) => ms(a.created_at) - ms(b.created_at))) {
      swipes[s.target] = s.kind
      history.push(s.target)
      if (dayOf(s.created_at) === today) {
        seen++
        if (s.kind === 'like') liked++
      }
    }
    Object.assign(swipes, pendingSwipes.current)

    const likes = likesR.data as LikeRow[]
    const likesIn: Like[] = likes
      .filter((l) => l.to_user === me)
      .map((l) => ({ id: l.id, userId: l.from_user, pick: l.answer ?? undefined, question: l.question ?? undefined, at: ms(l.created_at), status: l.status === 'pending' ? 'new' : l.status === 'matched' ? 'accepted' : 'declined' }))
    const likesOut: OutgoingLike[] = likes
      .filter((l) => l.from_user === me)
      .map((l) => ({ userId: l.to_user, pick: l.answer ?? undefined, at: ms(l.created_at), status: l.status === 'pending' ? 'pending' : l.status === 'matched' ? 'matched' : 'missed' }))

    // chats
    const prev = stateRef.current
    const receiptsOn = (prev.onboarded ? prev.prefs.readReceipts : mine.read_receipts) !== false
    const chats: Chat[] = chatRows.map((c) => {
      const all = members.filter((m) => m.chat_id === c.id)
      const self = all.find((m) => m.user_id === me)!
      const others = all.filter((m) => m.user_id !== me)
      const rows = msgRows.filter((m) => m.chat_id === c.id)
      const peer = others[0]?.user_id ?? ''
      const peersRead = (at: string) =>
        receiptsOn && others.length > 0 && others.every((o) => profileById.get(o.user_id)?.read_receipts !== false && o.last_read_at && o.last_read_at >= at)
      const messages: Message[] = rows.map((m) => ({
        id: m.id,
        from: loc(m.sender),
        kind: m.kind,
        text: m.text ?? undefined,
        question: m.question ?? undefined,
        duration: m.duration ?? undefined,
        wave: m.wave ?? undefined,
        audioUrl: m.audio_path ? voiceUrls.get(m.audio_path) : undefined,
        seen: m.sender === me ? peersRead(m.created_at) : undefined,
        at: ms(m.created_at),
      }))
      const opener = rows.find((m) => m.kind === 'dilemma')
      return {
        id: c.id,
        peerIds: others.map((o) => loc(o.user_id)),
        title: profileById.get(peer)?.name ?? local.blockedNames?.[peer]?.name ?? 'Qualcuno',
        messages,
        status: self.status,
        createdAt: self.status === 'waiting' ? ms(self.joined_at) : ms(c.created_at),
        closedReason: self.closed_reason ?? undefined,
        unread: rows.filter((m) => m.sender && m.sender !== me && (!self.last_read_at || m.created_at > self.last_read_at)).length,
        incoming: self.status === 'waiting' ? { question: opener?.question ?? undefined, pick: opener?.text ?? undefined } : undefined,
      }
    })
    chats.sort((a, b) => (b.messages.at(-1)?.at ?? b.createdAt) - (a.messages.at(-1)?.at ?? a.createdAt))

    const blocked = (blocksR.data as Array<{ blocked: string }>).map((b) => b.blocked)
    for (const id of blocked) {
      const cached = local.blockedNames?.[id]
      if (cached && !users[id]) users[id] = { ...emptyMe(), ...cached, id, city: '' }
    }

    const minor = isMinor(meUser)
    const age = meUser.age
    const prefs: Prefs = {
      intent: minor ? 'friends' : meUser.intent.includes('date') ? 'date' : 'friends',
      ageMin: minor ? 16 : Math.max(18, age - 8),
      ageMax: minor ? 17 : Math.min(60, age + 10),
      ...(local.prefs ?? {}),
      show: mine.show_pref,
      readReceipts: mine.read_receipts,
      typingIndicator: mine.typing_indicator,
      ...(minor ? { intent: 'friends' as const } : {}),
    }

    const next: AppState = {
      version: 1,
      me: meUser,
      users,
      chats,
      lifetime: mine.lifetime,
      onboarded: true,
      swipes,
      swipeHistory: history,
      likesIn,
      likesOut,
      prefs,
      daily: { day: today, seen, liked, matches: chatRows.filter((c) => dayOf(c.created_at) === today).length },
      blocked,
      reports: [],
    }

    // what changed since the last load → toasts and the match screen
    if (loaded.current) {
      const prevLikes = new Set(prev.likesIn.map((l) => l.id))
      for (const l of likesIn) {
        if (l.status === 'new' && !prevLikes.has(l.id)) {
          toast({ tone: 'violet', title: `Piaci a ${users[l.userId]?.name ?? 'qualcuno'}`, body: 'Guarda in “Like” e decidi tu.' })
          haptic()
        }
      }
      const prevChats = new Map(prev.chats.map((c) => [c.id, c]))
      for (const c of chats) {
        const before = prevChats.get(c.id)
        if (!before && c.peerIds.length === 1 && prev.likesOut.some((l) => l.userId === c.peerIds[0])) {
          const mineOut = likesOut.find((l) => l.userId === c.peerIds[0])
          setMatch({ userId: c.peerIds[0], chatId: c.id, waiting: c.status === 'waiting', question: users[c.peerIds[0]]?.thisOrThat?.question, pick: mineOut?.pick, fromMe: true })
          haptic([12, 60, 18])
        }
        if (before?.status === 'waiting' && c.status === 'active') toast({ tone: 'gold', title: `${c.title} è entrat* dalla Sala d’Attesa`, body: 'Uno slot si è liberato.' })
        if (before?.status === 'active' && c.status === 'closed' && c.closedReason !== 'Chiusa con gentilezza')
          toast({ tone: 'lime', title: `${c.title} ha chiuso la chat`, body: 'Con gentilezza: nessuno resta appeso.' })
      }
    }
    loaded.current = true
    setState(next)
    setPhase('ready')
  }, [loc, signUrls, toast])

  /** One refresh at a time; calls that arrive meanwhile collapse into one more. */
  const refresh = useCallback(async () => {
    if (!sbRef.current || !meRef.current) return
    if (refreshing.current) {
      again.current = true
      return refreshing.current
    }
    const run = async () => {
      do {
        again.current = false
        try {
          await load()
        } catch (e) {
          console.error('ALONG caricamento', e)
          if (!loaded.current) {
            setPhase('error')
            return
          }
        }
      } while (again.current)
    }
    refreshing.current = run().finally(() => (refreshing.current = null))
    return refreshing.current
  }, [load])

  const soon = useCallback(() => {
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => void refresh(), 250)
  }, [refresh])

  /* ───────────── tempo reale ───────────── */

  const stopRealtime = useCallback(() => {
    const sb = sbRef.current
    if (dbChannel.current && sb) void sb.removeChannel(dbChannel.current)
    dbChannel.current = null
    typingChannels.current.forEach((ch) => sb && void sb.removeChannel(ch))
    typingChannels.current.clear()
  }, [])

  const startRealtime = useCallback(() => {
    stopRealtime()
    const ch = sbRef.current!.channel(`db:${meRef.current}`)
    for (const table of ['messages', 'chat_members', 'likes']) ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => soon())
    ch.subscribe()
    dbChannel.current = ch
  }, [soon, stopRealtime])

  // "sta scrivendo": un canale broadcast per ogni chat attiva
  const activeIds = state.chats.filter((c) => c.status === 'active').map((c) => c.id).join(',')
  useEffect(() => {
    const sb = sbRef.current
    if (!sb || phase !== 'ready') return
    const want = new Set(activeIds ? activeIds.split(',') : [])
    for (const [id, ch] of typingChannels.current) {
      if (!want.has(id)) {
        void sb.removeChannel(ch)
        typingChannels.current.delete(id)
      }
    }
    for (const id of want) {
      if (typingChannels.current.has(id)) continue
      const ch = sb.channel(`typing:${id}`, { config: { broadcast: { self: false } } })
      ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
        const who = (payload as { user?: string })?.user
        if (!who || who === meRef.current || stateRef.current.prefs.typingIndicator === false) return
        setTyping((t) => ({ ...t, [id]: who }))
        window.clearTimeout(typingTimers.current.get(id))
        typingTimers.current.set(id, window.setTimeout(() => setTyping((t) => ({ ...t, [id]: undefined })), 3500))
      })
      ch.subscribe()
      typingChannels.current.set(id, ch)
    }
  }, [activeIds, phase])

  // a new message from someone clears their "typing"
  useEffect(() => {
    setTyping((t) => {
      let changed = false
      const next = { ...t }
      for (const c of state.chats) {
        const last = c.messages.at(-1)
        if (next[c.id] && last && last.from === next[c.id]) {
          next[c.id] = undefined
          changed = true
        }
      }
      return changed ? next : t
    })
  }, [state.chats])

  /* ───────────── sessione ───────────── */

  const onSession = useCallback(
    async (session: Session | null) => {
      const id = session?.user.id ?? null
      if (booted.current && id === meRef.current && (id === null || loaded.current)) return
      booted.current = true
      meRef.current = id
      loaded.current = false
      pendingSwipes.current = {}
      setMatch(null)
      setTyping({})
      if (!id) {
        stopRealtime()
        setState(emptyState())
        setEmail(undefined)
        setPhase('signedOut')
        return
      }
      setEmail(session?.user.email ?? undefined)
      setPhase('loading')
      await refresh()
      if (loaded.current) startRealtime()
    },
    [refresh, startRealtime, stopRealtime],
  )

  useEffect(() => {
    let off: (() => void) | undefined
    let alive = true
    getSupabase()
      .then((sb) => {
        if (!alive) return
        sbRef.current = sb
        const { data } = sb.auth.onAuthStateChange((event, session) => {
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') window.setTimeout(() => void onSession(session), 0)
        })
        off = () => data.subscription.unsubscribe()
      })
      .catch(() => setPhase('error'))
    return () => {
      alive = false
      off?.()
    }
  }, [onSession])

  // fresh data even without events (and when you come back to the tab)
  useEffect(() => {
    if (phase !== 'ready') return
    const iv = window.setInterval(soon, 60_000)
    window.addEventListener('focus', soon)
    return () => {
      clearInterval(iv)
      window.removeEventListener('focus', soon)
    }
  }, [phase, soon])

  /* ───────────── foto ───────────── */

  const syncPhotos = useCallback(async (photos: string[]) => {
    const sb = sbRef.current!
    const me = meRef.current!
    const current = myPhotos.current
    const rows: PhotoRow[] = []
    for (const [i, src] of photos.entries()) {
      const existing = current.find((r) => r.url === src)
      if (existing) {
        rows.push({ id: existing.id, owner: me, position: i, path: existing.path, blurred_path: existing.blurred_path })
        continue
      }
      const id = crypto.randomUUID()
      const path = `${me}/${id}.jpg`
      const up = await sb.storage.from('photos').upload(path, await dataUrlToBlob(src), { contentType: 'image/jpeg', upsert: false })
      if (up.error) throw up.error
      rows.push({ id, owner: me, position: i, path, blurred_path: path })
    }
    const removed = current.filter((r) => !rows.some((x) => x.id === r.id))
    const del = await sb.from('photos').delete().eq('owner', me)
    if (del.error) throw del.error
    if (rows.length) {
      const ins = await sb.from('photos').insert(rows)
      if (ins.error) throw ins.error
    }
    if (removed.length) {
      await sb.storage.from('photos').remove(removed.map((r) => r.path))
      const oldBlurred = removed.filter((r) => r.blurred_path !== r.path).map((r) => r.blurred_path)
      if (oldBlurred.length) await sb.storage.from('photos-blurred').remove(oldBlurred)
    }
  }, [])

  /* ───────────── azioni ───────────── */

  const call = useCallback(
    async (title: string, fn: (sb: SupabaseClient) => PromiseLike<{ error: unknown }>) => {
      const sb = sbRef.current
      if (!sb) return false
      const { error } = await fn(sb)
      soon()
      if (error) {
        fail(title, error)
        return false
      }
      return true
    },
    [fail, soon],
  )

  const pushLocalMessage = useCallback((chatId: string, m: Omit<Message, 'id' | 'from' | 'at'>) => {
    setState((prev) => ({
      ...prev,
      chats: prev.chats.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, { ...m, id: uid('tmp'), from: 'me', at: Date.now() }] } : c)),
    }))
  }, [])

  const swipe = useCallback(
    async (userId: string, kind: 'like' | 'pass') => {
      pendingSwipes.current[userId] = kind
      const { error } = await sbRef.current!.from('swipes').insert({ user_id: meRef.current, target: userId, kind })
      delete pendingSwipes.current[userId]
      if (error && error.code !== '23505') {
        fail(/20 profili/.test(error.message) ? 'Selezione di oggi finita' : 'Non salvato', error)
        return false
      }
      return true
    },
    [fail],
  )

  const store: Store = useMemo(() => {
    const activeChats = state.chats.filter((c) => c.status === 'active')
    const waitingChats = state.chats.filter((c) => c.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
    const user = (id: string): User => (id === 'me' ? state.me : state.users[id] ?? { ...emptyMe(), id, name: 'Utente', emoji: '👤' })
    const allowed = (id: string) => {
      if (id === 'me' || id === 'system') return true
      const u = state.users[id]
      return !!u && sameAgeGroup(state.me, u) && !state.blocked.includes(id)
    }

    const account: Account = {
      phase,
      email,
      notice,
      retry: () => {
        setPhase('loading')
        if (!sbRef.current) {
          window.location.reload()
          return
        }
        void refresh().then(() => loaded.current && startRealtime())
      },
      sendCode: async (address) => {
        const sb = sbRef.current
        if (!sb) return 'Servizio non raggiungibile. Riprova tra poco.'
        const clean = address.trim().toLowerCase()
        const { error } = await sb.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin } })
        if (error) {
          console.error('ALONG invio email', error)
          return friendly(error)
        }
        setEmail(clean)
        return null
      },
      verifyCode: async (code) => {
        const sb = sbRef.current
        if (!sb || !email) return 'Inserisci prima la tua email.'
        const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
        return error ? friendly(error) : null
      },
      signOut: async () => {
        await sbRef.current?.auth.signOut()
      },
      deleteAccount: async () => {
        const sb = sbRef.current
        const me = meRef.current
        if (!sb || !me) return 'Sessione scaduta.'
        try {
          for (const bucket of ['photos', 'photos-blurred']) {
            const { data } = await sb.storage.from(bucket).list(me, { limit: 100 })
            if (data?.length) await sb.storage.from(bucket).remove(data.map((f) => `${me}/${f.name}`))
          }
          for (const c of stateRef.current.chats) {
            const { data } = await sb.storage.from('voice').list(`${c.id}/${me}`, { limit: 1000 })
            if (data?.length) await sb.storage.from('voice').remove(data.map((f) => `${c.id}/${me}/${f.name}`))
          }
          const { error } = await sb.rpc('delete_my_account')
          if (error) return friendly(error)
          try {
            localStorage.removeItem(localKey(me))
          } catch {
            /* ignore */
          }
          await sb.auth.signOut({ scope: 'local' })
          return null
        } catch (e) {
          return friendly(e)
        }
      },
    }

    return {
      demo: false,
      account,
      state,
      limits: { slots: SLOTS },
      activeChats,
      waitingChats,
      typing,
      toasts,
      user,
      toast,
      dismissToast: (id) => setToasts((p) => p.filter((t) => t.id !== id)),
      allowed,
      match,
      dismissMatch: () => setMatch(null),

      likeUser: (userId, chosen) => {
        const s = stateRef.current
        const u = s.users[userId]
        if (!u) return
        haptic()
        setState((prev) => ({
          ...prev,
          swipes: { ...prev.swipes, [userId]: 'like' },
          swipeHistory: [...prev.swipeHistory, userId],
          likesOut: [...prev.likesOut.filter((l) => l.userId !== userId), { userId, pick: chosen, at: Date.now(), status: 'pending' }],
          daily: { ...prev.daily, seen: prev.daily.seen + (prev.swipes[userId] ? 0 : 1), liked: prev.daily.liked + 1 },
        }))
        void (async () => {
          if (!s.swipes[userId] && !(await swipe(userId, 'like'))) return soon()
          const { error } = await sbRef.current!.from('likes').insert({
            from_user: meRef.current,
            to_user: userId,
            question: chosen ? u.thisOrThat?.question ?? null : null,
            answer: chosen ?? null,
          })
          if (error && error.code !== '23505') fail('Like non inviato', error)
          soon()
        })()
      },
      passUser: (userId) => {
        setState((prev) => ({ ...prev, swipes: { ...prev.swipes, [userId]: 'pass' }, swipeHistory: [...prev.swipeHistory, userId], daily: { ...prev.daily, seen: prev.daily.seen + 1 } }))
        void swipe(userId, 'pass').then(soon)
      },
      undoSwipe: () => {
        const s = stateRef.current
        const last = s.swipeHistory.at(-1)
        if (!last || s.swipes[last] !== 'pass') return null
        const swipes = { ...s.swipes }
        delete swipes[last]
        setState({ ...s, swipes, swipeHistory: s.swipeHistory.slice(0, -1), daily: { ...s.daily, seen: Math.max(0, s.daily.seen - 1) } })
        void sbRef.current!.from('swipes').delete().eq('user_id', meRef.current).eq('target', last).then(() => soon())
        return last
      },
      acceptLike: (likeId) => {
        const like = stateRef.current.likesIn.find((l) => l.id === likeId)
        if (!like) return
        setState((prev) => ({ ...prev, likesIn: prev.likesIn.map((l) => (l.id === likeId ? { ...l, status: 'accepted' } : l)) }))
        void sbRef.current!.rpc('accept_like', { like_id: likeId }).then(async ({ data, error }) => {
          if (error) {
            fail('Match non riuscito', error)
            soon()
            return
          }
          await refresh()
          const chat = stateRef.current.chats.find((c) => c.id === data)
          setMatch({ userId: like.userId, chatId: data as string, waiting: chat?.status === 'waiting', question: like.question, pick: like.pick, fromMe: false })
          haptic([12, 60, 18])
        })
      },
      declineLike: (likeId) => {
        setState((prev) => ({ ...prev, likesIn: prev.likesIn.map((l) => (l.id === likeId ? { ...l, status: 'declined' } : l)) }))
        void call('Non riuscito', (sb) => sb.rpc('decline_like', { like_id: likeId }))
      },

      sendMessage: (chatId, text) => {
        pushLocalMessage(chatId, { kind: 'text', text })
        void call('Messaggio non inviato', (sb) => sb.from('messages').insert({ chat_id: chatId, sender: meRef.current, kind: 'text', text }))
      },
      sendTrack: (chatId, title, artist) => {
        const text = `${title} · ${artist}`
        pushLocalMessage(chatId, { kind: 'track', text })
        void call('Brano non inviato', (sb) => sb.from('messages').insert({ chat_id: chatId, sender: meRef.current, kind: 'track', text }))
      },
      sendVoice: (chatId, duration, extra) => {
        if (!extra?.blob) {
          toast({ tone: 'coral', title: 'Vocale non registrato', body: 'Consenti l’accesso al microfono e riprova.' })
          return
        }
        const blob = extra.blob
        const wave = extra.wave ?? []
        pushLocalMessage(chatId, { kind: 'voice', duration, wave, audioUrl: extra.audioUrl })
        const type = (blob.type || 'audio/webm').split(';')[0]
        const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : 'webm'
        const path = `${chatId}/${meRef.current}/${crypto.randomUUID()}.${ext}`
        void (async () => {
          const up = await sbRef.current!.storage.from('voice').upload(path, blob, { contentType: type })
          if (up.error) {
            fail('Vocale non inviato', up.error)
            soon()
            return
          }
          await call('Vocale non inviato', (sb) =>
            sb.from('messages').insert({ chat_id: chatId, sender: meRef.current, kind: 'voice', audio_path: path, duration: Math.min(600, Math.round(duration)), wave: wave.map((w) => Math.round(w)) }),
          )
        })()
      },
      notifyTyping: (chatId) => {
        if (stateRef.current.prefs.typingIndicator === false) return
        const last = lastTypingSent.current.get(chatId) ?? 0
        if (Date.now() - last < 2000) return
        lastTypingSent.current.set(chatId, Date.now())
        void typingChannels.current.get(chatId)?.send({ type: 'broadcast', event: 'typing', payload: { user: meRef.current } })
      },
      closeElegantly: (chatId, text) => {
        void (async () => {
          await sbRef.current!.from('messages').insert({ chat_id: chatId, sender: meRef.current, kind: 'farewell', text: text ?? FAREWELL })
          const ok = await call('Chiusura non riuscita', (sb) => sb.rpc('finish_chat', { cid: chatId, new_status: 'closed', reason: 'Chiusa con gentilezza' }))
          if (ok) toast({ tone: 'lime', title: 'Chat chiusa con gentilezza', body: 'L’altra persona riceve il tuo messaggio. Nessuno resta appeso.' })
        })()
      },
      acceptWaiting: async (chatId) => {
        const { data, error } = await sbRef.current!.rpc('activate_chat', { cid: chatId })
        if (error) {
          fail('Non riuscito', error)
          return false
        }
        await refresh()
        return data === true
      },
      markRead: (chatId) => {
        setState((prev) => (prev.chats.some((c) => c.id === chatId && c.unread) ? { ...prev, chats: prev.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)) } : prev))
        void sbRef.current!.from('chat_members').update({ last_read_at: new Date().toISOString() }).eq('chat_id', chatId).eq('user_id', meRef.current).then(() => {})
      },

      updateMe: (patch) => {
        setState((prev) => ({ ...prev, me: { ...prev.me, ...patch } }))
        const row: Record<string, unknown> = {}
        if (patch.name !== undefined) row.name = patch.name.trim()
        if (patch.bio !== undefined) row.bio = patch.bio
        if (patch.work !== undefined) row.work = patch.work || null
        if (patch.languages !== undefined) row.languages = patch.languages
        if (patch.smoke !== undefined) row.smoke = patch.smoke ?? null
        if (patch.drink !== undefined) row.drink = patch.drink ?? null
        if (patch.interests !== undefined) row.interests = patch.interests.slice(0, 8)
        if (patch.thisOrThat !== undefined) row.this_or_that = patch.thisOrThat ?? null
        if (patch.gender !== undefined) row.gender = patch.gender
        if (patch.intent !== undefined) row.intent = patch.intent
        if (patch.city !== undefined) row.city = patch.city
        if (patch.look !== undefined || patch.hue !== undefined || patch.emoji !== undefined) {
          const me = stateRef.current.me
          row.avatar = { look: patch.look ?? me.look, hue: patch.hue ?? me.hue, emoji: patch.emoji ?? me.emoji }
        }
        void (async () => {
          try {
            if (Object.keys(row).length) {
              const { error } = await sbRef.current!.from('profiles').update(row).eq('id', meRef.current)
              if (error) throw error
            }
            if (patch.photos !== undefined) await syncPhotos(patch.photos ?? [])
          } catch (e) {
            fail('Profilo non salvato', e)
          }
          soon()
        })()
      },
      setPrefs: (p) => {
        setState((prev) => ({ ...prev, prefs: { ...prev.prefs, ...p, ...(isMinor(prev.me) ? { intent: 'friends' as const } : {}) } }))
        const row: Record<string, unknown> = {}
        if (p.show !== undefined) row.show_pref = p.show
        if (p.readReceipts !== undefined) row.read_receipts = p.readReceipts
        if (p.typingIndicator !== undefined) row.typing_indicator = p.typingIndicator
        if (Object.keys(row).length) void call('Impostazione non salvata', (sb) => sb.from('profiles').update(row).eq('id', meRef.current))
      },
      completeOnboarding: async (np) => {
        const sb = sbRef.current
        const me = meRef.current
        if (!sb || !me) return 'Sessione scaduta. Accedi di nuovo.'
        const age = ageFromBirth(np.birthDate)
        const minor = age < 18
        const { error } = await sb.from('profiles').insert({
          id: me,
          name: np.name.trim(),
          birth_date: np.birthDate,
          gender: np.gender,
          intent: minor ? ['friends'] : np.intent,
          show_pref: np.show,
          this_or_that: np.thisOrThat,
          avatar: { look: np.look, hue: np.hue },
        })
        if (error && error.code !== '23505') return friendly(error)
        writeLocal(me, {
          prefs: { intent: minor ? 'friends' : np.intent.includes('date') ? 'date' : 'friends', show: np.show, ageMin: minor ? 16 : Math.max(18, age - 8), ageMax: minor ? 17 : Math.min(60, age + 10), readReceipts: true, typingIndicator: true },
        })
        try {
          myPhotos.current = []
          if (np.photos.length) await syncPhotos(np.photos)
        } catch (e) {
          toast({ tone: 'coral', title: 'Foto non caricate', body: `${friendly(e)} Puoi aggiungerle dal profilo.` })
        }
        loaded.current = false
        await refresh()
        if (!loaded.current) return 'Profilo creato, ma non riesco a caricarlo. Ricarica la pagina.'
        startRealtime()
        toast({ tone: 'lime', title: `Benvenut* su ALONG, ${np.name.trim()}`, body: minor ? 'Modalità Amici, solo con persone della tua età.' : 'Il tuo profilo è pronto.' })
        return null
      },

      blockUser: (userId) => {
        const u = stateRef.current.users[userId]
        const me = meRef.current!
        if (u) writeLocal(me, { blockedNames: { ...(readLocal(me).blockedNames ?? {}), [userId]: { name: u.name, age: u.age, hue: u.hue, emoji: u.emoji, look: u.look, gender: u.gender } } })
        setState((prev) => ({ ...prev, blocked: prev.blocked.includes(userId) ? prev.blocked : [...prev.blocked, userId], likesIn: prev.likesIn.filter((l) => l.userId !== userId) }))
        void call('Blocco non riuscito', (sb) => sb.rpc('block_user', { target: userId }))
      },
      unblockUser: (userId) => {
        setState((prev) => ({ ...prev, blocked: prev.blocked.filter((x) => x !== userId) }))
        void call('Sblocco non riuscito', (sb) => sb.from('blocks').delete().eq('blocker', meRef.current).eq('blocked', userId))
      },
      reportUser: (userId, reason, details) => {
        void call('Segnalazione non inviata', (sb) => sb.from('reports').insert({ reporter: meRef.current, reported: userId, reason: reason.slice(0, 80), details: details?.trim().slice(0, 400) || null }))
      },
      verifyMe: async () => {
        const minor = isMinor(stateRef.current.me)
        const { error } = await sbRef.current!.rpc('complete_verification', { method: minor ? 'selfie+document' : 'selfie' })
        if (error) return friendly(error)
        await refresh()
        return null
      },

      // solo nella demo
      simulateIncoming: () => {},
      injectSuspicious: () => {},
      setLifetime: () => toast({ tone: 'gold', title: 'Pagamenti in arrivo', body: 'Potrai sostenere ALONG a breve. Grazie!' }),
      newDay: () => {},
      resetDeck: () => {},
      reset: () => {},
    }
  }, [state, phase, email, notice, typing, toasts, match, toast, fail, soon, call, refresh, swipe, pushLocalMessage, syncPhotos, startRealtime])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
