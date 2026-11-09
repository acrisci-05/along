import { useState } from 'react'
import { motion } from 'motion/react'
import { Heart, MapPin, MessageCircle, X } from 'lucide-react'
import { useNav } from '../nav'
import { useStore } from '../store/store'
import { cn, sharedInterests } from '../lib/utils'
import { Button, Eyebrow, LifetimeBadge, Sheet } from './ui'
import { PhotoCarousel } from './Portrait'
import { InfoRows } from './ProfileInfo'
import { useNeedsVerification, VerifiedBadge } from './Verify'
import { ThisOrThatPicker } from '../views/Discover'

/** Full profile of someone: photos, facts, “Questo o quello” and one-tap like. */
export function UserSheet({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { state, user, allowed, likeUser, passUser } = useStore()
  const nav = useNav()
  const needsVerify = useNeedsVerification()
  const [pick, setPick] = useState<string | undefined>()
  const u = userId && allowed(userId) ? user(userId) : null
  const dm = u && state.chats.find((c) => c.peerIds.length === 1 && c.peerIds[0] === u.id && (c.status === 'active' || c.status === 'waiting'))
  const liked = u && state.swipes[u.id] === 'like'
  const common = u ? sharedInterests(state.me, u) : []

  return (
    <Sheet open={!!u} onClose={onClose}>
      {u && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold leading-tight">
              {u.name}, {u.age} <VerifiedBadge user={u} size={22} />
            </h2>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin size={13} /> {u.city} · {u.intent.map((i) => (i === 'date' ? 'Date' : 'Amici')).join(' · ')}
            </p>
            {u.lifetime && (
              <div className="mt-2">
                <LifetimeBadge small />
              </div>
            )}
          </div>
          <PhotoCarousel user={u} />
          {u.bio && <p className="text-base leading-snug text-cream/85">{u.bio}</p>}
          {u.thisOrThat && (
            <div className="rounded-2xl bg-surface-2">
              <ThisOrThatPicker q={u.thisOrThat} value={pick} onChange={setPick} disabled={!!dm || !!liked} />
            </div>
          )}
          <InfoRows user={u} />
          {u.interests.length > 0 && (
            <div>
              <Eyebrow>Passioni</Eyebrow>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {u.interests.map((i) => (
                  <span key={i} className={cn('rounded-full border px-2.5 py-1 text-sm', common.includes(i) ? 'border-brand/50 bg-brand/15 text-cream' : 'border-line text-cream/70')}>
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-center gap-6 pt-1 text-sm">
            <button
              onClick={() => {
                onClose()
                nav.openSafety(u.id, 'block')
              }}
              className="font-semibold text-muted hover:text-cream"
            >
              Blocca {u.name}
            </button>
            <button
              onClick={() => {
                onClose()
                nav.openSafety(u.id, 'report')
              }}
              className="font-semibold text-alarm/90 hover:text-alarm"
            >
              Segnala
            </button>
          </div>
          <div className="sticky bottom-0 -mx-5 -mb-8 bg-gradient-to-t from-[#221b16] via-[#221b16] to-transparent px-5 pb-6 pt-5">
            {dm ? (
              <Button className="w-full" size="lg" onClick={() => nav.openChat(dm.id)}>
                <MessageCircle size={18} /> Apri la chat
              </Button>
            ) : liked ? (
              <Button className="w-full" size="lg" variant="ghost" disabled>
                <Heart size={18} fill="currentColor" /> Like inviato
              </Button>
            ) : (
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    if (!state.swipes[u.id]) passUser(u.id)
                    onClose()
                  }}
                  className="grid size-13 shrink-0 place-items-center rounded-full border border-line"
                  aria-label={`Passa ${u.name}`}
                >
                  <X size={22} />
                </motion.button>
                <Button
                  className="flex-1 rounded-full"
                  size="lg"
                  onClick={() => {
                    if (needsVerify) {
                      onClose()
                      nav.openVerify('Sotto i 18 anni devi verificare il profilo prima di mettere like.')
                      return
                    }
                    likeUser(u.id, pick)
                    onClose()
                  }}
                >
                  <Heart size={18} fill="currentColor" /> Mi piace
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
