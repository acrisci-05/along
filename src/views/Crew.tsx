import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Archive, ChevronDown, Hourglass, Lock, Mic, Sparkles, Timer } from 'lucide-react'
import type { Chat } from '../types'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { cn, formatCountdown, timeAgo, timerTone, TONE_TEXT } from '../lib/utils'
import { Avatar, BeamAvatar, Button, Eyebrow } from '../components/ui'

export function lastPreview(chat: Chat, name: (id: string) => string) {
  const m = chat.messages[chat.messages.length - 1]
  if (!m) return 'Nuova connessione'
  const who = m.from === 'me' ? 'Tu: ' : m.from === 'system' ? '' : `${name(m.from)}: `
  if (m.kind === 'voice') return `${who}🎙️ Nota vocale`
  if (m.kind === 'dilemma') return `${who}🔑 ${m.text}`
  if (m.kind === 'track') return `${who}🎵 ${m.text}`
  return `${who}${m.text ?? ''}`
}

export function Crew() {
  const { state, activeChats, waitingChats, limits, user, acceptWaiting, toast } = useStore()
  const nav = useNav()
  const now = useNow(1000)
  const [showArchive, setShowArchive] = useState(false)
  const archived = state.chats.filter((c) => c.status === 'closed' || c.status === 'evolved' || c.status === 'expired')
  const free = limits.slots - activeChats.length

  return (
    <div className="space-y-5 pb-6">
      <header>
        <Eyebrow>Chat · Focus Mode</Eyebrow>
        <h1 className="mt-1 text-2xl font-bold leading-none">
          Pochi match, <span className="text-coral">uscite vere</span>
        </h1>
      </header>

      {/* slot meter */}
      <section className="glass rounded-3xl p-4" aria-label="Slot chat attivi">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            Slot attivi <span className="tabular-nums text-coral">{activeChats.length}</span>/{limits.slots}
          </p>
          {!state.lifetime ? (
            <button onClick={() => nav.openPaywall('Espandi a 5 slot chat attivi in contemporanea, per sempre. Pagamento unico.')} className="text-sm font-semibold text-violet hover:underline">
              5 slot con Forever →
            </button>
          ) : (
            <span className="text-sm font-semibold text-gradient-neon">Lifetime · 5 slot</span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          {Array.from({ length: limits.slots }).map((_, i) => {
            const c = activeChats[i]
            return (
              <motion.button
                key={c?.id ?? `empty-${i}`}
                layout
                onClick={() => (c ? nav.openChat(c.id) : nav.setTab('explore'))}
                className={cn('flex flex-1 flex-col items-center gap-1.5 rounded-2xl border py-3', c ? 'border-cream/10 bg-ink/40' : 'border-dashed border-cream/15')}
                aria-label={c ? `Apri chat ${c.title}` : 'Slot libero'}
              >
                {c ? (
                  <>
                    <BeamAvatar tone={timerTone(c, now)}>
                      <Avatar user={user(c.peerIds[0])} size={36} />
                    </BeamAvatar>
                    <span className={cn('text-xs font-semibold tabular-nums', TONE_TEXT[timerTone(c, now)])}>
                      {c.mode === 'remote' ? 'capsule' : c.clockStopped ? 'confermato' : formatCountdown((c.deadline ?? now) - now)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="grid size-[42px] place-items-center rounded-full bg-cream/5 text-cream/30">+</span>
                    <span className="text-xs text-cream/35">libero</span>
                  </>
                )}
              </motion.button>
            )
          })}
        </div>
      </section>

      {/* active chats */}
      <section className="space-y-2">
        <Eyebrow>Conversazioni attive</Eyebrow>
        <AnimatePresence initial={false}>
          {activeChats.map((c) => {
            const tone = timerTone(c, now)
            const peers = c.peerIds.map(user)
            return (
              <motion.button
                layout
                key={c.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40, height: 0 }}
                onClick={() => nav.openChat(c.id)}
                className="glass flex w-full items-center gap-3 rounded-3xl p-3 text-left transition hover:border-cream/20"
              >
                <BeamAvatar tone={tone} label={`Timer ${tone}`}>
                  <Avatar user={peers[0]} size={46} />
                </BeamAvatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-base font-bold">{peers.map((p) => p.name).join(', ')}</p>
                    {c.unread > 0 && <span className="grid size-5 place-items-center rounded-full bg-coral text-xs font-bold text-ink">{c.unread}</span>}
                  </div>
                  <p className="truncate text-sm text-cream/45">{c.title}</p>
                  <p className="truncate text-sm text-cream/70">{lastPreview(c, (id) => user(id).name)}</p>
                </div>
                <div className="shrink-0 text-right">
                  {c.mode === 'remote' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet/15 px-2 py-0.5 text-xs font-semibold text-violet">
                      <Mic size={11} /> Pen-Pal
                    </span>
                  ) : c.clockStopped ? (
                    <span className="rounded-full bg-coral/15 px-2 py-0.5 text-xs font-semibold text-coral">✓ Confermato</span>
                  ) : (
                    <span className={cn('inline-flex items-center gap-1 text-sm font-bold tabular-nums', TONE_TEXT[tone])}>
                      <Timer size={12} /> {formatCountdown((c.deadline ?? now) - now)}
                    </span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
        {!activeChats.length && <p className="rounded-2xl border border-dashed border-cream/15 p-4 text-center text-sm text-cream/50">Nessuna chat attiva. Rispondi a un dilemma per iniziare.</p>}
      </section>

      {/* waiting room */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Eyebrow className="text-gold/80">Sala d’Attesa · {waitingChats.length}</Eyebrow>
          {free <= 0 && waitingChats.length > 0 && <span className="text-xs text-cream/45">libera uno slot per farli entrare</span>}
        </div>
        {waitingChats.map((c, i) => {
          const u = user(c.peerIds[0])
          return (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative overflow-hidden rounded-3xl border border-gold/35 bg-gold/10 p-3.5"
            >
              <div className="absolute -right-6 -top-6 size-24 rounded-full bg-gold/20 blur-2xl" aria-hidden />
              <div className="relative flex items-center gap-3">
                <div className="relative">
                  <Avatar user={u} size={44} blur lockIcon={false} />
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-gold text-ink">
                    <Lock size={11} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-gold">
                    {u.name}, {u.age}
                  </p>
                  <p className="truncate text-sm text-cream/55">per “{c.title}” · {timeAgo(c.createdAt, now)} fa</p>
                </div>
                <Hourglass size={16} className="text-gold/70" />
              </div>
              {c.incoming && (
                <p className="relative mt-2.5 rounded-2xl bg-ink/50 p-2.5 text-sm text-cream/80">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-gold/70">Ha risposto al dilemma</span>“{c.incoming.answer}”
                </p>
              )}
              <div className="relative mt-2.5">
                <Button
                  size="sm"
                  variant={free > 0 ? 'gold' : 'outline'}
                  className="w-full"
                  onClick={() => {
                    if (acceptWaiting(c.id)) {
                      toast({ tone: 'gold', title: `${u.name} è nella tua crew`, body: 'Nuovo slot attivo.' })
                      nav.openChat(c.id)
                    } else toast({ tone: 'coral', title: 'Slot pieni', body: 'Fai evolvere o chiudi con eleganza una chat per far entrare qualcuno.' })
                  }}
                >
                  {free > 0 ? 'Fai entrare' : `🔒 In attesa di uno slot (${activeChats.length}/${limits.slots})`}
                </Button>
              </div>
            </motion.div>
          )
        })}
        {!waitingChats.length && <p className="rounded-2xl border border-dashed border-gold/20 p-4 text-center text-sm text-cream/45">La Sala d’Attesa è vuota. Respira. 🌿</p>}
      </section>

      {/* archive */}
      {archived.length > 0 && (
        <section>
          <button onClick={() => setShowArchive((s) => !s)} className="flex w-full items-center justify-between rounded-2xl px-1 py-2 text-left" aria-expanded={showArchive}>
            <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.16em] text-cream/45">
              <Archive size={14} /> Archivio · {archived.length}
            </span>
            <ChevronDown size={16} className={cn('text-cream/45 transition', showArchive && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {showArchive && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
                {archived.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => nav.openChat(c.id)} className="flex w-full items-center gap-3 rounded-2xl bg-cream/[0.03] p-2.5 text-left opacity-75 hover:opacity-100">
                      <Avatar user={user(c.peerIds[0])} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{c.peerIds.map((id) => user(id).name).join(', ')}</p>
                        <p className="truncate text-xs text-cream/45">{c.title}</p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          c.status === 'evolved' ? 'bg-cyan/15 text-cyan' : c.status === 'expired' ? 'bg-alarm/15 text-alarm' : 'bg-cream/10 text-cream/60',
                        )}
                      >
                        {c.status === 'evolved' ? 'Evoluta 🎉' : c.status === 'expired' ? 'Scaduta' : 'Chiusa con eleganza'}
                      </span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-cream/35">
        <Sparkles size={12} /> Chiudere con eleganza vale +15 Karma. Il ghosting non vale niente.
      </p>
    </div>
  )
}
