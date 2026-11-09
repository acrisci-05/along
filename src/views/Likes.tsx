import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type Variants } from 'motion/react'
import type { Like } from '../types'
import { Heart, Info, X } from 'lucide-react'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { cn, timeAgo } from '../lib/utils'
import { Avatar, Button, Eyebrow } from '../components/ui'
import { UserPicture } from '../components/Portrait'
import { useNeedsVerification, VerifiedBadge } from '../components/Verify'

export function Likes() {
  const { state, user, acceptLike, declineLike, simulateIncoming, allowed, demo } = useStore()
  const nav = useNav()
  const now = useNow(30_000)
  const fresh = state.likesIn.filter((l) => l.status === 'new' && allowed(l.userId)).sort((a, b) => b.at - a.at)
  const [dir, setDir] = useState<'left' | 'right'>('left')
  const needsVerify = useNeedsVerification()
  const pending = state.likesOut.filter((l) => l.status === 'pending' && allowed(l.userId))

  return (
    <div className="space-y-5 pb-6">
      <header>
        <Eyebrow>Like ricevuti</Eyebrow>
        <h1 className="mt-1 text-2xl font-bold leading-[1.05]">
          {fresh.length ? (
            <>
              Piaci a <span className="text-brand">{fresh.length === 1 ? '1 persona' : `${fresh.length} persone`}</span>
            </>
          ) : (
            'Chi ti ha messo like'
          )}
        </h1>
        <p className="mt-1 text-sm text-muted">Tutti visibili, gratis. Se ricambi è match.</p>
      </header>

      <section aria-label="Like da valutare">
        {fresh.length > 0 ? (
          <div className="relative h-[min(470px,calc(100dvh-260px))] min-h-[380px]">
            <AnimatePresence custom={dir}>
              {fresh[1] && <LikeCard key={fresh[1].id + '-b'} like={fresh[1]} behind />}
              <LikeCard
                key={fresh[0].id}
                like={fresh[0]}
                onMatch={() => {
                  if (needsVerify) {
                    nav.openVerify('Sotto i 18 anni devi verificare il profilo prima di accettare un match.')
                    return
                  }
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
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-dashed border-line p-6 text-center">
            <Heart size={26} className="mx-auto text-brand" />
            <p className="mt-2 text-lg font-bold">Ancora nessun like</p>
            <p className="mt-1 text-sm text-muted">Un profilo con almeno 2 foto e una bio di due righe riceve molti più like.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" onClick={() => nav.setTab('profile')}>
                Migliora il profilo
              </Button>
              {demo && (
                <Button size="sm" variant="ghost" onClick={simulateIncoming}>
                  Simula un like
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </section>

      {pending.length > 0 && (
        <section>
          <Eyebrow>Hai messo like · {pending.length}</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-3">
            {pending.map((l, i) => {
              const u = user(l.userId)
              return (
                <motion.button
                  key={l.userId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => nav.openUser(l.userId)}
                  className="flex w-16 flex-col items-center gap-1 text-center"
                >
                  <Avatar user={u} size={52} />
                  <span className="w-full truncate text-xs text-cream/70">{u.name}</span>
                  <span className="text-xs text-cream/40">{timeAgo(l.at, now)}</span>
                </motion.button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

const EXIT: Variants = {
  exit: (d: 'left' | 'right') =>
    d === 'right'
      ? { x: 360, y: -60, rotate: 14, opacity: 0, transition: { duration: 0.35 } }
      : { x: -360, y: 40, rotate: -14, opacity: 0, transition: { duration: 0.35 } },
}

function LikeCard({ like, behind, onMatch, onDecline, onInfo }: { like: Like; behind?: boolean; onMatch?: () => void; onDecline?: () => void; onInfo?: () => void }) {
  const { user } = useStore()
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
        <UserPicture user={u} className="h-full w-full" />
      </motion.div>
    )

  return (
    <motion.div key="front" className="absolute inset-0 z-10" variants={EXIT} exit="exit">
      <motion.div
        className="absolute inset-0 flex flex-col"
        style={{ x, rotate }}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        drag="x"
        dragSnapToOrigin
        dragElastic={0.85}
        onDragEnd={(_, info) => {
          if (info.offset.x > 110 || info.velocity.x > 700) onMatch?.()
          else if (info.offset.x < -110 || info.velocity.x < -700) onDecline?.()
        }}
      >
        <article className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface text-cream" aria-label={`Like di ${u.name}`}>
          <UserPicture user={u} className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgb(28_22_18/0.85)_70%,rgb(28_22_18/0.97)_100%)]" />
          <motion.span style={{ opacity: yes }} className="pointer-events-none absolute left-5 top-12 z-20 -rotate-12 rounded-md border-2 border-brand px-3 py-1 text-2xl font-extrabold text-brand">
            MATCH
          </motion.span>
          <motion.span style={{ opacity: no }} className="pointer-events-none absolute right-5 top-12 z-20 rotate-12 rounded-md border-2 border-cream px-3 py-1 text-2xl font-extrabold text-cream">
            NO, GRAZIE
          </motion.span>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <button onClick={onInfo} className="flex w-full items-end justify-between gap-2 text-left" aria-label={`Profilo completo di ${u.name}`}>
              <span>
                <span className="block text-[26px] font-extrabold leading-none tracking-[-0.03em]">
                  {u.name} <span className="font-medium">{u.age}</span> <VerifiedBadge user={u} size={18} />
                </span>
                <span className="mt-1 block text-sm text-cream/75">
                  {u.city} · ti ha messo like {timeAgo(like.at, now)} fa
                </span>
              </span>
              <Info size={20} className="mb-0.5 shrink-0 text-cream/80" />
            </button>
            {like.pick ? (
              <div className="mt-3 rounded-xl bg-ink/55 p-3 backdrop-blur-sm">
                <p className="text-xs font-semibold text-cream/70">{like.question ?? 'Il tuo Questo o quello'}</p>
                <p className="mt-0.5 text-lg font-bold">
                  Ha scelto <span className="text-brand">{like.pick}</span>
                </p>
              </div>
            ) : (
              u.bio && <p className="mt-2 line-clamp-2 text-sm text-cream/85">{u.bio}</p>
            )}
          </div>
        </article>
        <div className="flex items-center justify-center gap-4 pt-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onDecline} className="flex h-14 items-center gap-2 rounded-full border border-line px-6 font-semibold text-cream/85" aria-label={`No, grazie: ${u.name}`}>
            <X size={18} /> No, grazie
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onMatch} className={cn('flex h-14 items-center gap-2 rounded-full bg-brand px-8 font-bold text-ink')} aria-label={`Match con ${u.name}`}>
            <Heart size={18} fill="currentColor" /> Match
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
