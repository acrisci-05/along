import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Globe2, Lock, MapPin, Minus, Plus, Rocket, Timer } from 'lucide-react'
import type { Category, Mode, Plan } from '../types'
import { HABITATS, PRESET_DILEMMAS, TEMPLATES } from '../data/mock'
import { CATEGORY_META, cn, LOCAL_CATEGORIES, REMOTE_CATEGORIES } from '../lib/utils'
import { useStore } from '../store/store'
import { LivingPlanCard } from './LivingPlanCard'
import { Button, Chip, Sheet, Toggle } from './ui'

type WhenKey = 'today' | 'tomorrow' | 'weekend' | 'custom'
const STEPS = ['Cosa', 'Dove', 'Quando', 'Quanti', 'Dilemma'] as const
const REMOTE_HABITATS = ['Discord · vocale', 'Spotify · playlist', 'Audio-capsule · asincrono', 'Videochiamata', 'Online · chat']
const VIBES = ['Chiacchiere vere', 'Niente telefoni', 'Si divide tutto', 'Chill', 'Competitivo', 'Puntualità svizzera', 'Nuovi in città', 'Mic on']

function computeWhen(key: WhenKey, time: string, custom: string) {
  const [hh, mm] = time.split(':').map(Number)
  const d = new Date()
  if (key === 'tomorrow') d.setDate(d.getDate() + 1)
  if (key === 'weekend') {
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 || day === 6 ? 0 : 6 - day))
  }
  if (key === 'custom' && custom) {
    const [y, m, day] = custom.split('-').map(Number)
    d.setFullYear(y, m - 1, day)
  }
  d.setHours(hh || 20, mm || 0, 0, 0)
  if (key === 'today' && d.getTime() < Date.now()) d.setTime(Date.now() + 60 * 60_000)
  return d.getTime()
}

