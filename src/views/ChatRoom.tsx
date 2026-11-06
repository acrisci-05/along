import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Ban, CalendarCheck, Flag, ShieldAlert, Calculator, Check, CheckCheck, CheckCircle2, ChevronRight, Hand, KeyRound, Lock, MapPin, Mic, MoreVertical, Music2, Plus, Send, Square, Unlock, UserRound, Users, X } from 'lucide-react'
import type { Chat, Message, Plan, User } from '../types'
import { FAREWELLS, HABITATS } from '../data/mock'
import { INCOMING_COPY, OUTGOING_COPY, scanIncoming, scanOutgoing, type OutgoingRisk } from '../lib/safety'
import { isMinor } from '../lib/age'
import { suggestMeetup } from '../lib/meetup'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { cn, euro, formatCountdown, meaningfulCount, timerTone } from '../lib/utils'
import { Avatar, Button, Sheet, VoiceBubble } from '../components/ui'

const TRACKS = [
  { title: 'Plastic Love', artist: 'Mariya Takeuchi' },
  { title: 'Nightcall', artist: 'Kavinsky' },
  { title: 'Teardrop', artist: 'Massive Attack' },
  { title: 'Napule è', artist: 'Pino Daniele' },
  { title: 'Midnight City', artist: 'M83' },
]

const H = 3_600_000
const TIMER_COLOR = { cyan: 'bg-brand', lime: 'bg-brand', violet: 'bg-brand', ember: 'bg-ember', alarm: 'bg-alarm' } as const
const TIMER_TEXT = { cyan: 'text-brand', lime: 'text-brand', violet: 'text-brand', ember: 'text-ember', alarm: 'text-alarm' } as const

type Panel = null | 'details' | 'actions' | 'proposal' | 'bill' | 'tracks' | 'farewell' | 'menu'

