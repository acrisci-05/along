import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Archive, ChevronDown, Hourglass } from 'lucide-react'
import type { Chat } from '../types'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { cn, timeAgo } from '../lib/utils'
import { Avatar, Button, Eyebrow } from '../components/ui'
import { Scene } from '../components/Brand'

export function lastPreview(chat: Chat) {
  const m = chat.messages[chat.messages.length - 1]
  if (!m) return 'Nuovo match: scrivi tu per primo'
  const who = m.from === 'me' ? 'Tu: ' : ''
  if (m.kind === 'voice') return `${who}Nota vocale`
  if (m.kind === 'dilemma') return `${who}${m.question ? `${m.question} ` : ''}${m.text}`
  if (m.kind === 'track') return `${who}Brano: ${m.text}`
  if (m.kind === 'farewell') return `${who}Congedo gentile`
  return `${who}${m.text ?? ''}`
}

export function Crew() {
  const { state, activeChats, waitingChats, limits, user, acceptWaiting, toast } = useStore()
  const nav = useNav()
  const now = useNow(30_000)
  const [showArchive, setShowArchive] = useState(false)
  const archived = state.chats.filter((c) => c.status === 'closed' || c.status === 'evolved' || c.status === 'expired')
  const free = limits.slots - activeChats.length
  const isNew = (c: Chat) => !c.messages.some((m) => m.kind !== 'system' && m.kind !== 'dilemma')
  const fresh = activeChats.filter(isNew)
  const talking = activeChats.filter((c) => !isNew(c))

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>Chat</Eyebrow>
          <h1 className="mt-1 text-2xl font-bold leading-[1.05]">Le tue conversazioni</h1>
        </div>
        <span className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold tabular-nums" title={`Massimo ${limits.slots} chat attive insieme`}>
          {activeChats.length}/{limits.slots} attive
        </span>
      </header>

      {fresh.length > 0 && (
        <section aria-label="Nuovi match">
          <Eyebrow>Nuovi match</Eyebrow>
          <div className="no-scrollbar -mx-4 mt-2 flex gap-3 overflow-x-auto px-4">
            {fresh.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => nav.openChat(c.id)}
                className="flex w-[68px] shrink-0 flex-col items-center gap-1"
                aria-label={`Nuovo match con ${c.title}: scrivi tu per primo`}
              >
                <span className="rounded-full bg-love p-[2.5px]">
                  <span className="block rounded-full bg-ink p-[2px]">
                    <Avatar user={user(c.peerIds[0])} size={56} />
                  </span>
                </span>
                <span className="w-full truncate text-center text-xs font-semibold">{c.title}</span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-1">
        {talking.length > 0 && <Eyebrow>Messaggi</Eyebrow>}
        <AnimatePresence initial={false}>
          {talking.map((c, i) => (
            <motion.button
              layout
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              exit={{ opacity: 0, x: 40 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => nav.openChat(c.id)}
              className="flex w-full items-center gap-3 rounded-2xl px-1 py-2.5 text-left transition-colors hover:bg-surface"
            >
              <Avatar user={user(c.peerIds[0])} size={52} />
              <div className="min-w-0 flex-1 border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-base font-bold">{c.title}</p>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(c.messages.at(-1)?.at ?? c.createdAt, now)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className={cn('min-w-0 flex-1 truncate text-sm', c.unread ? 'font-semibold text-cream' : 'text-cream/60')}>{lastPreview(c)}</p>
                  {c.unread > 0 && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-love text-xs font-bold text-cream">{c.unread}</span>}
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
        {!activeChats.length && (
          <div className="rounded-2xl border border-dashed border-cream/15 p-6 text-center">
            <Scene kind="wave" size={90} />
            <p className="mt-3 font-bold">Ancora nessuna chat</p>
            <p className="mt-1 text-sm text-cream/55">Metti like in Scopri: quando è reciproco, la chat si apre qui.</p>
          </div>
        )}
      </section>

      {(waitingChats.length > 0 || free <= 0) && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Eyebrow className="text-gold/80">Sala d’Attesa · {waitingChats.length}</Eyebrow>
            {free <= 0 && waitingChats.length > 0 && <span className="text-xs text-cream/45">chiudi una chat per farli entrare</span>}
          </div>
          {waitingChats.map((c, i) => {
            const u = user(c.peerIds[0])
            return (
              <motion.div key={c.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-gold/30 bg-gold/10 p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar user={u} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-gold">
                      {u.name}, {u.age}
                    </p>
                    <p className="truncate text-sm text-cream/60">
                      È un match · {timeAgo(c.createdAt, now)} fa
                      {c.incoming?.pick ? ` · ha scelto “${c.incoming.pick}”` : ''}
                    </p>
                  </div>
                  <Hourglass size={16} className="text-gold/70" />
                </div>
                <Button
                  size="sm"
                  variant={free > 0 ? 'gold' : 'outline'}
                  className="mt-2.5 w-full"
                  onClick={async () => {
                    if (await acceptWaiting(c.id)) nav.openChat(c.id)
                    else toast({ tone: 'coral', title: 'Chat al completo', body: `Hai già ${limits.slots} chat attive: chiudine una con gentilezza per far entrare ${u.name}.` })
                  }}
                >
                  {free > 0 ? 'Apri la chat' : `In attesa di un posto (${activeChats.length}/${limits.slots})`}
                </Button>
              </motion.div>
            )
          })}
          {!waitingChats.length && <p className="rounded-2xl border border-dashed border-gold/20 p-4 text-center text-sm text-cream/45">Nessuno in attesa.</p>}
        </section>
      )}

      {archived.length > 0 && (
        <section>
          <button onClick={() => setShowArchive((s) => !s)} className="flex w-full items-center justify-between rounded-2xl px-1 py-2 text-left" aria-expanded={showArchive}>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-cream/50">
              <Archive size={14} /> Chat chiuse · {archived.length}
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
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{c.title}</p>
                      <span className="rounded-md bg-cream/10 px-2 py-0.5 text-xs font-semibold text-cream/60">{c.closedReason ?? 'Chiusa'}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}
    </div>
  )
}