export function QuickCreate({ open, onClose, onPaywall, onCreated }: { open: boolean; onClose: () => void; onPaywall: (reason: string) => void; onCreated: (planId: string) => void }) {
  const { state, createPlan, hostedActivePlans, limits } = useStore()
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('drink')
  const [mode, setMode] = useState<Mode>('local')
  const [habitat, setHabitat] = useState('')
  const [whenKey, setWhenKey] = useState<WhenKey>('today')
  const [time, setTime] = useState('20:30')
  const [custom, setCustom] = useState('')
  const [capacity, setCapacity] = useState(4)
  const [dilemma, setDilemma] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [vibes, setVibes] = useState<string[]>([])
  const [cost, setCost] = useState('')
  const [started, setStarted] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setTitle('')
    setCategory('drink')
    setMode('local')
    setHabitat('')
    setWhenKey('today')
    setTime('20:30')
    setCustom('')
    setCapacity(4)
    setDilemma('')
    setPrivacy(false)
    setVibes([])
    setCost('')
    setStarted(Date.now())
    setElapsed(0)
  }, [open])

  useEffect(() => {
    if (!open || !started) return
    const iv = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [open, started])

  const habitatOptions = mode === 'local' ? Array.from(new Set([...state.me.habitats, ...Object.keys(HABITATS)])) : REMOTE_HABITATS
  const when = computeWhen(whenKey, time, custom)

  const draft: Plan = useMemo(
    () => ({
      id: 'preview',
      hostId: 'me',
      title,
      category,
      mode,
      city: state.me.city,
      habitat: habitat,
      district: mode === 'local' ? HABITATS[habitat]?.district : undefined,
      when,
      capacity,
      participants: ['me'],
      vibes,
      dilemma: { question: dilemma },
      details: {
        studyMode: category === 'study' ? 'silenzioso' : undefined,
        level: category === 'sport' ? 'Tutti i livelli' : undefined,
        budget: cost && (category === 'food' || category === 'drink') ? `${cost} € a testa circa` : undefined,
        platform: mode === 'remote' ? habitat.split(' · ')[0] : undefined,
        timezone: mode === 'remote' ? 'CET (UTC+1)' : undefined,
      },
      privacy,
      interested: [],
      createdAt: Date.now(),
    }),
    [title, category, mode, habitat, when, capacity, vibes, dilemma, privacy, cost, state.me.city],
  )

  const canNext = [title.trim().length >= 3, habitat.length > 0, whenKey !== 'custom' || !!custom, capacity >= 2, dilemma.trim().length >= 8][step]

  const publish = () => {
    const r = createPlan({
      title,
      category,
      mode,
      habitat,
      when,
      capacity,
      dilemma,
      vibes,
      privacy,
      cost: cost ? Number(cost) * capacity : undefined,
      details: draft.details,
    })
    if (r.ok) {
      onCreated(r.planId)
      onClose()
    } else {
      onPaywall(`Hai già ${limits.plans} piani attivi: il massimo del livello Free. Con ALONG Forever crei piani illimitati, per sempre.`)
    }
  }

  const mm = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`
  const atLimit = hostedActivePlans.length >= limits.plans

  return (
    <Sheet open={open} onClose={onClose} full labelledBy="qc-title">
      <div className="flex items-center justify-between">
        <h2 id="qc-title" className="text-xl font-bold">
          Quick Create
        </h2>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums', elapsed < 60 ? 'bg-cyan/15 text-cyan' : 'bg-coral/15 text-coral')}>
          <Timer size={13} /> {mm} / 1:00
        </span>
      </div>
      {atLimit && (
        <p className="mt-2 rounded-xl bg-gold/10 px-3 py-2 text-[12px] text-gold">
          Hai {hostedActivePlans.length}/{limits.plans} piani attivi. Per pubblicarne un altro serve ALONG Forever.
        </p>
      )}

      {/* progress */}
      <ol className="mt-3 flex gap-1.5" aria-label="Passaggi">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" onClick={() => i < step && setStep(i)} className="block w-full text-left" aria-current={i === step ? 'step' : undefined} disabled={i > step}>
              <span className={cn('block h-1 rounded-full transition-colors', i <= step ? 'bg-lime' : 'bg-cream/10')} />
              <span className={cn('mt-1 block text-[10.5px] font-semibold', i === step ? 'text-lime' : 'text-cream/35')}>
                {i + 1}. {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* live preview */}
      <div className="mt-4" aria-live="polite">
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-cream/40">Live preview</p>
        <LivingPlanCard plan={draft} users={[state.me]} preview />
      </div>

      <div className="mt-5 min-h-[220px]">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }}>
            {step === 0 && (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold">Cosa vuoi fare?</span>
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={60}
                    placeholder="Es. Pizza fritta e passeggiata"
                    className="mt-2 h-12 w-full rounded-2xl border border-cream/10 bg-ink/70 px-4 text-[15px] placeholder:text-cream/30 focus:border-lime/60 focus:outline-none"
                  />
                </label>
                <div>
                  <p className="mb-2 text-[12px] font-semibold text-cream/50">Template a 1 tap</p>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map((t) => (
                      <Chip
                        key={t.label}
                        active={title === t.title}
                        onClick={() => {
                          setTitle(t.title)
                          setCategory(t.category)
                          setMode(t.mode)
                          setCapacity(t.capacity)
                          setHabitat('')
                        }}
                      >
                        {t.emoji} {t.label}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-semibold text-cream/50">Categoria</p>
                  <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
                    {[...LOCAL_CATEGORIES, ...REMOTE_CATEGORIES].map((c) => (
                      <Chip
                        key={c}
                        active={category === c}
                        tone={REMOTE_CATEGORIES.includes(c) ? 'violet' : 'lime'}
                        onClick={() => {
                          setCategory(c)
                          const m: Mode = REMOTE_CATEGORIES.includes(c) && c !== 'travel' ? 'remote' : mode
                          if (m !== mode) {
                            setMode(m)
                            setHabitat('')
                          }
                        }}
                      >
                        {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm font-semibold">Dove?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['local', 'remote'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m)
                        setHabitat('')
                      }}
                      aria-pressed={mode === m}
                      className={cn(
                        'rounded-2xl border p-3 text-left transition',
                        mode === m ? (m === 'local' ? 'border-cyan bg-cyan/10' : 'border-violet bg-violet/15') : 'border-cream/10 hover:border-cream/25',
                      )}
                    >
                      {m === 'local' ? <MapPin size={18} className="text-cyan" /> : <Globe2 size={18} className="text-violet-300" />}
                      <p className="mt-1.5 text-[14px] font-semibold">{m === 'local' ? 'Habitat locale' : 'Senza Confini'}</p>
                      <p className="text-[11.5px] text-cream/50">{m === 'local' ? `Dal vivo a ${state.me.city}` : 'Da remoto, ovunque'}</p>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {habitatOptions.map((h) => (
                    <Chip key={h} active={habitat === h} tone={mode === 'local' ? 'cyan' : 'violet'} onClick={() => setHabitat(h)}>
                      {h}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm font-semibold">Quando?</p>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      ['today', 'Oggi'],
                      ['tomorrow', 'Domani'],
                      ['weekend', 'Weekend'],
                      ['custom', 'Data'],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setWhenKey(k)}
                      aria-pressed={whenKey === k}
                      className={cn('h-11 rounded-2xl border text-[13px] font-semibold transition', whenKey === k ? 'border-lime bg-lime text-ink' : 'border-cream/10 hover:border-cream/25')}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {whenKey === 'custom' && (
                    <label className="flex-1">
                      <span className="text-[12px] text-cream/50">Data</span>
                      <input
                        type="date"
                        value={custom}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setCustom(e.target.value)}
                        className="mt-1 h-11 w-full rounded-2xl border border-cream/10 bg-ink/70 px-3 text-cream [color-scheme:dark] focus:border-lime/60 focus:outline-none"
                      />
                    </label>
                  )}
                  <label className="flex-1">
                    <span className="text-[12px] text-cream/50">Ora</span>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="mt-1 h-11 w-full rounded-2xl border border-cream/10 bg-ink/70 px-3 text-cream [color-scheme:dark] focus:border-lime/60 focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold">Quanti posti nella crew?</p>
                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-cream/10 bg-ink/50 p-2">
                    <button type="button" onClick={() => setCapacity((c) => Math.max(2, c - 1))} className="grid size-11 place-items-center rounded-xl bg-cream/5 hover:bg-cream/10" aria-label="Meno posti">
                      <Minus size={18} />
                    </button>
                    <div className="text-center">
                      <p className="font-display text-4xl font-bold tabular-nums text-lime">{capacity}</p>
                      <p className="text-[11px] text-cream/45">persone, te compres*</p>
                    </div>
                    <button type="button" onClick={() => setCapacity((c) => Math.min(8, c + 1))} className="grid size-11 place-items-center rounded-xl bg-cream/5 hover:bg-cream/10" aria-label="Più posti">
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
                {(category === 'food' || category === 'drink' || category === 'sport') && (
                  <label className="block">
                    <span className="text-[13px] font-semibold">Spesa stimata a testa (€) · per Split the Bill</span>
                    <input
                      inputMode="decimal"
                      value={cost}
                      onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                      placeholder="Es. 15"
                      className="mt-2 h-11 w-full rounded-2xl border border-cream/10 bg-ink/70 px-4 placeholder:text-cream/30 focus:border-lime/60 focus:outline-none"
                    />
                  </label>
                )}
                <div>
                  <p className="mb-2 text-[13px] font-semibold">Instant Vibe</p>
                  <div className="flex flex-wrap gap-2">
                    {VIBES.map((v) => (
                      <Chip key={v} active={vibes.includes(v)} onClick={() => setVibes((p) => (p.includes(v) ? p.filter((x) => x !== v) : p.length < 3 ? [...p, v] : p))}>
                        {v}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">Imposta il tuo dilemma Gatekeeper</p>
                  <p className="text-[12.5px] text-cream/50">Chi vuole unirsi deve rispondere. Niente “ciao”, solo personalità.</p>
                </div>
                <textarea
                  value={dilemma}
                  onChange={(e) => setDilemma(e.target.value)}
                  rows={3}
                  maxLength={140}
                  placeholder="Es. Alba o tramonto? E perché?"
                  className="w-full resize-none rounded-2xl border border-cream/10 bg-ink/70 p-3.5 text-[15px] placeholder:text-cream/30 focus:border-lime/60 focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  {PRESET_DILEMMAS.map((d) => (
                    <button key={d} type="button" onClick={() => setDilemma(d)} className="rounded-2xl border border-cream/10 px-3 py-2 text-left text-[12.5px] text-cream/75 hover:border-lime/40">
                      {d}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-violet/25 bg-violet/10 p-3">
                  <div className="pr-3">
                    <p className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                      <Lock size={14} className="text-violet-300" /> Progressive Unblur
                    </p>
                    <p className="text-[12px] text-cream/55">Foto sfocate finché la crew non scambia 5 messaggi significativi.</p>
                  </div>
                  <Toggle checked={privacy} onChange={setPrivacy} label="Progressive Unblur" tone="violet" />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-8 mt-4 flex gap-2 bg-gradient-to-t from-ink via-ink/95 to-transparent px-5 pb-6 pt-5">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} aria-label="Indietro">
            <ArrowLeft size={18} />
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            Avanti <ArrowRight size={18} />
          </Button>
        ) : (
          <Button className="flex-1" disabled={!canNext} onClick={publish}>
            <Rocket size={18} /> Pubblica piano
          </Button>
        )}
      </div>
    </Sheet>
  )
}
