import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Globe2, MapPin, Plane, Plus, Radio, Sparkles, X } from 'lucide-react'
import type { Category, Mode } from '../types'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { affinity, CATEGORY_META, cn, LOCAL_CATEGORIES, planStatus, REMOTE_CATEGORIES, sharedInterests } from '../lib/utils'
import { LivingPlanCard } from '../components/LivingPlanCard'
import { Avatar, Chip, Eyebrow } from '../components/ui'
import { BadgeRow } from '../components/Bestie'

export function FrequencySwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="glass relative grid grid-cols-2 rounded-[20px] p-1" role="tablist" aria-label="Frequenza di scoperta">
      {(['local', 'remote'] as const).map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          onClick={() => onChange(m)}
          className={cn('relative z-10 flex h-12 items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold transition-colors', mode === m ? 'text-ink' : 'text-cream/65 hover:text-cream')}
        >
          {mode === m && (
            <motion.span
              layoutId="freq-pill"
              className={cn('absolute inset-0 -z-10 rounded-2xl', m === 'local' ? 'bg-cyan shadow-[0_0_24px_-4px_rgb(6_182_212/0.7)]' : 'bg-violet shadow-[0_0_24px_-4px_rgb(139_92_246/0.8)]')}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          {m === 'local' ? <Radio size={16} /> : <Globe2 size={16} />}
          <span className={cn(mode === m && m === 'remote' && 'text-cream')}>{m === 'local' ? 'Nel mio raggio' : 'Senza Confini'}</span>
        </button>
      ))}
    </div>
  )
}

