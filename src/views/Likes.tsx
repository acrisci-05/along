import { motion } from 'motion/react'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { timeAgo } from '../lib/utils'
import { Avatar, Button, Eyebrow } from '../components/ui'
import { UserPicture } from '../components/Portrait'
import { VerifiedBadge } from '../components/Verify'
import { Scene } from '../components/Brand'

/** Likes you received: all visible, free, in a grid. Tap one to see the profile and decide. */
export function Likes() {
  const { state, user, simulateIncoming, allowed, demo } = useStore()
  const nav = useNav()
  const now = useNow(30_000)
  const fresh = state.likesIn.filter((l) => l.status === 'new' && allowed(l.userId)).sort((a, b) => b.at - a.at)
  const pending = state.likesOut.filter((l) => l.status === 'pending' && allowed(l.userId))

  return (
    <div className="space-y-5 pb-6">
      <header>
        <Eyebrow>Like ricevuti</Eyebrow>
        <h1 className="mt-1 text-2xl font-bold leading-[1.05]">
          {fresh.length ? (
            <>
              Piaci a <span className="text-love">{fresh.length === 1 ? '1 persona' : `${fresh.length} persone`}</span>
            </>
          ) : (
            'Chi ti ha messo like'
          )}
        </h1>
        <p className="mt-1 text-sm text-muted">Tutti visibili, gratis. Tocca una foto e decidi: se ricambi è match.</p>
      </header>

      {fresh.length > 0 ? (
        <section className="grid grid-cols-2 gap-2.5" aria-label="Like da valutare">
          {fresh.map((l, i) => {
            const u = user(l.userId)
            return (
              <motion.button
                key={l.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => nav.openUser(l.userId)}
                className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface text-left"
                aria-label={`Like di ${u.name}${l.pick ? `, ha scelto ${l.pick}` : ''}`}
              >
                <UserPicture user={u} className="absolute inset-0 h-full w-full" />
                <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(28_22_18/0.92)_100%)]" />
                {l.pick && (
                  <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-full bg-love px-2.5 py-1 text-xs font-bold text-cream">“{l.pick}”</span>
                )}
                <span className="absolute inset-x-0 bottom-0 p-2.5">
                  <span className="block text-base font-bold leading-tight">
                    {u.name} <span className="font-medium">{u.age}</span> <VerifiedBadge user={u} size={14} />
                  </span>
                  <span className="block text-xs text-cream/70">{timeAgo(l.at, now)} fa</span>
                </span>
              </motion.button>
            )
          })}
        </section>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-dashed border-line p-6 text-center">
          <Scene kind="waiting" size={100} />
          <p className="mt-3 text-lg font-bold">Ancora nessun like</p>
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

      {pending.length > 0 && (
        <section>
          <Eyebrow>Hai messo like · {pending.length}</Eyebrow>
          <div className="no-scrollbar -mx-4 mt-2 flex gap-3 overflow-x-auto px-4">
            {pending.map((l) => {
              const u = user(l.userId)
              return (
                <button key={l.userId} onClick={() => nav.openUser(l.userId)} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
                  <Avatar user={u} size={52} />
                  <span className="w-full truncate text-xs text-cream/70">{u.name}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
