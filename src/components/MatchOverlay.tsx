import { AnimatePresence, motion } from 'motion/react'
import { Hourglass, MessageCircle } from 'lucide-react'
import { ClapMark } from './Brand'
import { useNav } from '../nav'
import { useStore } from '../store/store'
import { UserPicture } from './Portrait'
import { Button } from './ui'

/** Match moment: the two photos glide towards each other and the two stickmen high-five between them. */
export function MatchOverlay() {
  const { match, dismissMatch, user, state, limits } = useStore()
  const nav = useNav()
  const other = match ? user(match.userId) : null

  return (
    <AnimatePresence>
      {match && other && (
        <motion.div
          className="no-scrollbar absolute inset-0 z-[80] flex flex-col items-center overflow-y-auto bg-ink/95 px-5 py-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          role="dialog"
          aria-modal="true"
          aria-label={`Match con ${other.name}`}
        >
          <div className="my-auto flex w-full flex-col items-center">
            <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="text-4xl text-cream">
              È un match
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-1 text-sm text-muted">
              Tu e {other.name} vi piacete a vicenda
            </motion.p>

            <div className="relative mt-8 flex h-56 w-full max-w-[20rem] items-center justify-center">
              <motion.div
                initial={{ x: -90, rotate: -14, opacity: 0 }}
                animate={{ x: -38, rotate: -7, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.2 }}
                className="absolute h-52 w-40 overflow-hidden rounded-2xl border-4 border-ink shadow-2xl"
              >
                <UserPicture user={state.me} className="h-full w-full" />
              </motion.div>
              <motion.div
                initial={{ x: 90, rotate: 14, opacity: 0 }}
                animate={{ x: 38, rotate: 7, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.2 }}
                className="absolute h-52 w-40 overflow-hidden rounded-2xl border-4 border-ink shadow-2xl"
              >
                <UserPicture user={other} className="h-full w-full" />
              </motion.div>
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.15, 1], opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
                className="absolute -bottom-6 grid size-24 place-items-center rounded-full border-4 border-ink bg-surface shadow-xl"
                aria-hidden
              >
                <ClapMark mode="clap" size={56} title="" />
              </motion.span>
            </div>

            {match.pick && (
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-10 w-full max-w-sm rounded-xl bg-surface p-3 text-center text-sm text-muted">
                {match.question}
                <span className="mt-0.5 block text-base font-semibold text-cream">
                  {match.fromMe ? 'Hai scelto' : `${other.name} ha scelto`} “{match.pick}”
                </span>
              </motion.p>
            )}

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-6 w-full max-w-sm space-y-2">
              {match.waiting ? (
                <>
                  <p className="flex items-center gap-1.5 text-sm text-gold">
                    <Hourglass size={14} /> Hai già {limits.slots} chat attive: {other.name} aspetta in Sala d’Attesa.
                  </p>
                  <Button
                    size="lg"
                    className="w-full rounded-full"
                    onClick={() => {
                      dismissMatch()
                      nav.setTab('crew')
                    }}
                  >
                    Vai alle chat
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  className="w-full rounded-full"
                  onClick={() => {
                    dismissMatch()
                    nav.openChat(match.chatId)
                  }}
                >
                  <MessageCircle size={18} /> Scrivi un messaggio
                </Button>
              )}
              <button onClick={dismissMatch} className="h-11 w-full text-sm font-semibold text-muted hover:text-cream">
                Continua a scoprire
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
