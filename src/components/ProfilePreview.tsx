import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useStore } from '../store/store'
import { planStatus, cn } from '../lib/utils'
import { SwipeCard } from '../views/Discover'
import { PhotoCarousel } from './Portrait'
import { InfoRows } from './ProfileInfo'
import { BadgeRow, BestieSticker, earnedBadges } from './Bestie'

/** "Come ti vedono gli altri": your Discover card before a match, your full profile after. */
export function ProfilePreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const host = typeof document !== 'undefined' ? document.getElementById('phone-root') : null
  if (!open || !host) return null
  return createPortal(<Preview onClose={onClose} />, host)
}

function Preview({ onClose }: { onClose: () => void }) {
  const { state, allowed } = useStore()
  const [tab, setTab] = useState<'before' | 'after'>('before')
  const me = { ...state.me, badges: earnedBadges(state.stats) }
  const myPlan = state.plans.find((p) => p.hostId === 'me' && planStatus(p) !== 'EXPIRED')
  // someone from your own pool looks at you
  const viewer = Object.values(state.users).find((u) => allowed(u.id) && u.city === me.city) ?? me

  return (
    <motion.div className="absolute inset-0 z-[60] flex flex-col bg-ink" initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 320 }} role="dialog" aria-modal="true" aria-label="Come ti vedono gli altri">
      <header className="border-b border-line px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] md:pt-10">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-surface" aria-label="Chiudi anteprima">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg">Come ti vedono gli altri</h2>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="tablist">
          {(
            [
              ['before', 'Prima del match'],
              ['after', 'Dopo il match'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('h-9 rounded-lg text-sm font-semibold', tab === k ? 'bg-cream text-ink' : 'text-cream/70')}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === 'before' ? (
          <>
            <p className="mb-3 text-sm text-muted">Così appari in Scopri: foto sfocata, piano, dilemma. Tocca la card per vedere le altre pagine.</p>
            <div className="relative h-[460px]">
              <SwipeCard preview user={me} plan={myPlan} me={viewer} />
            </div>
            {!myPlan && <p className="mt-3 text-sm text-muted">Proponi un piano: compare sulla tua card e attira più risposte.</p>}
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">Dopo il match la persona vede tutte le tue foto, nitide, e il resto del profilo.</p>
            <PhotoCarousel user={me} />
            <div>
              <h3 className="text-2xl">
                {me.name}, {me.age}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                <MapPin size={13} /> {me.city}
              </p>
            </div>
            {me.bio && <p className="text-base leading-snug text-cream/85">{me.bio}</p>}
            <BadgeRow badges={me.badges} />
            <InfoRows user={me} />
            {me.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {me.interests.map((i) => (
                  <span key={i} className="rounded-md border border-line px-2.5 py-1 text-sm">
                    {i}
                  </span>
                ))}
              </div>
            )}
            {me.bestie ? <BestieSticker vouch={me.bestie} name={me.name} finish={me.stickerFinish ?? 'paper'} /> : <p className="text-sm text-muted">Il tuo sticker Bestie è ancora vuoto.</p>}
          </div>
        )}
      </div>
    </motion.div>
  )
}