export function ChatRoom({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const store = useStore()
  const { state, user, typing, markRead } = store
  const nav = useNav()
  const chat = state.chats.find((c) => c.id === chatId)
  const plan = state.plans.find((p) => p.id === chat?.planId)
  const now = useNow(1000)
  const scroller = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const receipts = state.prefs.readReceipts !== false
  const showTyping = state.prefs.typingIndicator !== false

  useEffect(() => {
    if (chat?.unread) markRead(chat.id)
  }, [chat?.unread, chat?.id, markRead])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [chat?.messages.length, typing[chatId]])

  if (!chat) return null
  const peers = chat.peerIds.map(user)
  const readOnly = chat.status !== 'active'
  const meaningful = meaningfulCount(chat)
  const blurred = !!plan?.privacy && peers.length > 1 && meaningful < 5
  const typingUser = showTyping && typing[chatId] ? user(typing[chatId]!) : null
  const lastProposal = [...chat.messages].reverse().find((m) => m.kind === 'proposal' && m.proposal)?.proposal
  const lastMine = [...chat.messages].reverse().find((m) => m.from === 'me')?.id
  let lastPeerIdx = -1
  chat.messages.forEach((m, i) => {
    if (m.from !== 'me' && m.from !== 'system') lastPeerIdx = i
  })
  const close = () => setPanel(null)

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
      {/* header */}
      <header className="relative z-10 border-b border-line bg-ink">
        <div className="flex items-center gap-2.5 px-2 pb-2 pt-3">
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-cream/5" aria-label="Torna alla crew">
            <ArrowLeft size={20} />
          </button>
          <button onClick={() => peers.length === 1 && nav.openUser(peers[0].id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <div className="flex -space-x-3">
              {peers.slice(0, 3).map((p) => (
                <Avatar key={p.id} user={p} size={36} blur={blurred} ring />
              ))}
            </div>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold">{peers.map((p) => p.name).join(', ')}</span>
              <span className="block truncate text-xs text-muted">{typingUser ? 'sta scrivendo…' : readOnly ? chat.closedReason ?? 'Conclusa' : chat.mode === 'remote' ? 'A distanza · capsule audio' : chat.title}</span>
            </span>
          </button>
          {!readOnly && (
            <button onClick={() => setPanel('menu')} className="grid size-10 place-items-center rounded-full hover:bg-cream/5" aria-label="Altre opzioni">
              <MoreVertical size={19} />
            </button>
          )}
        </div>

        {/* pinned ticket */}
        <button onClick={() => setPanel('details')} className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-3 py-2 text-left" aria-label="Dettagli dell’uscita">
          <CalendarCheck size={18} className={chat.clockStopped ? 'text-brand' : 'text-muted'} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {lastProposal ? lastProposal.title : plan ? plan.title : 'Nessuna uscita ancora'}
            </span>
            <span className="block truncate text-xs text-muted">
              {lastProposal
                ? `${lastProposal.when} · ${lastProposal.place}${lastProposal.status === 'accepted' ? ' · confermata' : ' · in attesa'}`
                : plan
                  ? `${plan.habitat} · ${plan.participants.length}/${plan.capacity} in crew`
                  : 'Tocca per proporre quando e dove vedervi'}
            </span>
          </span>
          <ChevronRight size={16} className="text-muted" />
        </button>

        {/* consuming timer bar */}
        {!readOnly && <TimerBar chat={chat} now={now} />}
      </header>

      {/* body */}
      <div ref={scroller} className="no-scrollbar relative min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4" aria-live="polite">
        {chat.messages.map((m, i) => (
          <Bubble
            key={m.id}
            m={m.from === 'me' && !m.seen && i < lastPeerIdx ? { ...m, seen: true } : m}
            prev={chat.messages[i - 1]}
            author={m.from === 'me' ? state.me : m.from === 'system' ? undefined : user(m.from)}
            blurred={blurred}
            group={peers.length > 1}
            receipts={receipts}
            last={m.id === lastMine}
            onReport={(id) => nav.openSafety(id, 'report')}
          />
        ))}
        <AnimatePresence>
          {typingUser && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-muted">
              <Avatar user={typingUser} size={24} blur={blurred} />
              <span className="flex gap-1 rounded-2xl bg-surface-2 px-3 py-2.5" aria-label={`${typingUser.name} sta scrivendo`}>
                {[0, 1, 2].map((d) => (
                  <motion.span key={d} className="size-1.5 rounded-full bg-cream/60" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.12 }} />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {readOnly && (
          <div className="rounded-xl border border-line bg-surface p-3 text-center text-sm text-muted">
            <Lock size={14} className="mx-auto mb-1" />
            Chat in sola lettura · {chat.closedReason ?? 'Conclusa'}
          </div>
        )}
      </div>

      {/* composer */}
      {!readOnly && (
        <div className="border-t border-line bg-ink px-3 pb-3 pt-2">
          <Composer chat={chat} onPlus={() => setPanel('actions')} />
        </div>
      )}

      {/* ---- panels ---- */}
      <Sheet open={panel === 'actions'} onClose={close} title="Azioni">
        <ul className="space-y-1.5">
          {[
            !chat.clockStopped && { icon: CalendarCheck, label: 'Proponi un’uscita', sub: 'Cosa, quando e dove, già compilato', go: 'proposal' as Panel },
            { icon: Calculator, label: 'Split the Bill', sub: 'Dividi la spesa a testa', go: 'bill' as Panel },
            { icon: Music2, label: 'Condividi un brano', sub: 'Una canzone per lei/lui', go: 'tracks' as Panel },
            {
              icon: Users,
              label: chat.mode === 'local' ? 'Ci siamo visti, libera lo slot' : 'Contatti scambiati, libera lo slot',
              sub: 'La chat si archivia, +10 Karma',
              run: () => {
                store.evolveChat(chat.id)
                close()
              },
            },
            { icon: Hand, label: 'Chiudi con eleganza', sub: 'Un congedo gentile, +15 Karma', go: 'farewell' as Panel },
          ]
            .filter(Boolean)
            .map((a) => {
              const it = a as { icon: typeof Plus; label: string; sub: string; go?: Panel; run?: () => void }
              return (
                <li key={it.label}>
                  <button onClick={() => (it.run ? it.run() : setPanel(it.go!))} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface">
                    <span className="grid size-10 place-items-center rounded-xl bg-surface">
                      <it.icon size={18} />
                    </span>
                    <span>
                      <span className="block text-base font-semibold">{it.label}</span>
                      <span className="block text-sm text-muted">{it.sub}</span>
                    </span>
                  </button>
                </li>
              )
            })}
        </ul>
      </Sheet>

      <Sheet open={panel === 'menu'} onClose={close} title="Opzioni">
        <div className="space-y-1.5">
          {peers.length === 1 && (
            <button
              onClick={() => {
                close()
                nav.openUser(peers[0].id)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface"
            >
              <UserRound size={18} /> Vedi profilo
            </button>
          )}
          <button onClick={() => setPanel('details')} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface">
            <CalendarCheck size={18} /> Dettagli dell’uscita
          </button>
          <button onClick={() => setPanel('farewell')} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface">
            <Hand size={18} /> Chiudi con eleganza
          </button>
          {peers.map((p) => (
            <div key={p.id} className="grid grid-cols-2 gap-1.5 border-t border-line pt-1.5">
              <button
                onClick={() => {
                  close()
                  nav.openSafety(p.id, 'block')
                }}
                className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-left hover:bg-surface"
              >
                <Ban size={17} /> Blocca {peers.length > 1 ? p.name : ''}
              </button>
              <button
                onClick={() => {
                  close()
                  nav.openSafety(p.id, 'report')
                }}
                className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-left text-alarm hover:bg-surface"
              >
                <Flag size={17} /> Segnala {peers.length > 1 ? p.name : ''}
              </button>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={panel === 'details'} onClose={close} title="L’uscita">
        <Details chat={chat} plan={plan} peers={peers} meaningful={meaningful} now={now} readOnly={readOnly} proposal={lastProposal} onPropose={() => setPanel('proposal')} onBill={() => setPanel('bill')} onStop={() => { store.stopClock(chat.id); close() }} />
      </Sheet>

      <Sheet open={panel === 'bill'} onClose={close} title="Split the Bill">
        <SplitBill chat={chat} total={plan?.cost ?? 0} people={plan ? plan.participants.length : peers.length + 1} disabled={readOnly} onSent={close} />
      </Sheet>

      <FarewellSheet
        open={panel === 'farewell'}
        onClose={close}
        name={peers.map((p) => p.name).join(', ')}
        onSend={(text) => {
          store.closeElegantly(chat.id, text)
          close()
        }}
      />

      <ProposalSheet
        open={panel === 'proposal'}
        onClose={close}
        initial={suggestMeetup(store.state, chat.peerIds[0], chat)}
        onSend={(p) => {
          store.proposeMeetup(chat.id, p)
          close()
        }}
      />

      <Sheet open={panel === 'tracks'} onClose={close} title="Condividi un brano">
        <ul className="space-y-1.5">
          {TRACKS.map((t) => (
            <li key={t.title}>
              <button
                onClick={() => {
                  store.sendTrack(chat.id, t.title, t.artist)
                  close()
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-surface">
                  <Music2 size={17} />
                </span>
                <span>
                  <span className="block text-base font-semibold">{t.title}</span>
                  <span className="block text-sm text-muted">{t.artist}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </motion.div>
  )
}

function TimerBar({ chat, now }: { chat: Chat; now: number }) {
  if (chat.mode === 'remote' || !chat.deadline)
    return <p className="px-4 pb-2 text-xs text-muted">A distanza: niente timer, lasciatevi capsule audio quando volete.</p>
  if (chat.clockStopped)
    return (
      <p className="flex items-center gap-1.5 px-4 pb-2 text-xs font-semibold text-brand">
        <CheckCircle2 size={13} /> Uscita confermata, timer fermo
      </p>
    )
  const left = Math.max(0, chat.deadline - now)
  const pct = Math.min(100, (left / (48 * H)) * 100)
  const tone = timerTone(chat, now)
  return (
    <div className="px-4 pb-2.5" role="timer" aria-label={`Tempo rimasto per fissare l’uscita: ${formatCountdown(left)}`}>
      <div className="h-1 overflow-hidden rounded-full bg-surface-2">
        <motion.div className={cn('h-full rounded-full', TIMER_COLOR[tone], tone === 'alarm' && 'animate-pulse')} initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
      </div>
      <p className="mt-1 flex justify-between text-xs">
        <span className="text-muted">Tempo per fissare l’uscita</span>
        <span className={cn('font-semibold tabular-nums', TIMER_TEXT[tone])}>{formatCountdown(left)} rimaste</span>
      </p>
    </div>
  )
}

function Details({
  chat,
  plan,
  peers,
  meaningful,
  now,
  readOnly,
  proposal,
  onPropose,
  onBill,
  onStop,
}: {
  chat: Chat
  plan?: Plan
  peers: User[]
  meaningful: number
  now: number
  readOnly: boolean
  proposal?: Message['proposal']
  onPropose: () => void
  onBill: () => void
  onStop: () => void
}) {
  const rows: Array<[string, string]> = proposal
    ? [
        ['Cosa', proposal.title],
        ['Quando', proposal.when],
        ['Dove', proposal.place],
        ['Stato', proposal.status === 'accepted' ? 'Confermata da entrambi' : 'In attesa di risposta'],
      ]
    : plan
      ? [
          ['Piano', plan.title],
          ['Dove', `${plan.habitat}${plan.district ? `, ${plan.district}` : ''}`],
          ['Crew', `${plan.participants.length}/${plan.capacity} persone`],
        ]
      : [['Uscita', 'Ancora da proporre']]
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-line rounded-xl border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-3.5 py-2.5 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 px-3.5 py-2.5 text-sm">
          <dt className="text-muted">Con</dt>
          <dd className="text-right font-semibold">{peers.map((p) => p.name).join(', ')}</dd>
        </div>
        {chat.mode === 'local' && chat.deadline && (
          <div className="flex justify-between gap-4 px-3.5 py-2.5 text-sm">
            <dt className="text-muted">Timer 48h</dt>
            <dd className="text-right font-semibold">{chat.clockStopped ? 'Fermo' : `${formatCountdown(chat.deadline - now)} rimaste`}</dd>
          </div>
        )}
      </dl>

      {plan?.privacy && peers.length > 1 && (
        <div className="rounded-xl border border-line p-3">
          <p className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              {meaningful >= 5 ? <Unlock size={14} className="text-brand" /> : <Lock size={14} />} Foto della crew
            </span>
            <span className="tabular-nums text-muted">{Math.min(5, meaningful)}/5 messaggi</span>
          </p>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full', i < meaningful ? 'bg-brand' : 'bg-surface-2')} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">{meaningful >= 5 ? 'Foto svelate.' : 'Si svelano dopo 5 messaggi significativi (almeno 12 caratteri o vocali).'}</p>
        </div>
      )}

      {!readOnly && (
        <div className="grid gap-2">
          {!chat.clockStopped && (
            <Button className="w-full rounded-full" onClick={onPropose}>
              <CalendarCheck size={17} /> {proposal ? 'Proponi un’altra uscita' : 'Proponi un’uscita'}
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={onBill}>
            <Calculator size={16} /> Split the Bill
          </Button>
          {chat.mode === 'local' && !chat.clockStopped && (
            <button onClick={onStop} className="flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold text-muted hover:text-cream">
              <Square size={11} fill="currentColor" /> Vi siete già messi d’accordo? Ferma il timer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FarewellSheet({ open, onClose, name, onSend }: { open: boolean; onClose: () => void; name: string; onSend: (text: string) => void }) {
  const [choice, setChoice] = useState(0)
  const [extra, setExtra] = useState('')
  useEffect(() => {
    if (open) {
      setChoice(0)
      setExtra('')
    }
  }, [open])
  const text = `${FAREWELLS[choice].text}${extra.trim() ? ` ${extra.trim()}` : ''}`
  return (
    <Sheet open={open} onClose={onClose} title="Chiudi con eleganza">
      <p className="text-sm text-muted">Un congedo gentile a {name}. La chat diventa di sola lettura e lo slot si libera subito.</p>
      <div className="mt-4 space-y-2" role="radiogroup" aria-label="Messaggio di congedo">
        {FAREWELLS.map((f, i) => (
          <button
            key={f.label}
            role="radio"
            aria-checked={choice === i}
            onClick={() => setChoice(i)}
            className={cn('w-full rounded-xl border p-3 text-left', choice === i ? 'border-brand bg-forest' : 'border-line hover:border-cream/30')}
          >
            <span className="block text-sm font-semibold">{f.label}</span>
            <span className="mt-0.5 block text-sm text-cream/70">{f.text}</span>
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="text-sm font-semibold text-muted">Aggiungi una frase tua (facoltativo)</span>
        <input value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={120} placeholder="Es. Grazie per la chiacchierata sui vinili." className="mt-1 h-11 w-full rounded-xl border border-line bg-ink px-3.5 text-cream placeholder:text-cream/30 focus:border-brand focus:outline-none" />
      </label>
      <p className="mt-3 text-center text-sm font-semibold text-brand">+15 Karma, niente ghosting</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        <Button onClick={() => onSend(text)}>Invia e chiudi</Button>
      </div>
    </Sheet>
  )
}

function SplitBill({ chat, total, people, disabled, onSent }: { chat: Chat; total: number; people: number; disabled: boolean; onSent?: () => void }) {
  const { sendMessage } = useStore()
  const [open, setOpen] = useState(true)
  const [amount, setAmount] = useState(total ? String(total) : '')
  const [heads, setHeads] = useState(Math.max(2, people))
  const [tip, setTip] = useState(0)
  const value = Number(amount.replace(',', '.')) || 0
  const per = heads ? (value * (1 + tip / 100)) / heads : 0
  return (
    <div className="glass rounded-2xl">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 p-3 text-left" aria-expanded={open}>
        <Calculator size={16} className="text-brand" />
        <span className="flex-1 text-sm font-semibold">Split the Bill</span>
        <span className="font-display text-base font-bold tabular-nums text-brand">{euro(per)}</span>
        <span className="text-xs text-cream/45">a testa</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-3 px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="text-xs text-cream/50">Totale (€)</span>
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                    className="mt-1 h-10 w-full rounded-xl border border-line bg-ink px-3 tabular-nums focus:border-brand/60 focus:outline-none"
                  />
                </label>
                <div>
                  <span className="text-xs text-cream/50">Persone</span>
                  <div className="mt-1 flex h-10 items-center justify-between rounded-xl border border-line bg-ink px-1">
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
                <span className="text-xs text-cream/50">Mancia</span>
                {[0, 5, 10].map((t) => (
                  <button key={t} onClick={() => setTip(t)} aria-pressed={tip === t} className={cn('h-8 rounded-md px-3 text-sm font-semibold', tip === t ? 'bg-brand text-ink' : 'bg-cream/5 text-cream/70')}>
                    {t}%
                  </button>
                ))}
              </div>
              <Button size="sm" variant="coral" className="w-full" disabled={disabled || !value} onClick={() => {
                  sendMessage(chat.id, `Split the Bill: ${euro(value)} totali${tip ? ` + ${tip}% mancia` : ''} ÷ ${heads} = ${euro(per)} a testa`)
                  onSent?.()
                }}>
                Invia riepilogo in chat
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Bubble({ m, prev, author, blurred, group, receipts, last, onReport }: { m: Message; prev?: Message; author?: User; blurred: boolean; group: boolean; receipts: boolean; last: boolean; onReport: (userId: string) => void }) {
  const mine = m.from === 'me'
  if (m.kind === 'system')
    return (
      <p className="mx-auto w-fit max-w-[90%] rounded-md bg-surface px-3 py-1.5 text-center text-xs text-muted">{m.text}</p>
    )
  const sameAuthor = prev?.from === m.from
  const time = new Date(m.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  if (m.kind === 'dilemma')
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className={cn('max-w-[86%] overflow-hidden rounded-2xl border border-line', mine ? 'ml-auto' : '')}>
        <div className="bg-surface px-3.5 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <KeyRound size={12} /> Il dilemma
          </p>
          <p className="mt-0.5 text-sm text-cream/75">{m.question}</p>
        </div>
        <div className={cn('px-3.5 py-2.5', mine ? 'bg-forest' : 'bg-surface-2')}>
          <p className="text-xs text-cream/55">{mine ? 'La tua risposta' : `La risposta di ${author?.name}`}</p>
          <p className="text-base font-semibold leading-snug">“{m.text}”</p>
        </div>
      </motion.div>
    )

  if (m.kind === 'proposal' && m.proposal) {
    const ok = m.proposal.status === 'accepted'
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('max-w-[86%] overflow-hidden rounded-2xl border', mine ? 'ml-auto' : '', ok ? 'border-brand/50 bg-forest' : 'border-line bg-surface')}>
        <div className="px-3.5 pb-2.5 pt-3">
          <p className="text-xs font-semibold text-brand">{mine ? 'Hai proposto un’uscita' : `${author?.name} propone un’uscita`}</p>
          <p className="mt-0.5 text-base font-bold leading-snug text-cream">{m.proposal.title}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-cream/75">
            <span className="flex items-center gap-1">
              <CalendarCheck size={13} /> {m.proposal.when}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={13} /> {m.proposal.place}
            </span>
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-cream/15 px-3.5 py-2 text-sm">
          <span className={ok ? 'font-semibold text-brand' : 'text-muted'}>{ok ? 'Confermata da entrambi' : 'In attesa di risposta'}</span>
          {ok && <CheckCircle2 size={16} className="text-brand" />}
        </div>
      </motion.div>
    )
  }

  if (m.kind === 'farewell')
    return (
      <div className="ml-auto max-w-[86%] rounded-2xl border border-line bg-surface p-3.5">
        <p className="text-xs font-semibold text-muted">Chiusura con eleganza</p>
        <p className="mt-1 text-base leading-snug">{m.text}</p>
      </div>
    )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
      {!mine && author && <div className="w-7 shrink-0">{!sameAuthor && <Avatar user={author} size={28} blur={blurred} />}</div>}
      <div className={cn('max-w-[78%]', mine && 'text-right')}>
        {!mine && group && !sameAuthor && <p className="mb-0.5 ml-1 text-xs font-semibold text-cream/50">{author?.name}</p>}
        <div
          className={cn(
            'inline-block rounded-2xl px-3.5 py-2 text-left text-base leading-snug',
            mine ? 'rounded-br-md bg-forest text-cream' : 'rounded-bl-md bg-surface-2 text-cream',
          )}
        >
          {m.kind === 'voice' ? (
            <VoiceBubble duration={m.duration ?? 8} wave={m.wave ?? [4, 6, 8, 5, 7]} mine={mine} audioUrl={m.audioUrl} />
          ) : m.kind === 'track' ? (
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-ink/40">
                <Music2 size={16} />
              </span>
              <span>
                <span className="block text-xs font-semibold text-cream/60">Brano condiviso</span>
                <span className="block font-semibold">{m.text}</span>
              </span>
            </span>
          ) : (
            m.text
          )}
        </div>
        <p className="mt-0.5 flex items-center justify-end gap-1 px-1 text-xs text-cream/35" style={mine ? undefined : { justifyContent: 'flex-start' }}>
          {time}
          {mine && receipts && (m.seen ? <CheckCheck size={14} className="text-brand" aria-label="Visualizzato" /> : <Check size={14} aria-label="Inviato" />)}
        </p>
        {mine && receipts && last && m.seen && <p className="px-1 text-xs text-muted">Visualizzato</p>}
        {!mine && author && m.kind === 'text' && m.text && scanIncoming(m.text) && (
          <div className="mt-1.5 max-w-[19rem] rounded-xl border border-gold/40 bg-gold/10 p-2.5 text-left" role="alert">
            <p className="flex items-center gap-1.5 text-xs font-bold text-gold">
              <ShieldAlert size={14} /> Attenzione
            </p>
            <p className="mt-0.5 text-sm text-cream/85">{INCOMING_COPY[scanIncoming(m.text)!]}</p>
            <button onClick={() => onReport(author.id)} className="mt-1.5 text-sm font-semibold text-alarm hover:underline">
              Segnala {author.name}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Composer({ chat, onPlus }: { chat: Chat; onPlus: () => void }) {
  const { sendMessage, sendVoice, toast, state } = useStore()
  const [text, setText] = useState('')
  const [risk, setRisk] = useState<OutgoingRisk | null>(null)
  const noVoice = isMinor(state.me) && chat.peerIds.length === 1
  const [rec, setRec] = useState<null | { start: number; real: boolean }>(null)
  const [levels, setLevels] = useState<number[]>(() => Array(24).fill(2))
  const media = useRef<{ recorder?: MediaRecorder; stream?: MediaStream; chunks: Blob[]; ctx?: AudioContext; raf?: number; samples: number[] }>({ chunks: [], samples: [] })
  const now = useNow(250)
  const elapsed = rec ? Math.floor((now - rec.start) / 1000) : 0

  const send = (force = false) => {
    const t = text.trim()
    if (!t) return
    const r = scanOutgoing(t)
    if (r && !force) {
      setRisk(r)
      return
    }
    sendMessage(chat.id, t)
    setText('')
    setRisk(null)
  }

  const cleanup = () => {
    const m = media.current
    if (m.raf) cancelAnimationFrame(m.raf)
    m.stream?.getTracks().forEach((t) => t.stop())
    m.ctx?.close().catch(() => {})
    media.current = { chunks: [], samples: [] }
  }

  useEffect(() => cleanup, [])

  const startRec = async () => {
    // real microphone first, simulated fallback
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const m = { chunks: [] as Blob[], samples: [] as number[], stream, recorder } as typeof media.current
      recorder.ondataavailable = (e) => e.data.size && m.chunks.push(e.data)
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(buf)
        let peak = 0
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
        const lvl = Math.min(11, 2 + Math.round((peak / 128) * 14))
        m.samples.push(lvl)
        setLevels((l) => [...l.slice(1), lvl])
        m.raf = requestAnimationFrame(tick)
      }
      m.ctx = ctx
      media.current = m
      recorder.start()
      tick()
      setRec({ start: Date.now(), real: true })
    } catch {
      setRec({ start: Date.now(), real: false })
      toast({ tone: 'gold', title: 'Microfono non disponibile', body: 'Registro una nota vocale simulata.' })
    }
  }

  const stopRec = (sendIt: boolean) => {
    const duration = Math.max(1, elapsed)
    if (!rec) return
    if (!rec.real) {
      if (sendIt) sendVoice(chat.id, duration)
      setRec(null)
      return
    }
    const m = media.current
    const finish = () => {
      if (sendIt) {
        const blob = new Blob(m.chunks, { type: m.recorder?.mimeType || 'audio/webm' })
        const step = Math.max(1, Math.floor(m.samples.length / 22))
        const wave = Array.from({ length: 22 }, (_, i) => m.samples[i * step] ?? 3)
        sendVoice(chat.id, duration, { audioUrl: URL.createObjectURL(blob), wave })
      }
      cleanup()
      setRec(null)
      setLevels(Array(24).fill(2))
    }
    if (m.recorder && m.recorder.state !== 'inactive') {
      m.recorder.onstop = finish
      m.recorder.stop()
    } else finish()
  }

  if (rec)
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => stopRec(false)} className="grid size-11 place-items-center rounded-full text-muted hover:text-cream" aria-label="Annulla registrazione">
          <X size={20} />
        </button>
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-surface px-4" aria-live="polite">
          <span className="size-2.5 animate-pulse rounded-full bg-alarm" />
          <span className="text-sm font-semibold tabular-nums">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </span>
          <div className="flex h-6 flex-1 items-center justify-end gap-[2px] overflow-hidden" aria-hidden>
            {(rec.real ? levels : levels.map((_, i) => 3 + ((i * 7 + elapsed * 3) % 8))).map((v, i) => (
              <span key={i} className="w-[3px] rounded-full bg-brand" style={{ height: `${v * 9}%` }} />
            ))}
          </div>
          <span className="sr-only">{rec.real ? 'Registrazione dal microfono' : 'Registrazione simulata'}</span>
        </div>
        <button onClick={() => stopRec(true)} className="grid size-11 place-items-center rounded-full bg-brand text-ink" aria-label="Invia nota vocale">
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
      <button type="button" onClick={onPlus} className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-cream hover:bg-surface-2" aria-label="Azioni: proponi uscita, Split the Bill, brano, chiudi">
        <Plus size={20} />
      </button>
      <label className="flex-1">
        <span className="sr-only">Messaggio</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi un messaggio"
          className="h-11 w-full rounded-full border border-line bg-surface px-4 text-base placeholder:text-cream/35 focus:border-brand/60 focus:outline-none"
        />
      </label>
      {text.trim() || noVoice ? (
        <button type="submit" disabled={!text.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-ink disabled:bg-surface disabled:text-cream/30" aria-label="Invia">
          <Send size={18} />
        </button>
      ) : (
        <button type="button" onClick={startRec} className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-cream hover:bg-surface-2" aria-label="Registra nota vocale">
          <Mic size={19} />
        </button>
      )}
      <Sheet open={!!risk} onClose={() => setRisk(null)} title={risk ? OUTGOING_COPY[risk].title : undefined}>
        {risk && (
          <div>
            <p className="text-sm text-muted">{OUTGOING_COPY[risk].body}</p>
            <p className="mt-3 rounded-xl bg-surface p-3 text-base">“{text.trim()}”</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setRisk(null)}>
                Modifica
              </Button>
              <Button type="button" onClick={() => send(true)}>
                Invia comunque
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </form>
  )
}

const DAYS = ['oggi', 'domani', 'dopodomani', 'sabato', 'domenica']
const HOURS = Array.from({ length: 25 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)

function ProposalSheet({ open, onClose, initial, onSend }: { open: boolean; onClose: () => void; initial: { title: string; when: string; place: string }; onSend: (p: { title: string; when: string; place: string }) => void }) {
  const { state } = useStore()
  const minor = isMinor(state.me)
  const publicPlaces = Object.keys(HABITATS)
  const [day, setDay] = useState('domani')
  const [hour, setHour] = useState('17:00')
  const [p, setP] = useState(initial)
  useEffect(() => {
    if (open) setP(minor ? { ...initial, place: publicPlaces.includes(initial.place) ? initial.place : publicPlaces[0], when: `${day} alle ${hour}` } : initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => {
    if (minor) setP((x) => ({ ...x, when: `${day} alle ${hour}` }))
  }, [minor, day, hour])
  const field = (k: 'title' | 'when' | 'place', label: string) => (
    <label className="block">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <input value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-line bg-ink px-3.5 text-cream focus:border-brand focus:outline-none" />
    </label>
  )
  const valid = p.title.trim() && p.when.trim() && p.place.trim()
  return (
    <Sheet open={open} onClose={onClose} title="Proponi un’uscita">
      <p className="text-sm text-muted">Già compilata con il suo piano. Cambia quello che vuoi e invia: quando accetta, il timer si ferma.</p>
      <div className="mt-4 space-y-3">
        {field('title', 'Cosa')}
        {minor ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="text-sm font-semibold text-muted">Giorno</span>
                <select value={day} onChange={(e) => setDay(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line bg-ink px-3 text-cream focus:border-brand focus:outline-none">
                  {DAYS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-sm font-semibold text-muted">Ora</span>
                <select value={hour} onChange={(e) => setHour(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line bg-ink px-3 text-cream focus:border-brand focus:outline-none">
                  {HOURS.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-muted">Dove (solo luoghi pubblici)</span>
              <select value={p.place} onChange={(e) => setP({ ...p, place: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-line bg-ink px-3 text-cream focus:border-brand focus:outline-none">
                {publicPlaces.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <p className="text-xs text-gold">Sotto i 18 anni le uscite si fanno di giorno (8–20) e in luoghi pubblici.</p>
          </>
        ) : (
          <>
            {field('when', 'Quando')}
            {field('place', 'Dove')}
          </>
        )}
      </div>
      <Button className="mt-5 w-full rounded-full" size="lg" disabled={!valid} onClick={() => onSend({ title: p.title.trim(), when: p.when.trim(), place: p.place.trim() })}>
        <CalendarCheck size={18} /> Invia proposta
      </Button>
    </Sheet>
  )
}
