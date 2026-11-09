import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Ban, Flag, ShieldAlert, Check, CheckCheck, Hand, Lock, Mic, MoreVertical, Music2, Plus, Send, UserRound, X } from 'lucide-react'
import type { Chat, Message, User } from '../types'
import { FAREWELLS } from '../data/mock'
import { INCOMING_COPY, OUTGOING_COPY, scanIncoming, scanOutgoing, type OutgoingRisk } from '../lib/safety'
import { isMinor } from '../lib/age'
import { isVerified } from '../lib/verify'
import { useNeedsVerification, VerifiedBadge } from '../components/Verify'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { cn } from '../lib/utils'
import { Avatar, Button, Sheet, VoiceBubble } from '../components/ui'

const TRACKS = [
  { title: 'Plastic Love', artist: 'Mariya Takeuchi' },
  { title: 'Nightcall', artist: 'Kavinsky' },
  { title: 'Teardrop', artist: 'Massive Attack' },
  { title: 'Napule è', artist: 'Pino Daniele' },
  { title: 'Midnight City', artist: 'M83' },
]

type Panel = null | 'actions' | 'tracks' | 'farewell' | 'menu'

export function ChatRoom({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const store = useStore()
  const { state, user, typing, markRead } = store
  const nav = useNav()
  const chat = state.chats.find((c) => c.id === chatId)
  const scroller = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const receipts = state.prefs.readReceipts !== false
  const showTyping = state.prefs.typingIndicator !== false
  const needsVerify = useNeedsVerification()

  useEffect(() => {
    if (chat?.unread) markRead(chat.id)
  }, [chat?.unread, chat?.id, markRead])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [chat?.messages.length, typing[chatId]])

  if (!chat) return null
  const peers = chat.peerIds.map(user)
  const readOnly = chat.status !== 'active'
  const typingUser = showTyping && typing[chatId] ? user(typing[chatId]!) : null
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
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-cream/5" aria-label="Torna alle chat">
            <ArrowLeft size={20} />
          </button>
          <button onClick={() => peers.length === 1 && nav.openUser(peers[0].id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <div className="flex -space-x-3">
              {peers.slice(0, 3).map((p) => (
                <Avatar key={p.id} user={p} size={36} ring />
              ))}
            </div>
            <span className="min-w-0">
              <span className="flex items-center gap-1 truncate text-base font-bold">
                <span className="truncate">{peers.map((p) => p.name).join(', ')}</span>
                {peers.length === 1 && <VerifiedBadge user={peers[0]} />}
              </span>
              <span className="block truncate text-xs text-muted">{typingUser ? 'sta scrivendo…' : readOnly ? chat.closedReason ?? 'Chat chiusa' : `${peers[0]?.age ?? ''} anni · ${peers[0]?.city ?? ''}`}</span>
            </span>
          </button>
          {!readOnly && (
            <button onClick={() => setPanel('menu')} className="grid size-10 place-items-center rounded-full hover:bg-cream/5" aria-label="Altre opzioni">
              <MoreVertical size={19} />
            </button>
          )}
        </div>

      </header>

      {/* body */}
      <div ref={scroller} className="no-scrollbar relative min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4" aria-live="polite">
        {!readOnly && peers.some((p) => !isVerified(p)) && (
          <p className="flex items-start gap-2 rounded-xl border border-line px-3 py-2 text-xs text-muted">
            <ShieldAlert size={14} className="mt-px shrink-0" />
            {peers.length === 1 ? 'Questo profilo non è verificato.' : `Non verificati: ${peers.filter((p) => !isVerified(p)).map((p) => p.name).join(', ')}.`} Prima di vedervi, scegli un luogo pubblico.
          </p>
        )}
        {chat.messages.map((m, i) => (
          <Bubble
            key={m.id}
            m={m.from === 'me' && !m.seen && i < lastPeerIdx ? { ...m, seen: true } : m}
            prev={chat.messages[i - 1]}
            author={m.from === 'me' ? state.me : m.from === 'system' ? undefined : user(m.from)}
            group={peers.length > 1}
            receipts={receipts}
            last={m.id === lastMine}
            onReport={(id) => nav.openSafety(id, 'report')}
          />
        ))}
        <AnimatePresence>
          {typingUser && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-muted">
              <Avatar user={typingUser} size={24} />
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
          {needsVerify ? (
            <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-3">
              <p className="flex-1 text-sm text-gold">Sotto i 18 anni puoi scrivere solo dopo aver verificato il profilo.</p>
              <button onClick={() => nav.openVerify('Sotto i 18 anni devi verificare il profilo prima di chattare.')} className="h-9 shrink-0 rounded-full bg-brand px-3.5 text-sm font-bold text-ink">
                Verifica
              </button>
            </div>
          ) : (
            <Composer chat={chat} onPlus={() => setPanel('actions')} />
          )}
        </div>
      )}

      {/* ---- panels ---- */}
      <Sheet open={panel === 'actions'} onClose={close} title="Azioni">
        <ul className="space-y-1.5">
          {[
            { icon: Music2, label: 'Condividi un brano', sub: 'Una canzone che ti fa pensare a questa chat', go: 'tracks' as Panel },
            { icon: Hand, label: 'Chiudi con gentilezza', sub: 'Ricevono un messaggio gentile, nessuno resta appeso', go: 'farewell' as Panel },
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
          <button onClick={() => setPanel('farewell')} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface">
            <Hand size={18} /> Chiudi con gentilezza
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

      <FarewellSheet
        open={panel === 'farewell'}
        onClose={close}
        name={peers.map((p) => p.name).join(', ')}
        onSend={(text) => {
          store.closeElegantly(chat.id, text)
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
    <Sheet open={open} onClose={onClose} title="Chiudi con gentilezza">
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
      <p className="mt-3 text-center text-sm font-semibold text-brand">Nessuno resta appeso: è questo che rende ALONG diversa</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        <Button onClick={() => onSend(text)}>Invia e chiudi</Button>
      </div>
    </Sheet>
  )
}

function Bubble({ m, prev, author, group, receipts, last, onReport }: { m: Message; prev?: Message; author?: User; group: boolean; receipts: boolean; last: boolean; onReport: (userId: string) => void }) {
  const mine = m.from === 'me'
  if (m.kind === 'system')
    return (
      <p className="mx-auto w-fit max-w-[90%] rounded-md bg-surface px-3 py-1.5 text-center text-xs text-muted">{m.text}</p>
    )
  const sameAuthor = prev?.from === m.from
  const time = new Date(m.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  if (m.kind === 'dilemma')
    return (
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className={cn('max-w-[86%] overflow-hidden rounded-2xl border border-line', mine ? 'ml-auto' : '')}>
        <div className="bg-surface px-3.5 py-2">
          <p className="text-xs font-semibold text-muted">Questo o quello</p>
          {m.question && <p className="mt-0.5 text-sm text-cream/75">{m.question}</p>}
        </div>
        <div className={cn('px-3.5 py-2.5', mine ? 'bg-forest' : 'bg-surface-2')}>
          <p className="text-xs text-cream/55">{mine ? 'Hai scelto' : `${author?.name} ha scelto`}</p>
          <p className="text-lg font-bold leading-snug">{m.text}</p>
        </div>
      </motion.div>
    )

  if (m.kind === 'farewell')
    return (
      <div className="ml-auto max-w-[86%] rounded-2xl border border-line bg-surface p-3.5">
        <p className="text-xs font-semibold text-muted">Chiusura con gentilezza</p>
        <p className="mt-1 text-base leading-snug">{m.text}</p>
      </div>
    )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
      {!mine && author && <div className="w-7 shrink-0">{!sameAuthor && <Avatar user={author} size={28} />}</div>}
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
  const { sendMessage, sendVoice, toast, state, notifyTyping, demo } = useStore()
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
      if (!demo) {
        toast({ tone: 'coral', title: 'Microfono non disponibile', body: 'Consenti l’accesso al microfono per mandare un vocale.' })
        return
      }
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
        sendVoice(chat.id, duration, { audioUrl: URL.createObjectURL(blob), wave, blob })
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
          onChange={(e) => {
            setText(e.target.value)
            if (e.target.value) notifyTyping(chat.id)
          }}
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
