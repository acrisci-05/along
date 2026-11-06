import { AnimatePresence, motion } from 'motion/react'
import { Hourglass, KeyRound, MessageCircle } from 'lucide-react'
import { useNav } from '../nav'
import { useStore } from '../store/store'
import { Portrait } from './Portrait'
import { Button } from './ui'

export function MatchOverlay() {
  const { match, dismissMatch, user, state, limits } = useStore()
  const nav = useNav()
  const other = match ? user(match.userId) : null
  const chat = match ? state.chats.find((c) => c.id === match.chatId) : null

  return (
    <AnimatePresence>
      {match && other && (
        <motion.div
          className="absolute inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-ink/95 px-6 text-center backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Match con ${other.name}`}
        >
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/3 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,#D7FF66,#06B6D4,#8B5CF6,#FF806D,#D7FF66)] opacity-30 blur-3xl"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}
            aria-hidden
          />
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="relative font-display text-[11px] font-bold uppercase tracking-[0.3em] text-lime">
            {match.fromMe ? `${other.name} ha letto la tua risposta` : 'Hai scelto dalla sua risposta'}
          </motion.p>
          <motion.h2
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
            className="relative mt-2 font-display text-[46px] font-bold leading-[0.95]"
          >
            È una
            <br />
            <span className="text-gradient-neon">scintilla ⚡</span>
          </motion.h2>

          <div className="relative mt-8 flex items-center justify-center">
            <motion.div initial={{ x: -60, rotate: -14, opacity: 0 }} animate={{ x: 14, rotate: -8, opacity: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.25 }} className="h-44 w-34 overflow-hidden rounded-[22px] border-4 border-cream shadow-2xl">
              <Portrait look={state.me.look} hue={state.me.hue} className="h-full w-full" />
            </motion.div>
            <motion.div initial={{ x: 60, rotate: 14, opacity: 0 }} animate={{ x: -14, rotate: 7, opacity: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.3 }} className="relative h-44 w-34 overflow-hidden rounded-[22px] border-4 border-lime shadow-2xl">
              <motion.div className="h-full w-full" initial={{ filter: 'blur(18px)', scale: 1.25 }} animate={{ filter: 'blur(0px)', scale: 1 }} transition={{ delay: 0.9, duration: 1.3, ease: 'easeOut' }}>
                <Portrait look={other.look} hue={other.hue} className="h-full w-full" />
              </motion.div>
              <motion.span initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1.6 }} className="absolute inset-x-0 bottom-2 text-[11px] font-bold text-cream">
                svelando…
              </motion.span>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="relative mt-7 w-full max-w-sm rounded-2xl border border-cream/10 bg-cream/[0.04] p-3 text-left">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cream/45">
              <KeyRound size={11} /> {match.question}
            </p>
            <p className="mt-1 font-display text-[16px] font-semibold leading-snug">“{match.answer}”</p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="relative mt-5 w-full max-w-sm space-y-2">
            {match.waiting ? (
              <>
                <p className="flex items-center justify-center gap-1.5 text-[13px] text-gold">
                  <Hourglass size={14} /> Hai {limits.slots}/{limits.slots} chat attive: {other.name} ti aspetta in Sala d’Attesa.
                </p>
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    dismissMatch()
                    nav.setTab('crew')
                  }}
                >
                  Libera uno slot
                </Button>
              </>
            ) : (
              <>
                <p className="text-[13px] text-cream/60">{chat?.mode === 'local' ? 'Da ora avete 48 ore per vedervi dal vivo. Il timer è partito.' : 'Siete lontani: niente timer, solo capsule audio quando volete.'}</p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    dismissMatch()
                    nav.openChat(match.chatId)
                  }}
                >
                  <MessageCircle size={18} /> Scrivi a {other.name}
                </Button>
              </>
            )}
            <button onClick={dismissMatch} className="h-11 w-full text-[13.5px] font-semibold text-cream/55 hover:text-cream">
              Continua a scoprire
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
