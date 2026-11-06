import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Lock, Pause, Play, X } from 'lucide-react'
import type { User } from '../../types'
import { cn, type BeamTone } from '../../lib/utils'
import { Portrait } from '../Portrait'
import { useRevealed } from '../../store/store'

/* ---------------- Button ---------------- */
type Variant = 'primary' | 'coral' | 'violet' | 'ghost' | 'outline' | 'gold' | 'danger'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-lime text-ink hover:brightness-110 glow-lime',
  coral: 'bg-coral text-ink hover:brightness-110 glow-coral',
  violet: 'bg-violet text-cream hover:brightness-110 glow-violet',
  gold: 'bg-gold text-ink hover:brightness-110 glow-gold',
  ghost: 'bg-cream/5 text-cream hover:bg-cream/10',
  outline: 'border border-cream/15 text-cream hover:border-cream/35 hover:bg-cream/5',
  danger: 'bg-alarm/15 text-alarm border border-alarm/30 hover:bg-alarm/25',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100',
        size === 'sm' && 'h-9 px-3 text-[13px]',
        size === 'md' && 'h-11 px-4 text-sm',
        size === 'lg' && 'h-13 px-5 text-[15px]',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------------- Chip ---------------- */
export function Chip({
  active,
  children,
  onClick,
  className,
  tone = 'lime',
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  className?: string
  tone?: 'lime' | 'violet' | 'cyan' | 'coral'
}) {
  const activeTone = {
    lime: 'bg-lime text-ink border-lime',
    violet: 'bg-violet text-cream border-violet',
    cyan: 'bg-cyan text-ink border-cyan',
    coral: 'bg-coral text-ink border-coral',
  }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
        active ? activeTone : 'border-cream/10 bg-cream/[0.04] text-cream/75 hover:border-cream/25 hover:text-cream',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------------- Avatar ---------------- */
export function Avatar({
  user,
  size = 40,
  blur: blurProp,
  className,
  ring,
  lockIcon = true,
}: {
  lockIcon?: boolean
  user: Pick<User, 'id' | 'name' | 'hue' | 'look'>
  size?: number
  blur?: boolean
  className?: string
  ring?: boolean
}) {
  const revealed = useRevealed()
  const blur = blurProp ?? !revealed(user.id)
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full bg-ink', ring && 'ring-2 ring-ink', className)}
      style={{ width: size, height: size }}
      aria-label={blur ? `Foto di ${user.name} sfocata` : `Foto di ${user.name}`}
      role="img"
    >
      <div className={cn('absolute inset-0 transition-[filter,transform] duration-700', blur && 'scale-125 blur-[6px]')}>
        <Portrait look={user.look} hue={user.hue} crop="avatar" className="h-full w-full" />
      </div>
      {blur && lockIcon && (
        <div className="absolute inset-0 grid place-items-center bg-ink/25">
          <Lock size={Math.max(10, size * 0.28)} className="text-cream/80" aria-hidden />
        </div>
      )}
    </div>
  )
}

export function BeamAvatar({ tone, children, label }: { tone: BeamTone; children: ReactNode; label?: string }) {
  return (
    <div className="beam" data-tone={tone} title={label} aria-label={label}>
      <div className="rounded-full bg-ink p-[2px]">{children}</div>
    </div>
  )
}

export function AvatarStack({ users, max = 4, size = 28, blur, capacity }: { users: User[]; max?: number; size?: number; blur?: boolean; capacity?: number }) {
  const shown = users.slice(0, max)
  const empty = capacity ? Math.max(0, Math.min(capacity, max + 2) - users.length) : 0
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <motion.div key={u.id} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.04 }} style={{ marginLeft: i ? -size * 0.32 : 0 }}>
          <Avatar user={u} size={size} blur={blur} ring />
        </motion.div>
      ))}
      {users.length > max && (
        <div className="grid place-items-center rounded-full bg-slate-card text-[11px] font-semibold ring-2 ring-ink" style={{ width: size, height: size, marginLeft: -size * 0.32 }}>
          +{users.length - max}
        </div>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <div
          key={`e${i}`}
          className="rounded-full border border-dashed border-cream/25 bg-ink"
          style={{ width: size, height: size, marginLeft: -size * 0.32 + (i === 0 && users.length ? size * 0.5 : 0) }}
          aria-hidden
        />
      ))}
    </div>
  )
}

