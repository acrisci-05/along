import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type Variants } from 'motion/react'
import { ArrowLeft, Globe2, Info, KeyRound, LayoutList, Lock, MoreHorizontal, Plane, Radio, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import type { Mode, Plan, User } from '../types'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { DAILY_LIMIT, todayKey } from '../data/mock'
import { isMinor } from '../lib/age'
import { affinity, cn, planStatus, planWhen, sharedInterests } from '../lib/utils'
import { Portrait } from '../components/Portrait'
import { Button, Chip, Sheet } from '../components/ui'
import { Explore, TravelBridge } from './Explore'

const PAGES = ['La locandina', 'In comune', 'Affidabilità'] as const

const RELIABILITY = [
  { key: 'fast' as const, emoji: '⚡', label: 'Fast Replier', on: 'risponde in fretta', off: 'non ancora' },
  { key: 'voice' as const, emoji: '🎙️', label: 'Voice Lover', on: 'ama i vocali', off: 'non ancora' },
  { key: 'zero' as const, emoji: '🛡️', label: 'Zero Ghosting', on: 'mai sparit*', off: 'non ancora' },
]

/** Exit choreography: pass = card dropped away, answer = card flying off like a sent ticket. */
const CARD_EXIT: Variants = {
  exit: (dir: 'left' | 'right') =>
    dir === 'right'
      ? { x: 380, y: -140, rotate: 18, scale: 0.85, opacity: 0, transition: { duration: 0.42, ease: [0.3, 0, 0.2, 1] as const } }
      : { x: -340, y: 220, rotate: -38, opacity: 0, transition: { duration: 0.5, ease: [0.55, 0, 0.75, 0.2] as const } },
}

function distanceLabel(u: User, me: User) {
  if (u.city === me.city) return `a ${String(u.distanceKm ?? 2).replace('.', ',')} km da te`
  return `${u.city}${u.distanceKm ? ` · ${u.distanceKm.toLocaleString('it-IT')} km` : ''}`
}

export function Discover({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const [view, setView] = useState<'people' | 'plans'>('people')
  if (view === 'plans')
    return (
      <div>
        <button onClick={() => setView('people')} className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-md bg-cream px-3.5 text-sm font-semibold text-ink">
          <ArrowLeft size={15} /> Torna alle persone
        </button>
        <Explore mode={mode} setMode={setMode} />
      </div>
    )
  return <Deck mode={mode} setMode={setMode} onPlans={() => setView('plans')} />
}

function Deck({ mode, setMode, onPlans }: { mode: Mode; setMode: (m: Mode) => void; onPlans: () => void }) {
  const store = useStore()
  const { state, setPrefs, passUser, likeUser, undoSwipe, resetDeck, toast, newDay, allowed } = store
  const minor = isMinor(state.me)
  const [dir, setDir] = useState<'left' | 'right'>('left')
  const daily = state.daily.day === todayKey() ? state.daily : { day: todayKey(), seen: 0, answered: 0, matches: 0 }
  const dayOver = daily.seen >= DAILY_LIMIT
  const nav = useNav()
  const [filters, setFilters] = useState(false)
  const [travel, setTravel] = useState(false)
  const { prefs, me } = state

  const deck = useMemo(() => {
    const busy = new Set(state.chats.filter((c) => (c.status === 'active' || c.status === 'waiting') && c.peerIds.length === 1).flatMap((c) => c.peerIds))
    const pending = new Set(state.likesIn.filter((l) => l.status === 'new').map((l) => l.userId))
    const travelCities = state.travelDestinations.map((d) => d.toLowerCase())
    return Object.values(state.users)
      .filter((u) => allowed(u.id) && !state.swipes[u.id] && !busy.has(u.id) && !pending.has(u.id))
      .filter((u) => u.intent.includes(prefs.intent))
      .filter((u) => prefs.show === 'all' || u.gender === prefs.show)
      .filter((u) => u.age >= prefs.ageMin && u.age <= prefs.ageMax)
      .filter((u) => {
        const near = u.city === me.city || travelCities.includes(u.city.toLowerCase())
        return mode === 'local' ? near : u.city !== me.city
      })
      .sort((a, b) => affinity(me, b) - affinity(me, a))
  }, [state.users, state.swipes, state.chats, state.likesIn, state.travelDestinations, prefs, me, mode, allowed])

  const top = dayOver ? undefined : deck[0]
  const next = dayOver ? undefined : deck[1]
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
              disabled={minor && k === 'date'}
              title={minor && k === 'date' ? 'Disponibile dai 18 anni' : undefined}
              onClick={() => setPrefs({ intent: k })}
              className={cn('h-9 rounded-xl text-sm font-semibold transition', prefs.intent === k ? (k === 'date' ? 'bg-brand text-ink' : 'bg-brand text-ink') : 'text-cream/60')}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMode(mode === 'local' ? 'remote' : 'local')}
          className={cn('flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold', mode === 'local' ? 'bg-cyan/15 text-cyan' : 'bg-violet/20 text-violet')}
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
        <button onClick={() => setTravel(true)} className="flex items-center gap-2 rounded-2xl border border-cyan/25 bg-cyan/10 px-3 py-2 text-left text-sm">
          <Plane size={15} className="text-cyan" />
          <span className="flex-1 text-cream/80">
            {state.travelDestinations.length ? (
              <>
                Travel Bridge: <span className="font-semibold text-cream">{state.travelDestinations.join(', ')}</span>: le persone del posto appaiono in “Vicino”
              </>
            ) : (
              'Parti presto? Imposta una meta e conosci chi vive lì prima di arrivare'
            )}
          </span>
        </button>
      )}

      {/* daily selection meter */}
      <div className="flex items-center gap-3" aria-label={`Selezione di oggi: ${Math.min(daily.seen, DAILY_LIMIT)} su ${DAILY_LIMIT}`}>
        <p className="serif shrink-0 text-base text-cream/60">selezione di oggi</p>
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <motion.div className="h-full bg-brand" animate={{ width: `${(Math.min(daily.seen, DAILY_LIMIT) / DAILY_LIMIT) * 100}%` }} />
        </div>
        <span className="shrink-0 font-display text-sm font-extrabold tabular-nums">
          {Math.min(daily.seen, DAILY_LIMIT)}/{DAILY_LIMIT}
        </span>
      </div>

      {/* stack */}
      <div className="relative min-h-[360px] flex-1">
        <AnimatePresence custom={dir}>
          {next && <SwipeCard key={next.id} user={next} plan={planOf(next)} me={me} behind />}
          {top && (
            <SwipeCard
              key={top.id}
              user={top}
              plan={planOf(top)}
              me={me}
              onPass={() => {
                setDir('left')
                passUser(top.id)
              }}
              onLike={(answer) => {
                setDir('right')
                likeUser(top.id, answer)
                toast({ tone: 'coral', title: `Risposta inviata a ${top.name} 💌`, body: 'Se le/gli piace, è match e le foto si svelano.' })
              }}
              onInfo={() => nav.openUser(top.id)}
              onMore={() => nav.openSafety(top.id)}
              onPlan={(id) => nav.openPlan(id)}
              onUndo={undo}
            />
          )}
        </AnimatePresence>
        {dayOver && <DayOver daily={daily} onNewDay={newDay} />}
        {!top && !dayOver && (
          <div className="absolute inset-0 grid place-items-center rounded-md border border-dashed border-line p-6 text-center">
            <div>
              <p className="text-3xl" aria-hidden>
                🌙
              </p>
              <p className="mt-3 font-display text-xl font-bold">Per ora è tutto, qui.</p>
              <p className="mt-1 text-sm text-cream/55">Meno scroll, più vita. Rispondi a chi ti ha scritto, oppure allarga il raggio.</p>
              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={() => nav.setTab('likes')}>Vedi chi ti ha risposto</Button>
                <Button variant="outline" onClick={() => setMode(mode === 'local' ? 'remote' : 'local')}>
                  {mode === 'local' ? 'Prova Senza Confini' : 'Torna vicino a te'}
                </Button>
                <button onClick={resetDeck} className="mt-1 text-sm font-semibold text-cream/50 hover:text-cream">
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
            <p className="mb-2 text-sm font-semibold">Mostrami</p>
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
            <p className="mb-2 text-sm font-semibold">
              Età: {prefs.ageMin}–{prefs.ageMax}
            </p>
            <label className="flex items-center gap-3 text-sm text-cream/55">
              min
              <input type="range" min={minor ? 16 : 18} max={prefs.ageMax} value={prefs.ageMin} onChange={(e) => setPrefs({ ageMin: Number(e.target.value) })} className="flex-1" />
            </label>
            <label className="mt-2 flex items-center gap-3 text-sm text-cream/55">
              max
              <input type="range" min={prefs.ageMin} max={minor ? 17 : 60} value={prefs.ageMax} onChange={(e) => setPrefs({ ageMax: Number(e.target.value) })} className="flex-1" />
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
  onMore,
}: {
  onMore?: () => void
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
  const [page, setPage] = useState(0)
  const dragged = useRef(false)
  const aff = affinity(me, user)
  const revealedCommon = sharedInterests(me, user)
  const commonHabitats = user.habitats.filter((h) => me.habitats.includes(h))

  const pass = () => onPass?.()

  useEffect(() => {
    if (behind || flipped) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [role=dialog]')) return
      if (e.key === 'ArrowLeft') pass()
      if (e.key === 'ArrowRight') setFlipped(true)
      if (e.key === 'ArrowDown') setPage((p) => Math.min(PAGES.length - 1, p + 1))
      if (e.key === 'ArrowUp') setPage((p) => Math.max(0, p - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [behind, flipped])

  if (behind)
    return (
      <motion.div key="behind" className="absolute inset-x-0 top-0 bottom-[72px] z-0 overflow-hidden rounded-2xl bg-surface" initial={{ scale: 0.9, y: 18, opacity: 0 }} animate={{ scale: 0.95, y: 10, opacity: 0.6 }} exit={{ opacity: 0 }} aria-hidden>
        <Portrait look={user.look} hue={user.hue} className="h-full w-full scale-125 blur-[26px] opacity-60" />
      </motion.div>
    )

  const whenText = plan ? (plan.whenLabel ?? planWhen(plan).replace(' · ', ' alle ')).toLowerCase() : ''
  const place = plan ? plan.district ?? plan.habitat.split('·')[0].trim() : user.city
  const goPage = (d: 1 | -1) => setPage((p) => Math.max(0, Math.min(PAGES.length - 1, p + d)))

  return (
    <motion.div key="front" className="absolute inset-0 z-10" variants={CARD_EXIT} initial={false} exit="exit">
    <motion.div
      className="absolute inset-0 flex flex-col"
      style={{ x, rotate }}
      initial={{ scale: 0.95, y: 12, opacity: 0.6 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      drag={flipped ? false : 'x'}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={(_, info) => {
        window.setTimeout(() => (dragged.current = false), 60)
        if (info.offset.x < -110 || info.velocity.x < -700) pass()
        else if (info.offset.x > 110 || info.velocity.x > 700) setFlipped(true)
      }}
    >
      <div className="relative min-h-0 flex-1 [perspective:1400px]">
        <motion.div className="relative h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }}>
          {/* FRONT — full-bleed photo card with story pages */}
          <article
            className={cn('absolute inset-0 overflow-hidden rounded-2xl bg-surface text-cream [backface-visibility:hidden]', flipped && 'pointer-events-none')}
            aria-label={`${user.name}, ${user.age}${plan ? `: ${plan.title}` : ''}`}
            aria-hidden={flipped}
          >
            <Portrait look={user.look} hue={user.hue} className="absolute inset-0 h-full w-full scale-[1.3] blur-[22px]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(28_22_18/0.15)_0%,transparent_30%,rgb(28_22_18/0.75)_55%,rgb(28_22_18/0.97)_100%)]" />

            {/* story progress + lock */}
            <div className="absolute inset-x-3 top-2.5 z-10 flex gap-1.5" aria-hidden>
              {PAGES.map((pg, i) => (
                <span key={pg} className={cn('h-[3px] flex-1 rounded-full transition-colors', i === page ? 'bg-cream' : 'bg-cream/30')} />
              ))}
            </div>
            <button onClick={() => !dragged.current && onMore?.()} className="absolute right-2 top-5 z-10 grid size-9 place-items-center rounded-full bg-ink/40 text-cream hover:bg-ink/60" aria-label={`Altre opzioni per ${user.name}: blocca o segnala`}>
              <MoreHorizontal size={18} />
            </button>
            <span className="absolute left-3 top-6 z-10 flex items-center gap-1 rounded-md bg-ink/50 px-2 py-1 text-xs font-semibold text-cream">
              <Lock size={11} /> Foto visibile dopo il match
            </span>

            {/* tap zones */}
            <button className="absolute left-0 top-0 bottom-[45%] z-0 w-2/5" onClick={() => !dragged.current && goPage(-1)} aria-label="Pagina precedente del profilo" disabled={page === 0} />
            <button className="absolute right-0 top-0 bottom-[45%] z-0 w-3/5" onClick={() => !dragged.current && goPage(1)} aria-label="Pagina successiva del profilo" disabled={page === PAGES.length - 1} />

            {/* stamps */}
            <motion.span style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-4 top-16 z-20 -rotate-12 rounded-md border-2 border-brand px-3 py-1 text-2xl font-extrabold tracking-wide text-brand">
              RISPONDO
            </motion.span>
            <motion.span style={{ opacity: passOpacity }} className="pointer-events-none absolute right-4 top-16 z-20 rotate-12 rounded-md border-2 border-cream px-3 py-1 text-2xl font-extrabold tracking-wide text-cream">
              PASSO
            </motion.span>

            {/* bottom info */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
              <button onClick={() => !dragged.current && onInfo?.()} className="pointer-events-auto flex w-full items-end justify-between gap-2 text-left" aria-label={`Profilo completo di ${user.name}`}>
                <span className="min-w-0">
                  <span className="block text-2xl font-extrabold leading-none tracking-[-0.03em]">
                    {user.name} <span className="font-medium">{user.age}</span>
                  </span>
                  <span className="mt-1.5 block truncate text-sm text-cream/80">
                    {distanceLabel(user, me)} · {aff}% di sintonia · {user.intent.map((i) => (i === 'date' ? 'Date' : 'Amici')).join(', ')}
                  </span>
                </span>
                <Info size={20} className="mb-0.5 shrink-0 text-cream/80" />
              </button>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={page} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="mt-3">
                  {page === 0 &&
                    (plan ? (
                      <button onClick={() => !dragged.current && onPlan?.(plan.id)} className="pointer-events-auto block text-left">
                        <span className="block text-sm text-cream/70">
                          Propone {whenText}, {place}
                        </span>
                        <span className="mt-0.5 block text-base font-semibold leading-snug">{plan.title}</span>
                      </button>
                    ) : (
                      <p className="text-sm text-cream/70">Nessun piano proposto per ora.</p>
                    ))}
                  {page === 1 && (
                    <div>
                      <p className="text-sm text-cream/70">{revealedCommon.length ? 'Avete in comune' : 'Niente in comune, per ora. A volte è proprio il bello.'}</p>
                      <p className="mt-1 text-base font-semibold leading-snug">{(revealedCommon.length ? revealedCommon : user.interests.slice(0, 4)).join(' · ')}</p>
                      {commonHabitats.length > 0 && <p className="mt-1 text-sm text-cream/70">Frequentate {commonHabitats.join(' e ')}</p>}
                    </div>
                  )}
                  {page === 2 && (
                    <div>
                      <p className="text-sm text-cream/70">{user.karma} punti karma</p>
                      <ul className="mt-1 grid gap-0.5">
                        {RELIABILITY.map((r) => {
                          const on = user.badges.includes(r.key)
                          return (
                            <li key={r.key} className={cn('flex justify-between text-sm', on ? 'font-semibold text-cream' : 'text-cream/40')}>
                              <span>{r.label}</span>
                              <span>{on ? r.on : r.off}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-3 rounded-xl bg-cream/[0.12] px-3 py-2.5 backdrop-blur-sm">
                <p className="text-xs font-semibold text-cream/70">Il suo dilemma</p>
                <p className="line-clamp-2 text-base font-semibold leading-snug">{user.dilemma.question}</p>
              </div>
            </div>
          </article>

          {/* BACK — answer */}
          <article className={cn('absolute inset-0 flex flex-col overflow-hidden rounded-2xl border p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]', !flipped && 'pointer-events-none')} style={{ background: '#221b16', borderColor: 'var(--color-line)' }} aria-hidden={!flipped}>
            {flipped && (
              <AnswerForm
                user={user}
                onCancel={() => setFlipped(false)}
                onSend={(a) => onLike?.(a)}
              />
            )}
          </article>
        </motion.div>
      </div>

      {/* actions */}
      {!flipped && (
        <div className="flex items-center justify-center gap-4 pt-3">
          <button onClick={onUndo} className="grid size-11 place-items-center rounded-full border border-line text-muted hover:text-cream" aria-label="Annulla ultimo passo">
            <RotateCcw size={17} />
          </button>
          <button onClick={pass} className="grid size-14 place-items-center rounded-full border border-line text-cream/80 hover:border-cream/40" aria-label={`Passa ${user.name}`}>
            <X size={24} />
          </button>
          <button onClick={() => setFlipped(true)} className="h-14 rounded-full bg-brand px-9 text-base font-bold text-ink hover:brightness-105" aria-label={`Rispondi al dilemma di ${user.name}`}>
            Rispondi
          </button>
        </div>
      )}
    </motion.div>
    </motion.div>
  )
}

function DayOver({ daily, onNewDay }: { daily: { seen: number; answered: number; matches: number }; onNewDay: () => void }) {
  const { state } = useStore()
  const nav = useNav()
  const now = useNow(1000)
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const left = midnight.getTime() - now
  const hh = String(Math.floor(left / 3_600_000)).padStart(2, '0')
  const mm = String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, '0')
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')
  const newLikes = state.likesIn.filter((l) => l.status === 'new').length
  return (
    <motion.section
      initial={{ opacity: 0, y: 30, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="no-scrollbar absolute inset-0 flex flex-col overflow-y-auto rounded-2xl border border-line bg-surface p-5 text-cream"
      aria-label="Selezione di oggi terminata"
    >
      <p className="text-sm font-semibold text-muted">Selezione finita</p>
      <h2 className="mt-1 text-[clamp(32px,10vw,48px)] leading-[0.9]">Per oggi è tutto.</h2>
      <p className="mt-2 text-sm font-semibold text-cream/70">Meno scroll, più vita. Domani altri {DAILY_LIMIT} profili scelti per sintonia.</p>
      <dl className="mt-3 grid grid-cols-3 border-y border-line">
        {(
          [
            ['visti', daily.seen],
            ['risposte', daily.answered],
            ['match', daily.matches],
          ] as const
        ).map(([k, v], i) => (
          <div key={k} className={cn('py-2 text-center', i > 0 && 'border-l border-line')}>
            <dd className="font-display text-2xl font-extrabold tabular-nums">{v}</dd>
            <dt className="text-xs font-bold uppercase">{k}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm font-semibold text-muted">Prossimo turno tra</p>
      <p className="font-display text-2xl font-extrabold tabular-nums tracking-[-0.04em]" aria-live="off">
        {hh}:{mm}:{ss}
      </p>
      <div className="mt-auto grid gap-2 pt-3">
        <Button onClick={() => nav.setTab('likes')} disabled={!newLikes}>
          {newLikes ? `Rispondi ai like (${newLikes})` : 'Nessun like in attesa'}
        </Button>
        <button onClick={nav.openCreate} className="h-11 rounded-full border border-line font-semibold">
          Proponi un piano per stasera
        </button>
        <button onClick={onNewDay} className="text-xs font-semibold text-cream/50 underline-offset-2 hover:underline">
          Demo: inizia un nuovo giorno
        </button>
      </div>
    </motion.section>
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
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand">
        <KeyRound size={13} /> Rispondi a {user.name}
      </p>
      <h3 className="mt-2 font-display text-xl font-bold leading-tight">{user.dilemma.question}</h3>
      <p className="mt-2 text-sm text-cream/50">Niente “ciao”. {user.name} vedrà solo la tua risposta, e deciderà da quella.</p>
      {user.dilemma.options && user.dilemma.options.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {user.dilemma.options.map((o) => (
            <button type="button" key={o} onClick={() => setAnswer(o)} className={cn('rounded-md border px-3 py-1.5 text-sm', answer === o ? 'border-brand bg-brand text-ink' : 'border-cream/15 text-cream/80')}>
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
        className="mt-4 min-h-0 w-full flex-1 resize-none rounded-2xl border border-cream/10 bg-ink/70 p-3.5 text-base placeholder:text-cream/30 focus:border-brand/60 focus:outline-none"
      />
      <p className={cn('mt-1.5 text-right text-xs', lowEffort ? 'text-brand' : 'text-cream/35')}>{lowEffort ? 'Un “ciao” non basta 🙂' : `${answer.length}/200`}</p>
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

