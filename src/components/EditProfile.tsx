import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { Plus, X } from 'lucide-react'
import type { Habit, User } from '../types'
import { LANGUAGES, PASSION_CATEGORIES } from '../data/mock'
import { ThisOrThatEditor, validThisOrThat } from './ThisOrThatEditor'
import { PHOTO_MAX, PHOTO_MIN } from '../lib/photos'
import { cn } from '../lib/utils'
import { useStore } from '../store/store'
import { PhotoGallery } from './PhotoGallery'
import { AvatarEditor } from './Onboarding'
import { UserPicture } from './Portrait'
import { Button, Sheet } from './ui'

const BIO_MAX = 160
const PASSIONS = { min: 3, max: 8 }
const HABITS: Array<[Habit | undefined, string]> = [
  [undefined, 'Preferisco non dirlo'],
  ['no', 'No'],
  ['a volte', 'A volte'],
  ['si', 'Sì'],
]

function Section({ title, hint, error, children }: { title: string; hint?: string; error?: string | false; children: ReactNode }) {
  return (
    <section className="border-b border-line py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg">{title}</h3>
        {hint && <span className="shrink-0 text-xs text-muted">{hint}</span>}
      </div>
      <div className="mt-3">{children}</div>
      {error && <p className="mt-2 text-sm text-alarm">{error}</p>}
    </section>
  )
}

function Pill({ on, children, onClick, disabled }: { on: boolean; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={cn('h-9 rounded-md border px-3 text-sm transition disabled:opacity-35', on ? 'border-brand bg-forest font-semibold' : 'border-line text-cream/80 hover:border-cream/35')}>
      {children}
    </button>
  )
}

/** Full-page profile editor (portal into the phone frame) with a single Save. */
export function EditProfile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const host = typeof document !== 'undefined' ? document.getElementById('phone-root') : null
  if (!open || !host) return null
  return createPortal(<Editor onClose={onClose} />, host)
}

