import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { List, Map as MapIcon, MapPin } from 'lucide-react'
import { DISTRICTS, HABITATS } from '../data/mock'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { CATEGORY_META, cn, planStatus } from '../lib/utils'
import { LivingPlanCard } from '../components/LivingPlanCard'
import { Chip, Eyebrow } from '../components/ui'

const KIND_COLOR: Record<string, string> = {
  food: '#FF806D',
  drink: '#FF806D',
  sport: '#D7FF66',
  cinema: '#8B5CF6',
  study: '#06B6D4',
  walk: '#D7FF66',
}

export function Radar() {
  const { state, user, toggleSave, planVisible } = useStore()
  const nav = useNav()
  const now = useNow(30_000)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [selected, setSelected] = useState<string | null>(null)
  const [kind, setKind] = useState<string>('all')
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }, [selected])

  const live = useMemo(() => state.plans.filter((p) => p.mode === 'local' && p.city === state.me.city && planStatus(p, now) !== 'EXPIRED' && planVisible(p)), [state.plans, state.me.city, now, planVisible])

  const byHabitat = useMemo(() => {
    const m: Record<string, number> = {}
    live.forEach((p) => (m[p.habitat] = (m[p.habitat] ?? 0) + 1))
    return m
  }, [live])

  const pins = Object.entries(HABITATS).filter(([, h]) => kind === 'all' || h.kind === kind || (kind === 'food' && h.kind === 'drink'))
  const selectedPlans = live.filter((p) => p.habitat === selected)

  const districts = DISTRICTS.map((d) => ({
    ...d,
    plans: live.filter((p) => (p.district ?? HABITATS[p.habitat]?.district) === d.name),
  })).sort((a, b) => b.plans.length - a.plans.length)

  return (
    <div className="space-y-4 pb-6">
      <header className="flex items-end justify-between">
        <div>
          <Eyebrow>City Radar · {state.me.city}</Eyebrow>
          <h1 className="mt-1 text-2xl font-bold leading-none">
            Cosa succede <span className="text-cyan">qui</span>
          </h1>
        </div>
        <div className="glass flex rounded-2xl p-1" role="tablist" aria-label="Vista radar">
          {(
            [
              ['map', MapIcon, 'Mappa'],
              ['list', List, 'Quartieri'],
            ] as const
          ).map(([k, Icon, l]) => (
            <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cn('flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold', view === k ? 'bg-cyan text-ink' : 'text-cream/60')}>
              <Icon size={15} /> {l}
            </button>
          ))}
        </div>
      </header>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={kind === 'all'} tone="cyan" onClick={() => setKind('all')}>
          Tutto
        </Chip>
        {(['food', 'sport', 'cinema', 'study', 'walk'] as const).map((k) => (
          <Chip key={k} active={kind === k} tone="cyan" onClick={() => setKind(k)}>
            {CATEGORY_META[k].emoji} {CATEGORY_META[k].label}
          </Chip>
        ))}
      </div>

      {view === 'map' ? (
        <div className="relative aspect-[1/1.05] overflow-hidden rounded-3xl border border-cyan/20 bg-[#1f1915]">
          <svg viewBox="0 0 100 105" className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M6 0H0V6" fill="none" stroke="rgb(6 182 212 / 0.08)" strokeWidth="0.3" />
              </pattern>
              <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0d2540" />
                <stop offset="1" stopColor="#081626" />
              </linearGradient>
            </defs>
            <rect width="100" height="105" fill="url(#grid)" />
            {/* the gulf */}
            <path d="M0 70 C 10 66, 18 74, 24 72 S 36 76, 44 70 S 56 66, 64 62 S 82 64, 100 58 L100 105 L0 105 Z" fill="url(#sea)" />
            <path d="M0 70 C 10 66, 18 74, 24 72 S 36 76, 44 70 S 56 66, 64 62 S 82 64, 100 58" fill="none" stroke="rgb(6 182 212 / 0.55)" strokeWidth="0.5" strokeDasharray="1.2 1" />
            {/* streets */}
            <path d="M8 50 L40 46 L62 36 L92 40" stroke="rgb(246 244 239 / 0.09)" strokeWidth="1.1" fill="none" />
            <path d="M30 20 L36 46 L44 64" stroke="rgb(246 244 239 / 0.09)" strokeWidth="0.9" fill="none" />
            <path d="M58 14 L60 40 L76 52" stroke="rgb(246 244 239 / 0.09)" strokeWidth="0.9" fill="none" />
            {DISTRICTS.map((d) => (
              <text key={d.name} x={d.x} y={d.y - 6} textAnchor="middle" fontSize="2.6" fill="rgb(246 244 239 / 0.35)" fontFamily="Space Grotesk" letterSpacing="0.3">
                {d.name.toUpperCase()}
              </text>
            ))}
            <text x="70" y="88" fontSize="3" fill="rgb(6 182 212 / 0.35)" fontFamily="Space Grotesk" fontStyle="italic">
              Golfo di Napoli
            </text>
          </svg>
          {/* radar sweep */}
          <div className="pointer-events-none absolute left-1/2 top-[45%] aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2" aria-hidden>
            <div className="radar-sweep absolute inset-0 rounded-full" />
            {[1, 2, 3].map((r) => (
              <div key={r} className="absolute rounded-full border border-cyan/15" style={{ inset: `${r * 12}%` }} />
            ))}
          </div>
          {/* me */}
          <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2" aria-hidden>
            <span className="block size-3 rounded-full bg-cream shadow-[0_0_0_6px_rgb(246_244_239/0.15)]" />
          </div>
          {pins.map(([name, h]) => {
            const count = byHabitat[name] ?? 0
            const color = KIND_COLOR[h.kind]
            const active = selected === name
            return (
              <motion.button
                key={name}
                onClick={() => setSelected(active ? null : name)}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${h.x}%`, top: `${(h.y / 105) * 100}%` }}
                initial={{ scale: 0, y: 6 }}
                animate={{ scale: active ? 1.2 : 1, y: 0 }}
                whileHover={{ scale: 1.15 }}
                aria-label={`${name}: ${count} piani`}
                aria-pressed={active}
              >
                <span className="relative flex flex-col items-center">
                  <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold text-ink shadow-lg" style={{ background: color, boxShadow: `0 0 16px ${color}88` }}>
                    {CATEGORY_META[h.kind as keyof typeof CATEGORY_META]?.emoji}
                    {count > 0 && <span>{count}</span>}
                  </span>
                  <span className="h-2 w-0.5" style={{ background: color }} />
                  {count > 0 && <span className="absolute -bottom-1 size-2 animate-ping rounded-full" style={{ background: color }} />}
                </span>
              </motion.button>
            )
          })}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl bg-ink/70 px-3 py-2 text-xs text-cream/65 backdrop-blur">
            <span>
              <span className="font-semibold text-cyan">{live.length} piani vivi</span> nei tuoi dintorni
            </span>
            <span>Tocca un pin</span>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {districts.map((d) => (
            <li key={d.name} className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-display font-bold">
                  <MapPin size={15} className="text-cyan" /> {d.name}
                </p>
                <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', d.plans.length ? 'bg-cyan/15 text-cyan' : 'bg-cream/5 text-cream/40')}>{d.plans.length} piani</span>
              </div>
              {d.plans.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.plans.map((p) => (
                    <button key={p.id} onClick={() => nav.openPlan(p.id)} className="rounded-md border border-cream/10 px-2.5 py-1 text-sm text-cream/80 hover:border-cyan/50">
                      {CATEGORY_META[p.category].emoji} {p.title}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div ref={detailRef} className="scroll-mt-4" />
      <AnimatePresence>
        {view === 'map' && selected && (
          <motion.section key={selected} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3" aria-live="polite">
            <div>
              <Eyebrow>Habitat selezionato</Eyebrow>
              <p className="font-display text-lg font-bold">{selected}</p>
              <p className="text-sm text-cream/50">{HABITATS[selected]?.district}</p>
            </div>
            {selectedPlans.map((p, i) => (
              <LivingPlanCard key={p.id} plan={p} index={i} now={now} users={p.participants.map(user)} saved={state.saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => nav.openPlan(p.id)} />
            ))}
            {!selectedPlans.length && (
              <div className="rounded-2xl border border-dashed border-cream/15 p-4 text-center text-sm text-cream/55">
                Nessun piano qui ora.{' '}
                <button onClick={nav.openCreate} className="font-semibold text-brand underline-offset-2 hover:underline">
                  Creane uno
                </button>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
