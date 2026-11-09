import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { useStore } from '../store/store'
import { SwipeCard } from '../views/Discover'

/** "Come ti vedono gli altri": your card exactly as it appears in Scopri. */
export function ProfilePreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const host = typeof document !== 'undefined' ? document.getElementById('phone-root') : null
  if (!open || !host) return null
  return createPortal(<Preview onClose={onClose} />, host)
}

function Preview({ onClose }: { onClose: () => void }) {
  const { state, allowed } = useStore()
  const me = state.me
  // someone from your own pool looks at you
  const viewer = Object.values(state.users).find((u) => allowed(u.id) && u.city === me.city) ?? me

  return (
    <motion.div className="absolute inset-0 z-[60] flex flex-col bg-ink" initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 320 }} role="dialog" aria-modal="true" aria-label="Come ti vedono gli altri">
      <header className="flex items-center gap-2 border-b border-line px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] md:pt-10">
        <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-surface" aria-label="Chiudi anteprima">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg">Come ti vedono gli altri</h2>
      </header>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p className="mb-3 text-sm text-muted">Così appari in Scopri. Tocca la foto per sfogliare le altre.</p>
        <div className="relative h-[520px]">
          <SwipeCard preview user={me} me={viewer} />
        </div>
      </div>
    </motion.div>
  )
}