export function Explore({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const { state, user, toggleSave } = useStore()
  const nav = useNav()
  const now = useNow(30_000)
  const [habitat, setHabitat] = useState<string | 'all'>('all')
  const [cat, setCat] = useState<Category | 'all'>('all')

  const localPlans = useMemo(() => {
    return state.plans
      .filter((p) => p.mode === 'local' && p.city === state.me.city && p.hostId !== 'me')
      .filter((p) => habitat === 'all' || p.habitat === habitat)
      .filter((p) => cat === 'all' || p.category === cat)
      .sort((a, b) => {
        const ea = planStatus(a, now) === 'EXPIRED' ? 1 : 0
        const eb = planStatus(b, now) === 'EXPIRED' ? 1 : 0
        return ea - eb || a.when - b.when
      })
  }, [state.plans, state.me.city, habitat, cat, now])

  const remotePlans = useMemo(() => {
    return state.plans
      .filter((p) => p.mode === 'remote' && p.hostId !== 'me')
      .filter((p) => cat === 'all' || p.category === cat)
      .map((p) => ({ p, a: affinity(state.me, user(p.hostId)) }))
      .sort((x, y) => y.a - x.a)
  }, [state.plans, state.me, user, cat])

  const people = useMemo(
    () =>
      Object.values(state.users)
        .map((u) => ({ u, a: affinity(state.me, u) }))
        .sort((x, y) => y.a - x.a)
        .slice(0, 6),
    [state.users, state.me],
  )

  const cats = mode === 'local' ? LOCAL_CATEGORIES : REMOTE_CATEGORIES

  return (
    <div className="space-y-5 pb-6">
      <header>
        <Eyebrow>Ciao {state.me.name} · {state.me.city}</Eyebrow>
        <h1 className="mt-1 text-[30px] font-bold leading-[1.02]">
          Less scrolling.
          <br />
          <span className={mode === 'local' ? 'text-lime' : 'text-violet-300'}>More doing.</span>
        </h1>
      </header>

      <FrequencySwitch
        mode={mode}
        onChange={(m) => {
          setMode(m)
          setCat('all')
        }}
      />

      <AnimatePresence mode="wait">
        {mode === 'local' ? (
          <motion.section key="local" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>I tuoi Habitat</Eyebrow>
                <span className="text-[11px] text-cream/40">niente GPS, solo posti che frequenti</span>
              </div>
              <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
                <Chip active={habitat === 'all'} tone="cyan" onClick={() => setHabitat('all')}>
                  🏙️ Tutta {state.me.city}
                </Chip>
                {state.me.habitats.map((h) => (
                  <Chip key={h} active={habitat === h} tone="cyan" onClick={() => setHabitat(h)}>
                    📍 {h}
                  </Chip>
                ))}
              </div>
            </div>
            <CategoryRow cats={cats} cat={cat} setCat={setCat} tone="lime" />
            <div className="space-y-3">
              {localPlans.map((p, i) => (
                <LivingPlanCard
                  key={p.id}
                  index={i}
                  plan={p}
                  now={now}
                  users={p.participants.map(user)}
                  saved={state.saved.includes(p.id)}
                  onSave={() => toggleSave(p.id)}
                  onOpen={() => nav.openPlan(p.id)}
                />
              ))}
              {!localPlans.length && <EmptyState onCreate={nav.openCreate} />}
            </div>
          </motion.section>
        ) : (
          <motion.section key="remote" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            <TravelBridge />
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>Sintonie per affinità</Eyebrow>
                <span className="text-[11px] text-cream/40">filtro km disattivato</span>
              </div>
              <div className="no-scrollbar -mx-4 mt-2 flex gap-3 overflow-x-auto px-4 pb-1">
                {people.map(({ u, a }) => (
                  <button key={u.id} onClick={() => nav.openUser(u.id)} className="glass w-[150px] shrink-0 rounded-3xl p-3 text-left transition hover:border-violet/40">
                    <div className="flex items-start justify-between">
                      <Avatar user={u} size={46} />
                      <span className="font-display text-[15px] font-bold text-violet-300">{a}%</span>
                    </div>
                    <p className="mt-2 font-display text-[15px] font-bold">
                      {u.name}, {u.age}
                    </p>
                    <p className="text-[11.5px] text-cream/50">{u.city}</p>
                    <p className="mt-1.5 line-clamp-2 text-[11.5px] text-cream/70">
                      {sharedInterests(state.me, u).slice(0, 2).join(' · ') || u.interests.slice(0, 2).join(' · ')}
                    </p>
                    <div className="mt-2 scale-90 origin-left">
                      <BadgeRow badges={u.badges.slice(0, 1)} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <CategoryRow cats={cats} cat={cat} setCat={setCat} tone="violet" />
            <div className="space-y-3">
              {remotePlans.map(({ p, a }, i) => (
                <LivingPlanCard
                  key={p.id}
                  index={i}
                  plan={p}
                  now={now}
                  users={p.participants.map(user)}
                  affinity={a}
                  saved={state.saved.includes(p.id)}
                  onSave={() => toggleSave(p.id)}
                  onOpen={() => nav.openPlan(p.id)}
                />
              ))}
              {!remotePlans.length && <EmptyState onCreate={nav.openCreate} />}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}

function CategoryRow({ cats, cat, setCat, tone }: { cats: Category[]; cat: Category | 'all'; setCat: (c: Category | 'all') => void; tone: 'lime' | 'violet' }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      <Chip active={cat === 'all'} tone={tone} onClick={() => setCat('all')}>
        Tutto
      </Chip>
      {cats.map((c) => (
        <Chip key={c} active={cat === c} tone={tone} onClick={() => setCat(c)}>
          {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
        </Chip>
      ))}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-cream/15 p-6 text-center">
      <p className="font-display text-lg font-bold">Ancora niente qui.</p>
      <p className="mt-1 text-sm text-cream/55">Sii tu la prima scintilla: crea un piano in meno di 60 secondi.</p>
      <button onClick={onCreate} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink">
        <Plus size={16} /> Crea piano
      </button>
    </div>
  )
}

function TravelBridge() {
  const { state, addTravel, removeTravel, limits, user, toggleSave } = useStore()
  const nav = useNav()
  const [dest, setDest] = useState('')
  const suggestions = ['Barcellona', 'Valencia', 'Bologna', 'Lisbona', 'Berlino']

  const add = (d: string) => {
    if (state.travelDestinations.length >= limits.travel) {
      nav.openPaywall('Il Travel Bridge Free include 1 meta futura. Con ALONG Forever imposti tutte le città che vuoi, per sempre.')
      return
    }
    if (addTravel(d)) setDest('')
  }

  const matches = state.plans.filter((p) =>
    state.travelDestinations.some((d) => {
      const k = d.toLowerCase()
      return p.city.toLowerCase() === k || p.details.destination?.toLowerCase() === k
    }),
  )
  const locals = Object.values(state.users).filter((u) => state.travelDestinations.some((d) => u.city.toLowerCase() === d.toLowerCase() || u.travel?.toLowerCase() === d.toLowerCase()))

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-cyan/20 bg-[linear-gradient(140deg,rgb(6_182_212/0.16),rgb(139_92_246/0.14))] p-4">
      <div className="absolute -right-10 -top-10 size-36 rounded-full bg-cyan/25 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-cyan text-ink">
            <Plane size={16} />
          </span>
          <div>
            <p className="font-display text-[16px] font-bold">Travel Bridge</p>
            <p className="text-[11.5px] text-cream/55">Connettiti con chi vive lì, prima ancora di partire.</p>
          </div>
          <span className="ml-auto text-[11px] font-semibold text-cream/50">
            {state.travelDestinations.length}/{limits.travel === Infinity ? '∞' : limits.travel}
          </span>
        </div>

        {state.travelDestinations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {state.travelDestinations.map((d) => (
              <span key={d} className="inline-flex items-center gap-1.5 rounded-full bg-cyan px-3 py-1 text-[13px] font-semibold text-ink">
                ✈️ {d}
                <button onClick={() => removeTravel(d)} aria-label={`Rimuovi ${d}`} className="rounded-full p-0.5 hover:bg-ink/15">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            add(dest)
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Meta futura</span>
            <input
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              placeholder="Es. Barcellona per l’Erasmus a settembre"
              className="h-11 w-full rounded-2xl border border-cream/10 bg-ink/60 px-3.5 text-[14px] placeholder:text-cream/30 focus:border-cyan/60 focus:outline-none"
            />
          </label>
          <button type="submit" disabled={!dest.trim()} className="h-11 rounded-2xl bg-cyan px-4 text-sm font-semibold text-ink disabled:opacity-40">
            Imposta
          </button>
        </form>
        {state.travelDestinations.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} onClick={() => add(s)} className="rounded-full border border-cream/10 px-2.5 py-1 text-[12px] text-cream/70 hover:border-cyan/50">
                {s}
              </button>
            ))}
          </div>
        )}

        {state.travelDestinations.length > 0 && (
          <div className="mt-4 space-y-3">
            {locals.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {locals.slice(0, 4).map((u) => (
                    <button key={u.id} onClick={() => nav.openUser(u.id)} aria-label={`Profilo di ${u.name}`}>
                      <Avatar user={u} size={30} ring />
                    </button>
                  ))}
                </div>
                <p className="text-[12.5px] text-cream/70">
                  <span className="font-semibold text-cream">{locals.map((u) => u.name).join(', ')}</span> {locals.length === 1 ? 'è' : 'sono'} lì o ci andrà.
                </p>
              </div>
            )}
            {matches.map((p, i) => (
              <LivingPlanCard key={p.id} index={i} plan={p} users={p.participants.map(user)} saved={state.saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => nav.openPlan(p.id)} />
            ))}
            {!matches.length && (
              <p className="flex items-center gap-1.5 rounded-2xl bg-ink/40 p-3 text-[12.5px] text-cream/60">
                <Sparkles size={14} className="text-cyan" /> Nessun piano lì per ora. Ti avviseremo appena qualcuno del posto ne pubblica uno.
              </p>
            )}
          </div>
        )}
        {!state.lifetime && state.travelDestinations.length >= 1 && (
          <button onClick={() => nav.openPaywall('Il Travel Bridge Free include 1 meta futura. Con ALONG Forever imposti tutte le città che vuoi, per sempre.')} className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-cyan">
            <MapPin size={13} /> Più mete? Sblocca il Travel Bridge illimitato
          </button>
        )}
      </div>
    </div>
  )
}
