import { AnimatePresence, motion } from 'motion/react'
import { CalendarCheck, Hourglass, MapPin, MessageCircle } from 'lucide-react'
import { useNav } from '../nav'
import { useStore } from '../store/store'
import { suggestMeetup } from '../lib/meetup'
import { UserPicture } from './Portrait'
import { Button } from './ui'

/** Match moment: two ticket halves (you + them) slide together and get stamped. */
export function MatchOverlay() {
  const { match, dismissMatch, user, state, limits, proposeMeetup } = useStore()
  const nav = useNav()
  const other = match ? user(match.userId) : null
  const chat = match ? state.chats.find((c) => c.id === match.chatId) : undefined
  const meetup = match ? suggestMeetup(state, match.userId, chat) : null

  return (
    <AnimatePresence>
      {match && other && meetup && (
        <motion.div
          className="no-scrollbar absolute inset-0 z-[80] flex flex-col items-center overflow-y-auto bg-ink px-5 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Match con ${other.name}`}
        >
          <div className="my-auto flex w-full flex-col items-center">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-semibold text-muted">
            {match.fromMe ? `${other.name} ha scelto la tua risposta` : `Hai scelto la risposta di ${other.name}`}
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-1 text-3xl text-cream">
            È un match
          </motion.h2>

          {/* the double ticket */}
          <div className="relative mt-5 w-full max-w-[19rem]">
            <div className="flex">
              <motion.div
                initial={{ x: -140, opacity: 0, rotate: -4 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 170, damping: 18, delay: 0.15 }}
                className="ticket-left flex-1 rounded-l-2xl bg-surface p-3"
              >
                <div className="aspect-[4/5] overflow-hidden rounded-xl">
                  <UserPicture user={state.me} className="h-full w-full" />
                </div>
                <p className="mt-2 text-base font-bold text-cream">{state.me.name}</p>
                <p className="text-xs text-muted">{state.me.city}</p>
              </motion.div>
              <div className="relative w-0">
                <span className="absolute inset-y-3 -left-px border-l-2 border-dashed border-line" aria-hidden />
              </div>
              <motion.div
                initial={{ x: 140, opacity: 0, rotate: 4 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 170, damping: 18, delay: 0.15 }}
                className="ticket-right flex-1 rounded-r-2xl bg-surface p-3"
              >
                <div className="aspect-[4/5] overflow-hidden rounded-xl">
                  <motion.div className="h-full w-full" initial={{ filter: 'blur(18px)', scale: 1.25 }} animate={{ filter: 'blur(0px)', scale: 1 }} transition={{ delay: 1.0, duration: 1.2, ease: 'easeOut' }}>
                    <UserPicture user={other} className="h-full w-full" />
                  </motion.div>
                </div>
                <p className="mt-2 text-base font-bold text-cream">{other.name}</p>
                <p className="text-xs text-muted">{other.city}</p>
              </motion.div>
            </div>
            {/* stamp */}
            <motion.span
              initial={{ scale: 2.4, opacity: 0, rotate: -24 }}
              animate={{ scale: 1, opacity: 1, rotate: -12 }}
              transition={{ delay: 0.75, type: 'spring', stiffness: 260, damping: 14 }}
              className="absolute left-1/2 top-[38%] -translate-x-1/2 rounded-md border-[3px] border-brand bg-ink/80 px-3 py-1 text-xl font-extrabold tracking-widest text-brand"
            >
              MATCH
            </motion.span>
            {/* stub with the meetup */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-1.5 rounded-2xl border border-line bg-forest p-3.5 text-cream">
              <p className="text-xs font-semibold text-brand">La vostra prima uscita</p>
              <p className="mt-0.5 text-base font-bold leading-snug">{meetup.title}</p>
              <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-cream/75">
                <span className="flex items-center gap-1">
                  <CalendarCheck size={13} /> {meetup.when}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} /> {meetup.place}
                </span>
              </p>
            </motion.div>
          </div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="mt-4 w-full max-w-sm text-sm text-muted">
            {match.question}
            <span className="mt-0.5 block text-base font-semibold text-cream">“{match.answer}”</span>
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-5 w-full max-w-sm space-y-2">
            {match.waiting ? (
              <>
                <p className="flex items-center gap-1.5 text-sm text-gold">
                  <Hourglass size={14} /> Hai {limits.slots}/{limits.slots} chat attive: {other.name} aspetta in Sala d’Attesa.
                </p>
                <Button
                  size="lg"
                  className="w-full rounded-full"
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
                <Button
                  size="lg"
                  className="w-full rounded-full"
                  onClick={() => {
                    proposeMeetup(match.chatId, meetup)
                    dismissMatch()
                    nav.openChat(match.chatId)
                  }}
                >
                  <CalendarCheck size={18} /> Proponi l’uscita
                </Button>
                <button
                  onClick={() => {
                    dismissMatch()
                    nav.openChat(match.chatId)
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line font-semibold text-cream"
                >
                  <MessageCircle size={17} /> Scrivi un messaggio
                </button>
              </>
            )}
            <button onClick={dismissMatch} className="h-10 w-full text-sm font-semibold text-muted hover:text-cream">
              Continua a scoprire
            </button>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