function Editor({ onClose }: { onClose: () => void }) {
  const { state, updateMe, toast } = useStore()
  const me = state.me
  const [d, setD] = useState(() => ({
    name: me.name,
    bio: me.bio,
    work: me.work ?? '',
    languages: me.languages ?? [],
    smoke: me.smoke,
    drink: me.drink,
    interests: me.interests,
    thisOrThat: me.thisOrThat,
    photos: me.photos ?? [],
    look: me.look,
    mode: (me.photos?.length ? 'photos' : 'avatar') as 'photos' | 'avatar',
  }))
  const [initial] = useState(() => JSON.stringify(d))
  const [custom, setCustom] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }))
  const toggle = (k: 'languages' | 'interests', v: string, max: number) =>
    setD((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((i) => i !== v) : x[k].length < max ? [...x[k], v] : x[k] }))

  const errors = {
    name: d.name.trim().length < 2 && 'Il nome deve avere almeno 2 lettere.',
    photos: d.mode === 'photos' && d.photos.length < PHOTO_MIN && `Servono almeno ${PHOTO_MIN} foto, oppure scegli l’avatar.`,
    interests: d.interests.length < PASSIONS.min && `Scegli almeno ${PASSIONS.min} passioni.`,
    thisOrThat: !validThisOrThat(d.thisOrThat) && 'Scrivi la domanda e le due risposte.',
  }
  const valid = !Object.values(errors).some(Boolean)
  const dirty = JSON.stringify(d) !== initial

  const save = () => {
    if (!valid) return
    const patch: Partial<User> = {
      name: d.name.trim(),
      bio: d.bio.trim(),
      work: d.work.trim() || undefined,
      languages: d.languages,
      smoke: d.smoke,
      drink: d.drink,
      interests: d.interests,
      thisOrThat: d.thisOrThat && { question: d.thisOrThat.question.trim(), a: d.thisOrThat.a.trim(), b: d.thisOrThat.b.trim() },
      photos: d.mode === 'photos' ? d.photos : [],
      look: d.look,
    }
    updateMe(patch)
    toast({ tone: 'lime', title: 'Profilo salvato' })
    onClose()
  }

  const allPassions = PASSION_CATEGORIES.flatMap((c) => c.items)
  const customPassions = d.interests.filter((i) => !allPassions.includes(i))

  return (
    <motion.div className="absolute inset-0 z-[60] flex flex-col bg-ink" initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 320 }} role="dialog" aria-modal="true" aria-label="Modifica profilo">
      <header className="flex items-center justify-between border-b border-line px-3 pb-2.5 pt-[max(12px,env(safe-area-inset-top))] md:pt-10">
        <button onClick={() => (dirty ? setConfirmDiscard(true) : onClose())} className="h-10 rounded-full px-3 text-base text-muted hover:text-cream">
          Annulla
        </button>
        <h2 className="text-lg">Modifica profilo</h2>
        <button onClick={save} disabled={!valid} className="h-10 rounded-full bg-brand px-4 text-base font-bold text-ink disabled:bg-surface disabled:text-cream/30">
          Salva
        </button>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-10">
        <Section title="Foto" hint={d.mode === 'photos' ? `${d.photos.length}/${PHOTO_MAX} · minimo ${PHOTO_MIN}` : undefined} error={errors.photos}>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="radiogroup" aria-label="Foto o avatar">
            {(
              [
                ['photos', 'Foto'],
                ['avatar', 'Avatar illustrato'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} role="radio" aria-checked={d.mode === k} onClick={() => set('mode', k)} className={cn('h-9 rounded-lg text-sm font-semibold', d.mode === k ? 'bg-cream text-ink' : 'text-cream/70')}>
                {l}
              </button>
            ))}
          </div>
          {d.mode === 'photos' ? (
            <PhotoGallery photos={d.photos} onChange={(p) => set('photos', p)} />
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-full bg-surface">
                  <UserPicture user={{ look: d.look, hue: me.hue }} crop="avatar" className="h-full w-full" />
                </div>
                <p className="text-sm text-muted">Senza foto compari un po’ meno in Scopri.</p>
              </div>
              <AvatarEditor look={d.look} onChange={(l) => set('look', l)} />
            </div>
          )}
        </Section>

        <Section title="Nome" error={errors.name}>
          <input value={d.name} onChange={(e) => set('name', e.target.value)} maxLength={24} aria-label="Nome" className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base focus:border-brand focus:outline-none" />
          <p className="mt-1.5 text-xs text-muted">Età: {me.age} anni (dalla data di nascita, non modificabile).</p>
        </Section>

        <Section title="Bio" hint={`${d.bio.length}/${BIO_MAX}`}>
          <textarea value={d.bio} onChange={(e) => set('bio', e.target.value.slice(0, BIO_MAX))} rows={3} aria-label="Bio" placeholder="Due righe su di te: cosa ti piace fare, cosa cerchi." className="w-full resize-none rounded-xl border border-line bg-surface p-3.5 text-base placeholder:text-cream/30 focus:border-brand focus:outline-none" />
        </Section>

        <Section title="Lavoro o studio" hint="Facoltativo">
          <input value={d.work} onChange={(e) => set('work', e.target.value)} maxLength={60} aria-label="Lavoro o studio" placeholder="Es. Studio medicina, Architetta" className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base placeholder:text-cream/30 focus:border-brand focus:outline-none" />
        </Section>

        <Section title="Lingue che parli" hint="Facoltativo">
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <Pill key={l} on={d.languages.includes(l)} onClick={() => toggle('languages', l, 6)}>
                {l}
              </Pill>
            ))}
          </div>
        </Section>

        <Section title="Abitudini" hint="Facoltativo">
          {(
            [
              ['smoke', 'Fumo'],
              ['drink', 'Alcol'],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-sm font-semibold text-muted">{label}</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
                {HABITS.map(([v, l]) => (
                  <button key={l} role="radio" aria-checked={d[k] === v} onClick={() => set(k, v)} className={cn('h-9 rounded-md border px-3 text-sm', d[k] === v ? 'border-brand bg-forest font-semibold' : 'border-line text-cream/80')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section title="Passioni" hint={`${d.interests.length}/${PASSIONS.max} · minimo ${PASSIONS.min}`} error={errors.interests}>
          {PASSION_CATEGORIES.map((c) => (
            <div key={c.name} className="mb-3">
              <p className="mb-1.5 text-sm font-semibold text-muted">{c.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.items.map((i) => (
                  <Pill key={i} on={d.interests.includes(i)} disabled={!d.interests.includes(i) && d.interests.length >= PASSIONS.max} onClick={() => toggle('interests', i, PASSIONS.max)}>
                    {i}
                  </Pill>
                ))}
              </div>
            </div>
          ))}
          <p className="mb-1.5 text-sm font-semibold text-muted">Le tue</p>
          <div className="flex flex-wrap gap-1.5">
            {customPassions.map((i) => (
              <span key={i} className="flex h-9 items-center gap-1 rounded-md border border-brand bg-forest pl-3 pr-1 text-sm font-semibold">
                {i}
                <button onClick={() => toggle('interests', i, PASSIONS.max)} className="grid size-7 place-items-center rounded" aria-label={`Rimuovi ${i}`}>
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const v = custom.trim().toLowerCase()
              if (v && !d.interests.includes(v) && d.interests.length < PASSIONS.max) set('interests', [...d.interests, v])
              setCustom('')
            }}
          >
            <input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={24} aria-label="Aggiungi una passione" placeholder="Aggiungi una passione tua" className="h-10 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm placeholder:text-cream/30 focus:border-brand focus:outline-none" />
            <button type="submit" disabled={!custom.trim() || d.interests.length >= PASSIONS.max} className="grid size-10 place-items-center rounded-xl bg-surface-2 disabled:opacity-35" aria-label="Aggiungi">
              <Plus size={18} />
            </button>
          </form>
        </Section>

        <Section title="Questo o quello" error={errors.thisOrThat}>
          <p className="mb-3 text-sm text-muted">Una domanda con due risposte. Chi ti mette like può sceglierne una: è il vostro primo argomento.</p>
          <ThisOrThatEditor value={d.thisOrThat} onChange={(t) => set('thisOrThat', t)} />
        </Section>

        <div className="pt-6">
          <Button size="lg" className="w-full rounded-full" disabled={!valid} onClick={save}>
            Salva
          </Button>
          {!valid && <p className="mt-2 text-center text-sm text-alarm">Completa i campi segnalati in rosso.</p>}
        </div>
      </div>

      <Sheet open={confirmDiscard} onClose={() => setConfirmDiscard(false)} title="Uscire senza salvare?">
        <p className="text-sm text-muted">Le modifiche andranno perse.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirmDiscard(false)}>
            Continua a modificare
          </Button>
          <Button variant="danger" onClick={onClose}>
            Esci
          </Button>
        </div>
      </Sheet>
    </motion.div>
  )
}
