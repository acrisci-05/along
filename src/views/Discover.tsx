import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { ArrowLeft, Globe2, Heart, LayoutList, Info, KeyRound, Lock, MapPin, Plane, Radio, RotateCcw, SlidersHorizontal, Users, X } from 'lucide-react'
import type { Mode, Plan, User } from '../types'
import { useNav } from '../nav'
import { useStore } from '../store/store'
import { affinity, CATEGORY_META, cn, planStatus, planWhen, sharedInterests } from '../lib/utils'
import { Portrait } from '../components/Portrait'
import { Button, Chip, Sheet } from '../components/ui'
import { Explore, TravelBridge } from './Explore'

function distanceLabel(u: User, me: User) {
  if (u.city === me.city) return `a ${String(u.distanceKm ?? 2).replace('.', ',')} km da te`
  return `${u.city}${u.distanceKm ? ` · ${u.distanceKm.toLocaleString('it-IT')} km` : ''}`
}

export function Discover({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const [view, setView] = useState<'people' | 'plans'>('people')
  if (view === 'plans')
    return (
      <div>
        <button onClick={() => setView('people')} className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-cream px-3.5 text-[13px] font-semibold text-ink">
          <ArrowLeft size={15} /> Torna alle persone
        </button>
        <Explore mode={mode} setMode={setMode} />
      </div>
    )
  return <Deck mode={mode} setMode={setMode} onPlans={() => setView('plans')} />
}

function Deck({ mode, setMode, onPlans }: { mode: Mode; setMode: (m: Mode) => void; onPlans: () => void }) {
  const store = useStore()
  const { state, setPrefs, passUser, likeUser, undoSwipe, resetDeck, toast } = store
  const nav = useNav()
  const [filters, setFilters] = useState(false)
  const [travel, setTravel] = useState(false)
  const { prefs, me } = state

  const deck = useMemo(() => {
    const busy = new Set(state.chats.filter((c) => (c.status === 'active' || c.status === 'waiting') && c.peerIds.length === 1).flatMap((c) => c.peerIds))
    const pending = new Set(state.likesIn.filter((l) => l.status === 'new').map((l) => l.userId))
    const travelCities = state.travelDestinations.map((d) => d.toLowerCase())
    return Object.values(state.users)
      .filter((u) => !state.swipes[u.id] && !busy.has(u.id) && !pending.has(u.id))
      .filter((u) => u.intent.includes(prefs.intent))
      .filter((u) => prefs.show === 'all' || u.gender === prefs.show)
      .filter((u) => u.age >= prefs.ageMin && u.age <= prefs.ageMax)
      .filter((u) => {
        const near = u.city === me.city || travelCities.includes(u.city.toLowerCase())
        return mode === 'local' ? near : u.city !== me.city
      })
      .sort((a, b) => affinity(me, b) - affinity(me, a))
  }, [state.users, state.swipes, state.chats, state.likesIn, state.travelDestinations, prefs, me, mode])

  const top = deck[0]
  const next = deck[1]
  const planOf = (u?: User) => (u ? state.plans.find((p) => p.hostId === u.id && planStatus(p) !== 'EXPIRED') : undefined)

  const undo = () => {
    if (!state.lifetime) return nav.openPaywall('Annulla l’ultimo “passo” quando ti scappa il dito. Incluso in ALONG Forever, per sempre.')
    const id = undoSwipe()
    if (!id) toast({ tone: 'coral', title: 'Niente da annullare', body: 'Puoi annullare solo l’ultimo profilo saltato.' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* controls */}
      <div className="flex items-center gap-2">
        <div className="glass grid flex-1 grid-cols-2 rounded-2xl p-1" role="radiogroup" aria-label="Intenzione">
          {(
            [
              ['date', '💘 Date'],
              ['friends', '🤝 Amici'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              role="radio"
              aria-checked={prefs.intent === k}
              onClick={() => setPrefs({ intent: k })}
              className={cn('h-9 rounded-xl text-[13px] font-semibold transition', prefs.intent === k ? (k === 'date' ? 'bg-coral text-ink' : 'bg-lime text-ink') : 'text-cream/60')}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMode(mode === 'local' ? 'remote' : 'local')}
          className={cn('flex h-11 items-center gap-1.5 rounded-2xl px-3 text-[12.5px] font-semibold', mode === 'local' ? 'bg-cyan/15 text-cyan' : 'bg-violet/20 text-violet-200')}
          aria-label={mode === 'local' ? 'Raggio: vicino a te. Tocca per Senza Confini' : 'Raggio: Senza Confini. Tocca per vicino a te'}
        >
          {mode === 'local' ? <Radio size={15} /> : <Globe2 size={15} />}
          {mode === 'local' ? 'Vicino' : 'Ovunque'}
        </button>
        <button onClick={onPlans} className="glass grid size-11 place-items-center rounded-2xl" aria-label="Sfoglia i piani in elenco">
          <LayoutList size={17} />
        </button>
        <button onClick={() => setFilters(true)} className="glass grid size-11 place-items-center rounded-2xl" aria-label="Filtri">
          <SlidersHorizontal size={17} />
        </button>
      </div>

      {mode === 'remote' && (
        <button onClick={() => setTravel(true)} className="flex items-center gap-2 rounded-2xl border border-cyan/25 bg-cyan/10 px-3 py-2 text-left text-[12.5px]">
          <Plane size={15} className="text-cyan" />
          <span className="flex-1 text-cream/80">
            {state.travelDestinations.length ? (
              <>
                Travel Bridge: <span className="font-semibold text-cream">{state.travelDestinations.join(', ')}</span> — le persone del posto appaiono in “Vicino”
              </>
            ) : (
              'Parti presto? Imposta una meta e conosci chi vive lì prima di arrivare'
            )}
          </span>
        </button>
      )}

      {/* stack */}
      <div className="relative min-h-[360px] flex-1">
        <AnimatePresence>
          {next && <SwipeCard key={next.id} user={next} plan={planOf(next)} me={me} behind />}
          {top && (
            <SwipeCard
              key={top.id}
              user={top}
              plan={planOf(top)}
              me={me}
              onPass={() => passUser(top.id)}
              onLike={(answer) => {
                likeUser(top.id, answer)
                toast({ tone: 'coral', title: `Risposta inviata a ${top.name} 💌`, body: 'Se le/gli piace, è match e le foto si svelano.' })
              }}
              onInfo={() => nav.openUser(top.id)}
              onPlan={(id) => nav.openPlan(id)}
              onUndo={undo}
            />
          )}
        </AnimatePresence>
        {!top && (
          <div className="absolute inset-0 grid place-items-center rounded-[30px] border border-dashed border-cream/15 p-6 text-center">
            <div>
              <p className="text-4xl" aria-hidden>
                🌙
              </p>
              <p className="mt-3 font-display text-xl font-bold">Per ora è tutto, qui.</p>
              <p className="mt-1 text-[13.5px] text-cream/55">Meno scroll, più vita. Rispondi a chi ti ha scritto, oppure allarga il raggio.</p>
              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={() => nav.setTab('likes')}>Vedi chi ti ha risposto</Button>
                <Button variant="outline" onClick={() => setMode(mode === 'local' ? 'remote' : 'local')}>
                  {mode === 'local' ? 'Prova Senza Confini' : 'Torna vicino a te'}
                </Button>
                <button onClick={resetDeck} className="mt-1 text-[12.5px] font-semibold text-cream/50 hover:text-cream">
                  Rivedi i profili saltati
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Sheet open={filters} onClose={() => setFilters(false)} title="Filtri">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-semibold">Mostrami</p>
            <div className="flex gap-2">
              {(
                [
                  ['all', 'Tutti'],
                  ['f', 'Donne'],
                  ['m', 'Uomini'],
                ] as const
              ).map(([k, l]) => (
                <Chip key={k} active={prefs.show === k} onClick={() => setPrefs({ show: k })}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold">
              Età: {prefs.ageMin}–{prefs.ageMax}
            </p>
            <label className="flex items-center gap-3 text-[12px] text-cream/55">
              min
              <input type="range" min={18} max={prefs.ageMax} value={prefs.ageMin} onChange={(e) => setPrefs({ ageMin: Number(e.target.value) })} className="flex-1" />
            </label>
            <label className="mt-2 flex items-center gap-3 text-[12px] text-cream/55">
              max
              <input type="range" min={prefs.ageMin} max={60} value={prefs.ageMax} onChange={(e) => setPrefs({ ageMax: Number(e.target.value) })} className="flex-1" />
            </label>
          </div>
          <Button className="w-full" onClick={() => setFilters(false)}>
            Mostra {deck.length} profil{deck.length === 1 ? 'o' : 'i'}
          </Button>
        </div>
      </Sheet>
      <Sheet open={travel} onClose={() => setTravel(false)} title="Travel Bridge">
        <TravelBridge />
      </Sheet>
    </div>
  )
}

function SwipeCard({
  user,
  plan,
  me,
  behind,
  onPass,
  onLike,
  onInfo,
  onPlan,
  onUndo,
}: {
  user: User
  plan?: Plan
  me: User
  behind?: boolean
  onPass?: () => void
  onLike?: (answer: string) => void
  onInfo?: () => void
  onPlan?: (id: string) => void
  onUndo?: () => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-12, 12])
  const passOpacity = useTransform(x, [-120, -30], [1, 0])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const [flipped, setFlipped] = useState(false)
  const [exit, setExit] = useState<'left' | 'right'>('left')
  const shared = sharedInterests(me, user)
  const aff = affinity(me, user)

  const pass = () => {
    setExit('left')
    animate(x, -520, { duration: 0.28 })
    window.setTimeout(() => onPass?.(), 180)
  }

  useEffect(() => {
    if (behind || flipped) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [role=dialog]')) return
      if (e.key === 'ArrowLeft') pass()
      if (e.key === 'ArrowRight') setFlipped(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [behind, flipped])

  if (behind)
    return (
      <motion.div className="absolute inset-0 overflow-hidden rounded-[30px] bg-slate-card" initial={{ scale: 0.9, y: 18, opacity: 0 }} animate={{ scale: 0.95, y: 12, opacity: 0.6 }} exit={{ opacity: 0 }} aria-hidden>
        <Portrait look={user.look} hue={user.hue} className="h-full w-full scale-110 blur-[22px]" />
      </motion.div>
    )

  const meta = plan ? CATEGORY_META[plan.category] : null

  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      style={{ x, rotate }}
      initial={{ scale: 0.95, y: 12, opacity: 0.6 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={exit === 'left' ? { x: -520, opacity: 0, transition: { duration: 0.25 } } : { x: 520, opacity: 0, rotate: 14, transition: { duration: 0.3 } }}
      drag={flipped ? false : 'x'}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x < -110 || info.velocity.x < -700) pass()
        else if (info.offset.x > 110 || info.velocity.x > 700) setFlipped(true)
      }}
    >
      <div className="relative min-h-0 flex-1 [perspective:1400px]">
        <motion.div className="relative h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }}>
          {/* FRONT */}
          <article
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[30px] border border-cream/10 bg-[#121726] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] [backface-visibility:hidden]"
            aria-label={`${user.name}, ${user.age}`}
            aria-hidden={flipped}
          >
            {/* photo */}
            <div className="relative min-h-[190px] flex-1 overflow-hidden">
              <Portrait look={user.look} hue={user.hue} className="absolute inset-0 h-full w-full scale-[1.18] blur-[18px]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(11_15_25/0.1)_0%,transparent_35%,rgb(18_23_38/0.95)_100%)]" />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-semibold text-cream/85 backdrop-blur">
                <Lock size={11} /> Foto svelata al match
              </div>
              <div className="absolute right-3 top-3 rounded-2xl bg-ink/55 px-2.5 py-1 text-center backdrop-blur">
                <span className="font-display text-[16px] font-bold leading-none text-violet-200">{aff}%</span>
                <span className="block text-[9px] font-semibold uppercase tracking-wider text-cream/55">sintonia</span>
              </div>
              {/* stamps */}
              <motion.span style={{ opacity: likeOpacity }} className="absolute left-5 top-16 -rotate-12 rounded-xl border-4 border-lime px-3 py-1 font-display text-2xl font-bold tracking-widest text-lime">
                RISPONDO
              </motion.span>
              <motion.span style={{ opacity: passOpacity }} className="absolute right-5 top-16 rotate-12 rounded-xl border-4 border-coral px-3 py-1 font-display text-2xl font-bold tracking-widest text-coral">
                PASSO
              </motion.span>

              <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-[32px] font-bold leading-none">
                      {user.name} <span className="font-medium text-cream/75">{user.age}</span>
                    </h2>
                    <p className="mt-1.5 flex items-center gap-1 text-[13px] text-cream/75">
                      <MapPin size={13} /> {distanceLabel(user, me)}
                    </p>
                  </div>
                  <button onClick={onInfo} className="grid size-10 shrink-0 place-items-center rounded-full bg-cream/15 backdrop-blur hover:bg-cream/25" aria-label={`Profilo completo di ${user.name}`}>
                    <Info size={18} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.intent.map((i) => (
                    <span key={i} className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', i === 'date' ? 'bg-coral text-ink' : 'bg-lime text-ink')}>
                      {i === 'date' ? '💘 Date' : '🤝 Amici'}
                    </span>
                  ))}
                  {shared.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-full border border-cream/20 bg-ink/40 px-2 py-0.5 text-[11px] text-cream/85 backdrop-blur">
                      ✦ {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* plan + dilemma */}
            <div className="space-y-2 px-3 pb-3">
              {plan && meta && (
                <button onClick={() => onPlan?.(plan.id)} className="flex w-full items-center gap-2.5 rounded-2xl bg-cream/[0.05] px-2.5 py-2 text-left hover:bg-cream/[0.08]">
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg text-base', meta.tone)} aria-hidden>
                    {meta.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{plan.title}</span>
                    <span className="block truncate text-[11px] text-cream/55">
                      Ti propone · {planWhen(plan)}
                    </span>
                  </span>
                  {plan.capacity > 2 && (
                    <span className="flex items-center gap-0.5 text-[11px] text-cream/50">
                      <Users size={12} />
                      {plan.participants.length}/{plan.capacity}
                    </span>
                  )}
                </button>
              )}
              <div className="rounded-2xl bg-lime px-3.5 pb-7 pt-2 text-ink">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink/60">
                  <KeyRound size={11} /> Il suo dilemma
                </p>
                <p className="line-clamp-2 font-display text-[15px] font-bold leading-snug">{user.dilemma.question}</p>
              </div>
            </div>
          </article>

          {/* BACK — answer */}
          <article className="absolute inset-0 flex flex-col overflow-hidden rounded-[30px] border border-lime/40 bg-[#121726] p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]" aria-hidden={!flipped}>
            {flipped && (
              <AnswerForm
                user={user}
                onCancel={() => setFlipped(false)}
                onSend={(a) => {
                  setExit('right')
                  onLike?.(a)
                }}
              />
            )}
          </article>
        </motion.div>
      </div>

      {/* actions */}
      {!flipped && (
        <div className="relative z-10 -mt-6 flex items-center justify-center gap-4">
          <button onClick={onUndo} className="grid size-11 place-items-center rounded-full border border-cream/10 bg-ink text-gold shadow-lg" aria-label="Annulla ultimo passo">
            <RotateCcw size={17} />
          </button>
          <button onClick={pass} className="grid size-14 place-items-center rounded-full border border-coral/40 bg-ink text-coral shadow-lg transition hover:bg-coral/20" aria-label={`Passa ${user.name}`}>
            <X size={26} strokeWidth={2.6} />
          </button>
          <button onClick={() => setFlipped(true)} className="flex h-14 items-center gap-2 rounded-full bg-lime px-6 font-semibold text-ink glow-lime" aria-label={`Rispondi al dilemma di ${user.name}`}>
            <Heart size={20} fill="currentColor" /> Rispondi
          </button>
        </div>
      )}
    </motion.div>
  )
}

function AnswerForm({ user, onCancel, onSend }: { user: User; onCancel: () => void; onSend: (answer: string) => void }) {
  const [answer, setAnswer] = useState('')
  const lowEffort = /^(ciao|hey|hola|hi|ehi|ok|bella)[!. ]*$/i.test(answer.trim())
  const valid = answer.trim().length >= 3 && !lowEffort
  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSend(answer.trim())
      }}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-lime">
        <KeyRound size={13} /> Rispondi a {user.name}
      </p>
      <h3 className="mt-2 font-display text-[24px] font-bold leading-tight">{user.dilemma.question}</h3>
      <p className="mt-2 text-[12.5px] text-cream/50">Niente “ciao”. {user.name} vedrà solo la tua risposta, e deciderà da quella.</p>
      {user.dilemma.options && user.dilemma.options.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {user.dilemma.options.map((o) => (
            <button type="button" key={o} onClick={() => setAnswer(o)} className={cn('rounded-full border px-3 py-1.5 text-[13px]', answer === o ? 'border-lime bg-lime text-ink' : 'border-cream/15 text-cream/80')}>
              {o}
            </button>
          ))}
        </div>
      )}
      <textarea
        autoFocus
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        maxLength={200}
        placeholder="La tua risposta, con sincerità o con stile…"
        className="mt-4 min-h-0 w-full flex-1 resize-none rounded-2xl border border-cream/10 bg-ink/70 p-3.5 text-[15px] placeholder:text-cream/30 focus:border-lime/60 focus:outline-none"
      />
      <p className={cn('mt-1.5 text-right text-[11.5px]', lowEffort ? 'text-coral' : 'text-cream/35')}>{lowEffort ? 'Un “ciao” non basta 🙂' : `${answer.length}/200`}</p>
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Indietro
        </Button>
        <Button type="submit" disabled={!valid}>
          Invia risposta 💌
        </Button>
      </div>
    </form>
  )
}