/* ---------------- Sheet ---------------- */
export function Sheet({
  open,
  onClose,
  children,
  title,
  full,
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  full?: boolean
  labelledBy?: string
}) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.activeElement as HTMLElement | null
    window.setTimeout(() => ref.current?.focus(), 30)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-50 flex items-end" role="presentation">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy ?? (title ? id : undefined)}
            className={cn(
              'glass-strong relative z-10 flex w-full flex-col rounded-t-[28px] outline-none',
              full ? 'h-[94%]' : 'max-h-[92%]',
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="px-5 pb-2 pt-3">
              <div className="mx-auto h-1 w-10 rounded-full bg-cream/20" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-5 pb-2">
              {title ? (
                <h2 id={id} className="text-lg font-bold">
                  {title}
                </h2>
              ) : (
                <span />
              )}
              <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-cream/5 hover:bg-cream/10" aria-label="Chiudi">
                <X size={18} />
              </button>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- Toggle ---------------- */
export function Toggle({ checked, onChange, label, tone = 'lime' }: { checked: boolean; onChange: (v: boolean) => void; label: string; tone?: 'lime' | 'violet' | 'gold' }) {
  const on = { lime: 'bg-lime', violet: 'bg-violet', gold: 'bg-gold' }[tone]
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition', checked ? on : 'bg-cream/15')}
    >
      <motion.span layout className={cn('absolute top-1 size-5 rounded-full shadow', checked ? 'right-1 bg-ink' : 'left-1 bg-cream')} transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
    </button>
  )
}

/* ---------------- Section heading ---------------- */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/45', className)}>{children}</p>
}

/* ---------------- Lifetime badge ---------------- */
export function LifetimeBadge({ small }: { small?: boolean }) {
  return (
    <span className="inline-flex rounded-full bg-[linear-gradient(90deg,var(--color-lime),var(--color-cyan),var(--color-violet),var(--color-coral))] p-[1.5px]">
      <span className={cn('inline-flex items-center gap-1 rounded-full bg-ink font-display font-semibold', small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]')}>
        <span className="text-gradient-neon">✦ FOUNDING MEMBER · LIFETIME</span>
      </span>
    </span>
  )
}

/* ---------------- Waveform / voice bubble ---------------- */
export function VoiceBubble({ duration, wave, mine }: { duration: number; wave: number[]; mine?: boolean }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!playing) return
    const start = performance.now() - progress * duration * 1000
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000))
      setProgress(p)
      if (p >= 1) {
        setPlaying(false)
        setProgress(0)
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])
  const mm = `${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, '0')}`
  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => setPlaying((p) => !p)}
        className={cn('grid size-8 shrink-0 place-items-center rounded-full', mine ? 'bg-ink text-lime' : 'bg-violet text-cream')}
        aria-label={playing ? 'Pausa nota vocale' : 'Riproduci nota vocale'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex h-7 items-center gap-[3px]" aria-hidden>
        {wave.map((v, i) => (
          <span
            key={i}
            className={cn('w-[3px] rounded-full transition-colors', i / wave.length <= progress ? (mine ? 'bg-ink' : 'bg-violet-300') : mine ? 'bg-ink/35' : 'bg-cream/30')}
            style={{ height: `${v * 9 + 10}%` }}
          />
        ))}
      </div>
      <span className={cn('text-[11px] tabular-nums', mine ? 'text-ink/70' : 'text-cream/55')}>{mm}</span>
    </div>
  )
}

/* ---------------- Revolut tip ---------------- */
export const REVOLUT_URL = 'https://revolut.me/acrisci05'

function RevolutMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#F6F4EF" />
      <path d="M10 8h7.2c3.4 0 5.6 2 5.6 5 0 2.3-1.3 4-3.4 4.7L24 24h-4.1l-3.9-6h-2.3v6H10V8Zm3.7 3.1v3.9h3.3c1.4 0 2.1-.8 2.1-2s-.7-1.9-2.1-1.9h-3.3Z" fill="#0B0F19" />
    </svg>
  )
}

export function RevolutTip({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <a href={REVOLUT_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-1.5 text-xs font-medium text-cream/80 transition hover:border-lime/60 hover:text-lime">
        <RevolutMark className="size-4" /> Offrici una birra 🍺
      </a>
    )
  }
  return (
    <div className="relative overflow-hidden rounded-3xl border border-cream/10 bg-[linear-gradient(135deg,rgb(139_92_246/0.18),rgb(255_128_109/0.12))] p-4">
      <div className="absolute -right-8 -top-10 size-32 rounded-full bg-coral/25 blur-3xl" aria-hidden />
      <div className="relative flex items-start gap-3">
        <RevolutMark className="size-10 shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold">Offrici una birra ☕⚡</p>
          <p className="mt-1 text-[13px] leading-snug text-cream/70">
            Ti piace ALONG e vuoi supportare lo sviluppo indipendente? Offri un caffè/birra al creator su Revolut. Niente pubblicità, niente dati venduti — solo gratitudine.
          </p>
          <a
            href={REVOLUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-2xl bg-cream px-4 text-sm font-semibold text-ink transition hover:bg-white active:scale-[0.97]"
          >
            <RevolutMark className="size-5" /> revolut.me/acrisci05
          </a>
        </div>
      </div>
    </div>
  )
}
