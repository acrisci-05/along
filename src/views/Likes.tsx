import { AnimatePresence, motion } from 'motion/react'
import { Clock, Eye, Heart, KeyRound, Lock, MapPin, X } from 'lucide-react'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { affinity, cn, timeAgo } from '../lib/utils'
import { Avatar, Eyebrow } from '../components/ui'
import { Portrait } from '../components/Portrait'

export function Likes() {
  const { state, user, acceptLike, declineLike, simulateIncoming } = useStore()
  const nav = useNav()
  const now = useNow(30_000)
  const fresh = state.likesIn.filter((l) => l.status === 'new').sort((a, b) => b.at - a.at)
  const pending = state.likesOut.filter((l) => l.status === 'pending')

  return (
    <div className="space-y-5 pb-6">
      <header>
        <Eyebrow>Like ricevuti</Eyebrow>
        <h1 className="mt-1 text-2xl font-bold leading-[1.05]">
          Ti hanno <span className="text-coral">risposto</span>
        </h1>
        <p className="mt-1 text-sm text-cream/55">
          Hanno risposto al tuo dilemma: <span className="text-cream/80">“{state.me.dilemma.question}”</span>. Decidi dalla risposta, non dalla foto.
        </p>
      </header>

      <section className="space-y-3" aria-label="Risposte da valutare">
        <AnimatePresence initial={false}>
          {fresh.map((l, i) => {
            const u = user(l.userId)
            return (
              <motion.article
                key={l.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
                className="overflow-hidden rounded-3xl border border-cream/10 bg-[#1a1a1a]"
              >
                <div className="relative h-28 overflow-hidden">
                  <Portrait look={u.look} hue={u.hue} className="absolute inset-0 h-full w-full scale-125 blur-[16px]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1a1a]" />
                  <div className="absolute bottom-2 left-4 right-4 flex items-end justify-between">
                    <div>
                      <p className="font-display text-xl font-bold leading-none">
                        {u.name} <span className="font-medium text-cream/70">{u.age}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-cream/65">
                        <MapPin size={12} /> {u.city} · {affinity(state.me, u)}% sintonia
                      </p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-ink/60 px-2 py-0.5 text-xs text-cream/70 backdrop-blur">
                      <Lock size={10} /> {timeAgo(l.at, now)} fa
                    </span>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-1">
                  <p className="serif text-sm flex items-center gap-1 text-coral/80">
                    <KeyRound size={11} /> La sua risposta
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold leading-snug">“{l.answer}”</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {u.intent.map((it) => (
                      <span key={it} className={cn('rounded-full px-2 py-0.5 text-xs font-bold', it === 'date' ? 'bg-coral/20 text-coral' : 'bg-lime/15 text-lime')}>
                        {it === 'date' ? '💘 Date' : '🤝 Amici'}
                      </span>
                    ))}
                    <button onClick={() => nav.openUser(u.id)} className="text-xs font-semibold text-cream/55 underline-offset-2 hover:text-cream hover:underline">
                      Leggi il suo sticker Bestie →
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
                    <button onClick={() => declineLike(l.id)} className="flex h-12 items-center gap-1.5 rounded-2xl border border-cream/15 px-4 text-sm font-semibold text-cream/75 hover:border-cream/35" aria-label={`Non stavolta, ${u.name}`}>
                      <X size={16} /> Non stavolta
                    </button>
                    <button onClick={() => acceptLike(l.id)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-coral text-base font-bold text-ink" aria-label={`Match con ${u.name}`}>
                      <Heart size={18} fill="currentColor" /> Match
                    </button>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </AnimatePresence>
        {!fresh.length && (
          <div className="rounded-3xl border border-dashed border-cream/15 p-6 text-center">
            <p className="text-3xl" aria-hidden>
              💌
            </p>
            <p className="mt-2 font-display text-lg font-bold">Nessuna nuova risposta</p>
            <p className="mt-1 text-sm text-cream/55">Un buon dilemma attira risposte migliori. E un piano concreto ancora di più.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={nav.openCreate} className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-ink">
                Proponi un piano
              </button>
              <button onClick={simulateIncoming} className="rounded-full border border-cream/15 px-4 py-2 text-sm font-semibold text-cream/80">
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
          <Eye size={15} className="text-violet" /> {state.savedBy.length} persone hanno salvato il tuo profilo
        </p>
        {state.lifetime ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {state.savedBy.map((id) => {
              const u = user(id)
              return (
                <button key={id} onClick={() => nav.openUser(id)} className="flex items-center gap-1.5 rounded-full bg-cream/5 py-1 pl-1 pr-3 text-sm hover:bg-cream/10">
                  <Avatar user={u} size={26} blur lockIcon={false} /> {u.name}, {u.age}
                </button>
              )
            })}
          </div>
        ) : (
          <button onClick={() => nav.openPaywall('Scopri chi ha salvato il tuo profilo prima ancora di rispondere. Incluso in ALONG Forever, per sempre.')} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-violet/10 p-2.5 text-left">
            <div className="flex -space-x-2">
              {state.savedBy.slice(0, 4).map((id) => (
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
