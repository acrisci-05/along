import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type Variants } from 'motion/react'
import type { Like } from '../types'
import { Clock, Eye, Heart, Lock, X } from 'lucide-react'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { affinity, timeAgo } from '../lib/utils'
import { Avatar, Eyebrow } from '../components/ui'
import { Portrait } from '../components/Portrait'

export function Likes() {
  const { state, user, acceptLike, declineLike, simulateIncoming, allowed } = useStore()
  const nav = useNav()
  const now = useNow(30_000)
  const fresh = state.likesIn.filter((l) => l.status === 'new' && allowed(l.userId)).sort((a, b) => b.at - a.at)
  const [dir, setDir] = useState<'left' | 'right'>('left')
  const pending = state.likesOut.filter((l) => l.status === 'pending')

  return (
    <div className="space-y-5 pb-6">
      <header>
        <Eyebrow>Like ricevuti</Eyebrow>
        <h1 className="mt-1 text-2xl font-bold leading-[1.05]">
          Ti hanno <span className="text-brand">risposto</span>
        </h1>
        <p className="mt-1 text-sm text-cream/55">
          Hanno risposto al tuo dilemma: <span className="text-cream/80">“{state.me.dilemma.question}”</span>. Decidi dalla risposta, non dalla foto.
        </p>
      </header>

      <section aria-label="Risposte da valutare">
        {fresh.length > 0 ? (
          <>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-muted">Da leggere</span>
              <span className="font-bold tabular-nums text-cream">
                {fresh.length} {fresh.length === 1 ? 'risposta' : 'risposte'}
              </span>
            </div>
            <div className="relative h-[430px]">
              <AnimatePresence custom={dir}>
                {fresh[1] && <LikeCard key={fresh[1].id + '-b'} like={fresh[1]} behind />}
                <LikeCard
                  key={fresh[0].id}
                  like={fresh[0]}
                  onMatch={() => {
                    setDir('right')
                    acceptLike(fresh[0].id)
                  }}
                  onDecline={() => {
                    setDir('left')
                    declineLike(fresh[0].id)
                  }}
                  onInfo={() => nav.openUser(fresh[0].userId)}
                />
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center">
            <p className="text-lg font-bold">Nessuna nuova risposta</p>
            <p className="mt-1 text-sm text-muted">Un buon dilemma attira risposte migliori. E un piano concreto ancora di più.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={nav.openCreate} className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-ink">
                Proponi un piano
              </button>
              <button onClick={simulateIncoming} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-cream/80">
                Simula risposta
              </button>
            </div>
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section>
          <Eyebrow>Aspettano di leggerti · {pending.length}</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-3">
            {pending.map((l) => {
              const u = user(l.userId)
              return (
                <div key={l.userId} className="flex w-16 flex-col items-center gap-1 text-center">
                  <Avatar user={u} size={52} blur lockIcon={false} />
                  <span className="w-full truncate text-xs text-cream/65">{u.name}</span>
                  <span className="flex items-center gap-0.5 text-xs text-cream/40">
                    <Clock size={9} /> {timeAgo(l.at, now)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="glass rounded-3xl p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Eye size={15} className="text-violet" /> {state.savedBy.filter(allowed).length} persone hanno salvato il tuo profilo
        </p>
        {state.lifetime ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {state.savedBy.filter(allowed).map((id) => {
              const u = user(id)
              return (
                <button key={id} onClick={() => nav.openUser(id)} className="flex items-center gap-1.5 rounded-md bg-cream/5 py-1 pl-1 pr-3 text-sm hover:bg-cream/10">
                  <Avatar user={u} size={26} blur lockIcon={false} /> {u.name}, {u.age}
                </button>
              )
            })}
          </div>
        ) : (
          <button onClick={() => nav.openPaywall('Scopri chi ha salvato il tuo profilo prima ancora di rispondere. Incluso in ALONG Forever, per sempre.')} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-violet/10 p-2.5 text-left">
            <div className="flex -space-x-2">
              {state.savedBy.filter(allowed).slice(0, 4).map((id) => (
                <Avatar key={id} user={user(id)} size={30} blur ring lockIcon={false} />
              ))}
            </div>
            <span className="flex-1 text-sm text-cream/65">Chi sono? Scoprilo con ALONG Forever</span>
            <Lock size={15} className="text-violet" />
          </button>
        )}
      </section>
    </div>
  )
}

const EXIT: Variants = {
  exit: (d: 'left' | 'right') =>
    d === 'right'
      ? { x: 380, y: -60, rotate: 16, opacity: 0, transition: { duration: 0.35 } }
      : { x: -380, y: 80, rotate: -20, opacity: 0, transition: { duration: 0.35 } },
}

function LikeCard({ like, behind, onMatch, onDecline, onInfo }: { like: Like; behind?: boolean; onMatch?: () => void; onDecline?: () => void; onInfo?: () => void }) {
  const { user, state } = useStore()
  const now = useNow(30_000)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-10, 10])
  const yes = useTransform(x, [30, 120], [0, 1])
  const no = useTransform(x, [-120, -30], [1, 0])
  const u = user(like.userId)

  useEffect(() => {
    if (behind) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, [role=dialog]')) return
      if (e.key === 'ArrowRight') onMatch?.()
      if (e.key === 'ArrowLeft') onDecline?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [behind, onMatch, onDecline])

  if (behind)
    return (
      <motion.div key="behind" className="absolute inset-x-0 top-0 bottom-[72px] overflow-hidden rounded-2xl bg-surface" initial={{ opacity: 0 }} animate={{ opacity: 0.5, scale: 0.95, y: 10 }} exit={{ opacity: 0 }} aria-hidden>
        <Portrait look={u.look} hue={u.hue} className="h-full w-full scale-125 opacity-60 blur-[26px]" />
      </motion.div>
    )

  return (
    <motion.div key="front" className="absolute inset-0 z-10" variants={EXIT} exit="exit">
      <motion.div
        className="absolute inset-0 flex flex-col"
        style={{ x, rotate }}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        drag="x"
        dragSnapToOrigin
        dragElastic={0.9}
        onDragEnd={(_, info) => {
          if (info.offset.x > 110 || info.velocity.x > 700) onMatch?.()
          else if (info.offset.x < -110 || info.velocity.x < -700) onDecline?.()
        }}
      >
        <article className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface text-cream" aria-label={`Risposta di ${u.name}`}>
          <Portrait look={u.look} hue={u.hue} className="absolute inset-0 h-full w-full scale-[1.3] blur-[22px]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(28_22_18/0.55)_0%,rgb(28_22_18/0.7)_40%,rgb(28_22_18/0.96)_100%)]" />
          <motion.span style={{ opacity: yes }} className="pointer-events-none absolute right-6 top-14 z-20 rotate-12 rounded-md border-2 border-brand px-3 py-1 text-xl font-extrabold text-brand">
            MATCH
          </motion.span>
          <motion.span style={{ opacity: no }} className="pointer-events-none absolute left-6 top-14 z-20 -rotate-12 rounded-md border-2 border-cream px-3 py-1 text-xl font-extrabold text-cream">
            NON STAVOLTA
          </motion.span>
          <div className="relative flex h-full flex-col p-4">
            <p className="text-xs font-semibold text-cream/70">Ha risposto al tuo dilemma · {timeAgo(like.at, now)} fa</p>
            <p className="mt-1 text-sm text-cream/70">{like.question}</p>
            <p className="mt-auto text-2xl font-extrabold leading-tight tracking-[-0.02em]">“{like.answer}”</p>
            <button onClick={onInfo} className="mt-4 flex items-center justify-between border-t border-cream/15 pt-3 text-left">
              <span>
                <span className="block text-lg font-bold">
                  {u.name} <span className="font-medium">{u.age}</span>
                </span>
                <span className="block text-sm text-cream/70">
                  {u.city} · {affinity(state.me, u)}% di sintonia · {u.intent.map((i) => (i === 'date' ? 'Date' : 'Amici')).join(', ')}
                </span>
              </span>
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-ink/50" title="Foto visibile dopo il match">
                <Lock size={14} />
              </span>
            </button>
          </div>
        </article>
        <div className="flex items-center justify-center gap-4 pt-3">
          <button onClick={onDecline} className="flex h-14 items-center gap-2 rounded-full border border-line px-6 font-semibold text-cream/85" aria-label={`Non stavolta, ${u.name}`}>
            <X size={18} /> Non stavolta
          </button>
          <button onClick={onMatch} className="flex h-14 items-center gap-2 rounded-full bg-brand px-8 font-bold text-ink" aria-label={`Match con ${u.name}`}>
            <Heart size={18} fill="currentColor" /> Match
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
