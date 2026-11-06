import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Camera, KeyRound, Lock, Palette, ShieldCheck, Timer, X } from 'lucide-react'
import type { Look, User } from '../types'
import { DILEMMA_LIST } from '../data/mock'
import { ageFromBirth, ADULT_AGE, MIN_AGE } from '../lib/age'
import { cn } from '../lib/utils'
import { useStore } from '../store/store'
import { UserPicture } from './Portrait'
import { Button } from './ui'

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const SKINS = ['#f6d7c3', '#eec1a0', '#d9a07a', '#b97a52', '#8d5a3b', '#5e3a26']
const HAIRS: Array<[Look['hair'], string]> = [
  ['short', 'Corti'],
  ['buzz', 'Rasati'],
  ['long', 'Lunghi'],
  ['wavy', 'Mossi'],
  ['curly', 'Ricci'],
  ['bob', 'Caschetto'],
  ['bun', 'Chignon'],
]
const HAIR_COLORS = ['#0d0907', '#2a1d14', '#5a3a22', '#b07a3f', '#d6a65c', '#8e8e8e']
const SHIRTS = ['#24473a', '#2f5d8a', '#7a3b2e', '#c9a227', '#6b4f7a', '#f2ebdf']

const RULES = [
  { icon: KeyRound, title: 'Rispondi, non scorrere', body: 'Per farti notare rispondi al suo dilemma. Il match nasce da una frase.' },
  { icon: Lock, title: 'Foto svelate al match', body: 'Prima conta cosa dici e cosa proponi. Il volto si vede dopo.' },
  { icon: Timer, title: '48 ore per vedersi', body: 'Ogni match vicino ha 48 ore per diventare un’uscita vera. Massimo 3 chat insieme.' },
]

function randomLook(): Look {
  const r = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
  return { skin: Math.floor(Math.random() * 6), hair: r(HAIRS)[0], hairColor: r(HAIR_COLORS), shirt: r(SHIRTS) }
}

