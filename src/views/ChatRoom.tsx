import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Calculator, Calendar, CheckCircle2, Hand, KeyRound, Lock, MapPin, Mic, Music2, Send, Square, Timer, Unlock, Users } from 'lucide-react'
import type { Chat, Message, Plan, User } from '../types'
import { FAREWELL } from '../data/mock'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { cn, euro, formatCountdown, meaningfulCount, planWhen, timerTone, TONE_TEXT } from '../lib/utils'
import { Avatar, BeamAvatar, Button, Sheet, VoiceBubble } from '../components/ui'

const TRACKS = [
  { title: 'Plastic Love', artist: 'Mariya Takeuchi' },
  { title: 'Nightcall', artist: 'Kavinsky' },
  { title: 'Teardrop', artist: 'Massive Attack' },
  { title: 'Napule è', artist: 'Pino Daniele' },
  { title: 'Midnight City', artist: 'M83' },
]

export function ChatRoom({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const store = useStore()
  const { state, user, typing, markRead } = store
  const chat = state.chats.find((c) => c.id === chatId)
  const plan = state.plans.find((p) => p.id === chat?.planId)
  const now = useNow(1000)
  const scroller = useRef<HTMLDivElement>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [showTracks, setShowTracks] = useState(false)

  useEffect(() => {
    if (chat?.unread) markRead(chat.id)
  }, [chat?.unread, chat?.id, markRead])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [chat?.messages.length, typing[chatId]])

  if (!chat) return null
  const peers = chat.peerIds.map(user)
  const readOnly = chat.status !== 'active'
  const tone = timerTone(chat, now)
  const meaningful = meaningfulCount(chat)
  const blurred = !!plan?.privacy && meaningful < 5
  const typingUser = typing[chatId] ? user(typing[chatId]!) : null

  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col bg-ink"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      role="dialog"
      aria-label={`Chat: ${chat.title}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-60 bg-[radial-gradient(ellipse_at_top,rgb(139_92_246/0.22),transparent_70%)]" aria-hidden />
      {/* header */}
      <header className="glass-strong relative z-10 flex items-center gap-3 border-x-0 border-t-0 px-3 pb-3 pt-3">
        <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-cream/5" aria-label="Torna alla crew">
          <ArrowLeft size={20} />
        </button>
        <div className="flex -space-x-3">
          {peers.slice(0, 3).map((p) => (
            <BeamAvatar key={p.id} tone={readOnly ? 'lime' : tone}>
              <Avatar user={p} size={34} blur={blurred} />
            </BeamAvatar>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-bold">{peers.map((p) => p.name).join(', ')}</p>
          <p className="truncate text-[11.5px] text-cream/50">{chat.title}</p>
        </div>
        {!readOnly && chat.mode === 'local' && chat.deadline && (
          <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full bg-cream/5 px-2.5 py-1 text-[12px] font-bold tabular-nums', TONE_TEXT[tone])} aria-label="Timer anti-ghosting">
            {chat.clockStopped ? <CheckCircle2 size={13} /> : <Timer size={13} />}
            {chat.clockStopped ? 'Fermo' : formatCountdown(chat.deadline - now)}
          </span>
        )}
        {chat.mode === 'remote' && !readOnly && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
            <Mic size={12} /> Capsule
          </span>
        )}
      </header>

      {/* body */}
      <div ref={scroller} className="no-scrollbar relative min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <PlanHub chat={chat} plan={plan} peers={peers} now={now} readOnly={readOnly} meaningful={meaningful} />

        <div className="space-y-2.5 pt-2" aria-live="polite">
          {chat.messages.map((m, i) => (
            <Bubble key={m.id} m={m} prev={chat.messages[i - 1]} author={m.from === 'me' ? state.me : m.from === 'system' ? undefined : user(m.from)} blurred={blurred} group={peers.length > 1} />
          ))}
          <AnimatePresence>
            {typingUser && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[12px] text-cream/50">
                <Avatar user={typingUser} size={22} blur={blurred} />
                <span className="flex gap-1 rounded-2xl bg-slate-card/70 px-3 py-2.5">
                  {[0, 1, 2].map((d) => (
                    <motion.span key={d} className="size-1.5 rounded-full bg-cream/60" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.12 }} />
                  ))}
                </span>
                {typingUser.name} sta scrivendo…
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {readOnly && (
          <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-3 text-center text-[12.5px] text-cream/55">
            <Lock size={14} className="mx-auto mb-1" />
            Chat in sola lettura · {chat.closedReason ?? 'Conclusa'}
          </div>
        )}
      </div>

      {/* actions + composer */}
      {!readOnly && (
        <div className="glass-strong relative z-10 border-x-0 border-b-0 px-3 pb-3 pt-2">
          <div className="no-scrollbar -mx-3 mb-2 flex gap-2 overflow-x-auto px-3">
            {chat.mode === 'local' && !chat.clockStopped && (
              <button onClick={() => store.stopClock(chat.id)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-cyan px-3 text-[12px] font-bold text-ink">
                <Square size={12} fill="currentColor" /> Stop the Clock
              </button>
            )}
            <button onClick={() => store.evolveChat(chat.id)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-lime/40 px-3 text-[12px] font-semibold text-lime hover:bg-lime/10">
              🤝 {chat.mode === 'local' ? 'Ci siamo visti · libera slot' : 'Contatti scambiati'}
            </button>
            {chat.mode === 'remote' && (
              <button onClick={() => setShowTracks(true)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-violet/40 px-3 text-[12px] font-semibold text-violet-300 hover:bg-violet/10">
                <Music2 size={13} /> Condividi brano
              </button>
            )}
            <button onClick={() => setConfirmClose(true)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-cream/45 hover:text-cream/80">
              <Hand size={13} /> Chiudi con eleganza
            </button>
          </div>
          <Composer chat={chat} />
        </div>
      )}

      <Sheet open={confirmClose} onClose={() => setConfirmClose(false)} title="Chiusura con Eleganza">
        <p className="text-[13.5px] text-cream/65">Invieremo questo congedo gentile. La chat diventa di sola lettura e lo slot si libera subito per chi è in Sala d’Attesa.</p>
        <div className="mt-4 rounded-2xl bg-cream p-4 text-ink">
          <p className="font-display text-[16px] font-semibold leading-snug">“{FAREWELL}”</p>
        </div>
        <p className="mt-3 text-center text-[12.5px] font-semibold text-lime">+15 Punti Karma · niente ghosting</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirmClose(false)}>
            Annulla
          </Button>
          <Button
            onClick={() => {
              store.closeElegantly(chat.id)
              setConfirmClose(false)
            }}
          >
            Invia e chiudi
          </Button>
        </div>
      </Sheet>

      <Sheet open={showTracks} onClose={() => setShowTracks(false)} title="Condividi un brano">
        <ul className="space-y-2">
          {TRACKS.map((t) => (
            <li key={t.title}>
              <button
                onClick={() => {
                  store.sendTrack(chat.id, t.title, t.artist)
                  setShowTracks(false)
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-cream/[0.04] p-2.5 text-left hover:bg-cream/[0.08]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[conic-gradient(from_45deg,#8B5CF6,#FF806D,#D7FF66,#8B5CF6)]">💿</span>
                <span>
                  <span className="block text-[14px] font-semibold">{t.title}</span>
                  <span className="block text-[12px] text-cream/50">{t.artist}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </motion.div>
  )
}

function PlanHub({ chat, plan, peers, now, readOnly, meaningful }: { chat: Chat; plan?: Plan; peers: User[]; now: number; readOnly: boolean; meaningful: number }) {
  const nav = useNav()
  const crewSize = plan ? plan.participants.length : peers.length + 1
  const hasBill = plan && (plan.category === 'food' || plan.category === 'drink' || plan.category === 'sport')
  return (
    <section className="space-y-2.5" aria-label="Plan Hub">
      {plan && (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => nav.openPlan(plan.id)} className="glass rounded-2xl p-2.5 text-left">
            <MapPin size={14} className="text-coral" />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-cream/40">Dove</p>
            <p className="line-clamp-2 text-[12px] font-medium leading-tight">{plan.habitat}</p>
          </button>
          <div className="glass rounded-2xl p-2.5">
            <Calendar size={14} className="text-cyan" />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-cream/40">Quando</p>
            <p className="line-clamp-2 text-[12px] font-medium leading-tight">{planWhen(plan, now)}</p>
          </div>
          <div className="glass rounded-2xl p-2.5">
            <Users size={14} className="text-lime" />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-cream/40">Chi viene</p>
            <p className="text-[12px] font-medium leading-tight">
              {plan.participants.length}/{plan.capacity} in crew
            </p>
          </div>
        </div>
      )}

      {chat.mode === 'local' && !readOnly && chat.deadline && !chat.clockStopped && (
        <div className={cn('flex items-center gap-3 rounded-2xl border p-3', chat.deadline - now < 6 * 3_600_000 ? 'border-alarm/30 bg-alarm/10' : 'border-cyan/20 bg-cyan/5')}>
          <Timer size={18} className={TONE_TEXT[timerTone(chat, now)]} />
          <p className="flex-1 text-[12.5px] text-cream/75">
            Avete <span className={cn('font-bold tabular-nums', TONE_TEXT[timerTone(chat, now)])}>{formatCountdown(chat.deadline - now)}</span> per fissare il ritrovo. Poi la connessione scade.
          </p>
        </div>
      )}
      {chat.clockStopped && (
        <div className="flex items-center gap-2 rounded-2xl border border-lime/30 bg-lime/10 p-3 text-[12.5px] text-lime">
          <CheckCircle2 size={16} /> Ritrovo confermato. Timer fermo. Ci vediamo lì!
        </div>
      )}
      {chat.mode === 'remote' && (
        <div className="flex items-center gap-3 rounded-2xl border border-violet/25 bg-violet/10 p-3">
          <Mic size={18} className="text-violet-300" />
          <p className="flex-1 text-[12.5px] text-cream/75">
            <span className="font-semibold text-cream">Audio-Capsule Pen-Pal.</span> Niente timer, niente fretta: lasciatevi note vocali asincrone quando volete.
          </p>
        </div>
      )}

      {plan?.privacy && (
        <div className="rounded-2xl border border-violet/25 bg-violet/5 p-3">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-1.5 font-semibold">
              {meaningful >= 5 ? <Unlock size={14} className="text-lime" /> : <Lock size={14} className="text-violet-300" />} Progressive Unblur
            </span>
            <span className="tabular-nums text-cream/60">{Math.min(5, meaningful)}/5 messaggi significativi</span>
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-500', i < meaningful ? (meaningful >= 5 ? 'bg-lime' : 'bg-violet') : 'bg-cream/10')} />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-cream/45">{meaningful >= 5 ? 'Foto svelate in alta definizione ✨' : 'Messaggi di almeno 12 caratteri o note vocali.'}</p>
        </div>
      )}

      {hasBill && <SplitBill chat={chat} total={plan.cost ?? 0} people={crewSize} disabled={readOnly} />}
    </section>
  )
}

function SplitBill({ chat, total, people, disabled }: { chat: Chat; total: number; people: number; disabled: boolean }) {
  const { sendMessage } = useStore()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(total ? String(total) : '')
  const [heads, setHeads] = useState(Math.max(2, people))
  const [tip, setTip] = useState(0)
  const value = Number(amount.replace(',', '.')) || 0
  const per = heads ? (value * (1 + tip / 100)) / heads : 0
  return (
    <div className="glass rounded-2xl">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 p-3 text-left" aria-expanded={open}>
        <Calculator size={16} className="text-coral" />
        <span className="flex-1 text-[13px] font-semibold">Split the Bill</span>
        <span className="font-display text-[14px] font-bold tabular-nums text-coral">{euro(per)}</span>
        <span className="text-[11px] text-cream/45">a testa</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-3 px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="text-[11px] text-cream/50">Totale (€)</span>
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                    className="mt-1 h-10 w-full rounded-xl border border-cream/10 bg-ink/60 px-3 tabular-nums focus:border-coral/60 focus:outline-none"
                  />
                </label>
                <div>
                  <span className="text-[11px] text-cream/50">Persone</span>
                  <div className="mt-1 flex h-10 items-center justify-between rounded-xl border border-cream/10 bg-ink/60 px-1">
                    <button onClick={() => setHeads((h) => Math.max(1, h - 1))} className="size-8 rounded-lg hover:bg-cream/10" aria-label="Meno persone">
                      −
                    </button>
                    <span className="font-semibold tabular-nums">{heads}</span>
                    <button onClick={() => setHeads((h) => Math.min(12, h + 1))} className="size-8 rounded-lg hover:bg-cream/10" aria-label="Più persone">
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-cream/50">Mancia</span>
                {[0, 5, 10].map((t) => (
                  <button key={t} onClick={() => setTip(t)} aria-pressed={tip === t} className={cn('h-8 rounded-full px-3 text-[12px] font-semibold', tip === t ? 'bg-coral text-ink' : 'bg-cream/5 text-cream/70')}>
                    {t}%
                  </button>
                ))}
              </div>
              <Button size="sm" variant="coral" className="w-full" disabled={disabled || !value} onClick={() => sendMessage(chat.id, `🧾 Split the Bill: ${euro(value)} totali${tip ? ` + ${tip}% mancia` : ''} ÷ ${heads} = ${euro(per)} a testa`)}>
                Invia riepilogo in chat
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Bubble({ m, prev, author, blurred, group }: { m: Message; prev?: Message; author?: User; blurred: boolean; group: boolean }) {
  const mine = m.from === 'me'
  if (m.kind === 'system')
    return (
      <p className="mx-auto w-fit max-w-[90%] rounded-full bg-cream/[0.05] px-3 py-1.5 text-center text-[11.5px] text-cream/55">{m.text}</p>
    )
  const sameAuthor = prev?.from === m.from
  const time = new Date(m.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  if (m.kind === 'dilemma')
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className={cn('max-w-[86%] overflow-hidden rounded-3xl border border-lime/40', mine ? 'ml-auto' : '')}>
        <div className="bg-lime/10 px-3.5 py-2">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-lime">
            <KeyRound size={12} /> Dilemma Gatekeeper
          </p>
          <p className="mt-0.5 text-[12.5px] text-cream/70">{m.question}</p>
        </div>
        <div className="bg-ink/60 px-3.5 py-2.5">
          <p className="text-[11px] text-cream/45">{mine ? 'La tua risposta' : `Risposta di ${author?.name}`}</p>
          <p className="font-display text-[16px] font-semibold leading-snug">“{m.text}”</p>
        </div>
      </motion.div>
    )

  if (m.kind === 'farewell')
    return (
      <div className="ml-auto max-w-[86%] rounded-3xl bg-cream p-3.5 text-ink">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink/50">🤍 Chiusura con eleganza</p>
        <p className="mt-1 font-display text-[15px] font-semibold leading-snug">{m.text}</p>
      </div>
    )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
      {!mine && author && <div className="w-7 shrink-0">{!sameAuthor && <Avatar user={author} size={28} blur={blurred} />}</div>}
      <div className={cn('max-w-[78%]', mine && 'text-right')}>
        {!mine && group && !sameAuthor && <p className="mb-0.5 ml-1 text-[11px] font-semibold text-cream/50">{author?.name}</p>}
        <div
          className={cn(
            'inline-block rounded-[20px] px-3.5 py-2 text-left text-[14.5px] leading-snug',
            mine ? 'rounded-br-md bg-lime text-ink' : 'rounded-bl-md border border-cream/5 bg-slate-card/80 text-cream',
          )}
        >
          {m.kind === 'voice' ? (
            <VoiceBubble duration={m.duration ?? 8} wave={m.wave ?? [4, 6, 8, 5, 7]} mine={mine} />
          ) : m.kind === 'track' ? (
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-[conic-gradient(from_45deg,#8B5CF6,#FF806D,#D7FF66,#8B5CF6)]">💿</span>
              <span>
                <span className={cn('block text-[10px] font-bold uppercase tracking-wider', mine ? 'text-ink/50' : 'text-violet-300')}>Brano condiviso</span>
                <span className="block font-semibold">{m.text}</span>
              </span>
            </span>
          ) : (
            m.text
          )}
        </div>
        <p className="mt-0.5 px-1 text-[10px] text-cream/30">{time}</p>
      </div>
    </motion.div>
  )
}

function Composer({ chat }: { chat: Chat }) {
  const { sendMessage, sendVoice } = useStore()
  const [text, setText] = useState('')
  const [recStart, setRecStart] = useState<number | null>(null)
  const now = useNow(200)
  const elapsed = recStart ? Math.floor((now - recStart) / 1000) : 0
  const bars = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])

  const send = () => {
    const t = text.trim()
    if (!t) return
    sendMessage(chat.id, t)
    setText('')
  }

  if (recStart)
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => setRecStart(null)} className="h-11 rounded-2xl px-3 text-[13px] text-cream/60 hover:text-cream" aria-label="Annulla registrazione">
          Annulla
        </button>
        <div className="flex h-11 flex-1 items-center gap-2 rounded-2xl bg-violet/15 px-3" aria-live="polite">
          <span className="size-2.5 animate-pulse rounded-full bg-alarm" />
          <span className="text-[13px] font-semibold tabular-nums">
            0:{String(elapsed).padStart(2, '0')}
          </span>
          <div className="flex h-6 flex-1 items-center gap-[2px] overflow-hidden" aria-hidden>
            {bars.map((i) => (
              <span key={i} className="w-[3px] origin-center animate-wave rounded-full bg-violet-300" style={{ height: '100%', animationDelay: `${(i % 6) * 0.11}s` }} />
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            sendVoice(chat.id, Math.max(1, elapsed))
            setRecStart(null)
          }}
          className="grid size-11 place-items-center rounded-2xl bg-violet text-cream glow-violet"
          aria-label="Invia nota vocale"
        >
          <Send size={18} />
        </button>
      </div>
    )

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Messaggio</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={chat.mode === 'remote' ? 'Scrivi o lascia una capsula audio…' : 'Fissa dove e quando…'}
          className="h-11 w-full rounded-2xl border border-cream/10 bg-ink/70 px-4 text-[14.5px] placeholder:text-cream/30 focus:border-lime/50 focus:outline-none"
        />
      </label>
      {text.trim() ? (
        <button type="submit" className="grid size-11 place-items-center rounded-2xl bg-lime text-ink glow-lime" aria-label="Invia">
          <Send size={18} />
        </button>
      ) : (
        <button type="button" onClick={() => setRecStart(Date.now())} className={cn('grid size-11 place-items-center rounded-2xl', chat.mode === 'remote' ? 'bg-violet text-cream glow-violet' : 'bg-cream/10 text-cream')} aria-label="Registra nota vocale">
          <Mic size={18} />
        </button>
      )}
    </form>
  )
}