/** Downscale an image file to a ~480px JPEG data URL so it fits in localStorage. */
async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const max = 480
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function Onboarding() {
  const { state, completeOnboarding } = useStore()
  const [step, setStep] = useState(0)
  // step 1
  const [name, setName] = useState('')
  const [dd, setDd] = useState('')
  const [mm, setMm] = useState('')
  const [yy, setYy] = useState('')
  const [photo, setPhoto] = useState<string | undefined>()
  const [look, setLook] = useState<Look>(randomLook)
  const [hue] = useState(() => Math.floor(Math.random() * 360))
  const [editAvatar, setEditAvatar] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  // step 2
  const [gender, setGender] = useState<User['gender'] | ''>('')
  const [intent, setIntent] = useState<User['intent']>(['date', 'friends'])
  const [show, setShow] = useState<'all' | 'f' | 'm'>('all')
  // step 3
  const [tone, setTone] = useState(0)
  const [dilemma, setDilemma] = useState('')

  const thisYear = new Date().getFullYear()
  const years = useMemo(() => Array.from({ length: 70 }, (_, i) => thisYear - MIN_AGE + 1 - i), [thisYear])
  const birthDate = dd && mm && yy ? `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}` : ''
  const validDate = birthDate && new Date(birthDate).getDate() === Number(dd)
  const age = validDate ? ageFromBirth(birthDate) : null
  const tooYoung = age !== null && age < MIN_AGE
  const minor = age !== null && age >= MIN_AGE && age < ADULT_AGE

  const step1ok = name.trim().length >= 2 && age !== null && !tooYoung
  const step2ok = !!gender && (minor || intent.length > 0)
  const step3ok = !!dilemma

  if (state.onboarded) return null

  const finish = () =>
    completeOnboarding({
      name,
      birthDate,
      gender: gender || 'nb',
      intent: minor ? ['friends'] : intent,
      show,
      dilemma,
      photo,
      look,
      hue,
    })

  const onFile = async (f?: File) => {
    if (!f) return
    setPhotoError('')
    if (!f.type.startsWith('image/')) return setPhotoError('Scegli un’immagine (JPG, PNG o HEIC convertita).')
    try {
      setPhoto(await compressImage(f))
      setEditAvatar(false)
    } catch {
      setPhotoError('Non riesco a leggere questa immagine. Prova con un’altra.')
    }
  }

  return (
    <div className="absolute inset-0 z-[90] flex flex-col bg-ink" role="dialog" aria-modal="true" aria-label="Crea il tuo profilo">
      {step > 0 && (
        <div className="flex items-center gap-3 px-4 pb-2 pt-[max(16px,env(safe-area-inset-top))] md:pt-11">
          <button onClick={() => setStep((s) => s - 1)} className="grid size-10 place-items-center rounded-full hover:bg-surface" aria-label="Indietro">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-1 gap-1.5" aria-label={`Passo ${step} di 3`}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-brand' : 'bg-surface-2')} />
            ))}
          </div>
          <span className="w-10 text-right text-sm tabular-nums text-muted">{step}/3</span>
        </div>
      )}

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex min-h-full flex-col">
            {step === 0 && (
              <div className="flex min-h-full flex-col pt-[max(40px,env(safe-area-inset-top))] md:pt-16">
                <p className="text-3xl font-extrabold tracking-[-0.05em] text-brand">along</p>
                <h1 className="mt-6 text-2xl leading-tight">L’app d’incontri dove fai match su qualcosa da fare.</h1>
                <p className="mt-2 text-base text-muted">Date o nuove amicizie, sempre attorno a un piano concreto. Tre regole:</p>
                <ul className="mt-6 space-y-4">
                  {RULES.map((r) => (
                    <li key={r.title} className="flex gap-3.5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface">
                        <r.icon size={18} className="text-brand" />
                      </span>
                      <span>
                        <span className="block text-base font-bold">{r.title}</span>
                        <span className="block text-sm text-muted">{r.body}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Button size="lg" className="w-full rounded-full" onClick={() => setStep(1)}>
                    Crea il tuo profilo
                  </Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
                    <ShieldCheck size={13} /> Vietata ai minori di {MIN_AGE} anni. Maggiorenni e minorenni non si incontrano mai.
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="pt-4">
                <h2 className="text-2xl">Chi sei</h2>
                <p className="mt-1 text-sm text-muted">Il nome e l’età si vedono sul profilo. La foto resta sfocata fino al match.</p>

                <label className="mt-6 block">
                  <span className="text-sm font-semibold">Nome</span>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={24}
                    autoComplete="given-name"
                    placeholder="Come ti chiamano gli amici"
                    className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base placeholder:text-cream/30 focus:border-brand focus:outline-none"
                  />
                </label>

                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold">Data di nascita</legend>
                  <div className="mt-1.5 grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
                    <select aria-label="Giorno" value={dd} onChange={(e) => setDd(e.target.value)} className="h-12 rounded-xl border border-line bg-surface px-3 text-base focus:border-brand focus:outline-none">
                      <option value="">Giorno</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <select aria-label="Mese" value={mm} onChange={(e) => setMm(e.target.value)} className="h-12 rounded-xl border border-line bg-surface px-3 text-base focus:border-brand focus:outline-none">
                      <option value="">Mese</option>
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select aria-label="Anno" value={yy} onChange={(e) => setYy(e.target.value)} className="h-12 rounded-xl border border-line bg-surface px-3 text-base focus:border-brand focus:outline-none">
                      <option value="">Anno</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div aria-live="polite" className="mt-2 text-sm">
                    {dd && mm && yy && !validDate && <p className="text-alarm">Questa data non esiste.</p>}
                    {tooYoung && <p className="text-alarm">ALONG è vietata ai minori di {MIN_AGE} anni. Ti aspettiamo più avanti.</p>}
                    {minor && <p className="text-gold">Hai {age} anni: userai ALONG in modalità Amici, solo con persone di 16 e 17 anni.</p>}
                    {age !== null && age >= ADULT_AGE && <p className="text-muted">Hai {age} anni.</p>}
                  </div>
                </fieldset>

                <div className="mt-6">
                  <p className="text-sm font-semibold">Foto profilo</p>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-surface">
                      <UserPicture user={{ look, hue, photo }} crop="avatar" className="h-full w-full" />
                      {photo && (
                        <button onClick={() => setPhoto(undefined)} className="absolute right-0 top-0 grid size-7 place-items-center rounded-full bg-ink/80" aria-label="Rimuovi foto">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid flex-1 gap-2">
                      <button onClick={() => fileRef.current?.click()} className="flex h-11 items-center justify-center gap-2 rounded-full border border-line font-semibold hover:border-cream/40">
                        <Camera size={17} /> {photo ? 'Cambia foto' : 'Carica una foto'}
                      </button>
                      <button
                        onClick={() => {
                          setPhoto(undefined)
                          setEditAvatar((v) => !v)
                        }}
                        className="flex h-11 items-center justify-center gap-2 rounded-full border border-line font-semibold hover:border-cream/40"
                        aria-expanded={editAvatar}
                      >
                        <Palette size={17} /> {editAvatar ? 'Chiudi avatar' : 'Crea un avatar'}
                      </button>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Carica una foto profilo" onChange={(e) => onFile(e.target.files?.[0])} />
                  {photoError && <p className="mt-2 text-sm text-alarm">{photoError}</p>}
                  <p className="mt-2 text-xs text-muted">Puoi saltare: useremo questo avatar e potrai cambiarlo dal profilo. Nella demo la foto resta solo su questo dispositivo.</p>

                  <AnimatePresence>
                    {editAvatar && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-4 space-y-4 rounded-2xl border border-line p-4">
                          <Swatches label="Pelle" values={SKINS} selected={SKINS[look.skin]} onPick={(c) => setLook({ ...look, skin: SKINS.indexOf(c) })} />
                          <div>
                            <p className="text-sm font-semibold text-muted">Capelli</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {HAIRS.map(([k, l]) => (
                                <button key={k} onClick={() => setLook({ ...look, hair: k })} aria-pressed={look.hair === k} className={cn('h-9 rounded-md border px-3 text-sm', look.hair === k ? 'border-brand bg-forest' : 'border-line')}>
                                  {l}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Swatches label="Colore capelli" values={HAIR_COLORS} selected={look.hairColor} onPick={(c) => setLook({ ...look, hairColor: c })} />
                          <Swatches label="Maglia" values={SHIRTS} selected={look.shirt} onPick={(c) => setLook({ ...look, shirt: c })} />
                          <div className="flex gap-2">
                            {(
                              [
                                ['glasses', 'Occhiali'],
                                ['beard', 'Barba'],
                                ['earring', 'Orecchino'],
                              ] as const
                            ).map(([k, l]) => (
                              <button key={k} onClick={() => setLook({ ...look, [k]: !look[k] })} aria-pressed={!!look[k]} className={cn('h-9 rounded-md border px-3 text-sm', look[k] ? 'border-brand bg-forest' : 'border-line')}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="pt-4">
                <h2 className="text-2xl">Cosa cerchi</h2>
                <p className="mt-1 text-sm text-muted">Puoi cambiarlo quando vuoi dal profilo.</p>

                <Choice
                  label="Mi identifico come"
                  value={gender}
                  options={[
                    ['f', 'Donna'],
                    ['m', 'Uomo'],
                    ['nb', 'Non binario/a'],
                  ]}
                  onPick={(v) => setGender(v as User['gender'])}
                />

                <fieldset className="mt-6">
                  <legend className="text-sm font-semibold">Su ALONG cerco</legend>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(
                      [
                        ['date', 'Date', 'Uscite romantiche'],
                        ['friends', 'Amici', 'Nuove amicizie e gruppi'],
                      ] as const
                    ).map(([k, l, sub]) => {
                      const disabled = k === 'date' && minor
                      const on = !disabled && (minor ? k === 'friends' : intent.includes(k))
                      return (
                        <button
                          key={k}
                          disabled={disabled}
                          aria-pressed={on}
                          onClick={() => setIntent((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}
                          className={cn('rounded-xl border p-3 text-left disabled:opacity-40', on ? 'border-brand bg-forest' : 'border-line')}
                        >
                          <span className="block text-base font-bold">{l}</span>
                          <span className="block text-sm text-muted">{sub}</span>
                        </button>
                      )
                    })}
                  </div>
                  {minor && <p className="mt-2 text-sm text-gold">Sotto i 18 anni è disponibile solo la modalità Amici.</p>}
                </fieldset>

                {!minor && intent.includes('date') && (
                  <Choice
                    label="Per le Date mostrami"
                    value={show}
                    options={[
                      ['all', 'Tutti'],
                      ['f', 'Donne'],
                      ['m', 'Uomini'],
                    ]}
                    onPick={(v) => setShow(v as 'all' | 'f' | 'm')}
                  />
                )}
              </div>
            )}

            {step === 3 && (
              <div className="pt-4">
                <h2 className="text-2xl">Il tuo dilemma</h2>
                <p className="mt-1 text-sm text-muted">Chi vuole scriverti dovrà prima rispondere a questa domanda. Scegline una.</p>
                <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5" role="tablist" aria-label="Tono del dilemma">
                  {DILEMMA_LIST.map((g, i) => (
                    <button key={g.tone} role="tab" aria-selected={tone === i} onClick={() => setTone(i)} className={cn('h-9 shrink-0 rounded-md border px-3 text-sm font-semibold', tone === i ? 'border-cream bg-cream text-ink' : 'border-line text-cream/75')}>
                      {g.tone}
                    </button>
                  ))}
                </div>
                <div className="mt-3 space-y-2" role="radiogroup" aria-label="Dilemmi">
                  {DILEMMA_LIST[tone].items.map((q) => (
                    <button key={q} role="radio" aria-checked={dilemma === q} onClick={() => setDilemma(q)} className={cn('w-full rounded-xl border p-3.5 text-left text-base', dilemma === q ? 'border-brand bg-forest font-semibold' : 'border-line hover:border-cream/30')}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step > 0 && (
              <div className="mt-auto pt-6">
                <Button
                  size="lg"
                  className="w-full rounded-full"
                  disabled={step === 1 ? !step1ok : step === 2 ? !step2ok : !step3ok}
                  onClick={() => (step < 3 ? setStep(step + 1) : finish())}
                >
                  {step < 3 ? 'Avanti' : 'Inizia a scoprire'}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Swatches({ label, values, selected, onPick }: { label: string; values: string[]; selected: string; onPick: (v: string) => void }) {
  return (
    <div>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {values.map((c) => (
          <button key={c} role="radio" aria-checked={selected === c} aria-label={c} onClick={() => onPick(c)} className={cn('size-9 rounded-full border-2', selected === c ? 'border-brand' : 'border-transparent')} style={{ background: c }} />
        ))}
      </div>
    </div>
  )
}

function Choice({ label, value, options, onPick }: { label: string; value: string; options: Array<[string, string]>; onPick: (v: string) => void }) {
  return (
    <fieldset className="mt-6">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-1.5 grid grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
        {options.map(([k, l]) => (
          <button key={k} role="radio" aria-checked={value === k} onClick={() => onPick(k)} className={cn('h-11 rounded-xl border text-sm font-semibold', value === k ? 'border-brand bg-forest' : 'border-line')}>
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
