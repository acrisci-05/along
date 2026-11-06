import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Lock, Pause, Play, X } from 'lucide-react'
import type { User } from '../../types'
import { cn, type BeamTone } from '../../lib/utils'
import { UserPicture } from '../Portrait'
import { useRevealed } from '../../store/store'

/* ---------------- Button ---------------- */
type Variant = 'primary' | 'coral' | 'violet' | 'ghost' | 'outline' | 'gold' | 'danger'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-ink hover:brightness-105',
  coral: 'bg-brand text-ink hover:brightness-105',
  violet: 'bg-cream text-ink hover:bg-white',
  gold: 'bg-gold text-ink hover:brightness-105',
  ghost: 'bg-surface-2 text-cream hover:bg-[#3a3029]',
  outline: 'border-2 border-cream/80 text-cream hover:bg-cream hover:text-ink',
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
        'inline-flex select-none items-center justify-center gap-2 rounded-md font-display font-bold transition active:scale-[0.97] disabled:bg-surface-2 disabled:text-cream/35 disabled:border-transparent disabled:active:scale-100',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4 text-sm',
        size === 'lg' && 'h-13 px-5 text-base',
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
    lime: 'bg-cream text-ink border-cream',
    violet: 'bg-cream text-ink border-cream',
    cyan: 'bg-cream text-ink border-cream',
    coral: 'bg-brand text-ink border-brand',
  }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition',
        active ? activeTone : 'border-line text-cream/70 hover:border-cream/40 hover:text-cream',
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
  user: Pick<User, 'id' | 'name' | 'hue' | 'look' | 'photo'>
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
        <UserPicture user={user} crop="avatar" className="h-full w-full" />
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
        <div className="grid place-items-center rounded-full bg-slate-card text-xs font-semibold ring-2 ring-ink" style={{ width: size, height: size, marginLeft: -size * 0.32 }}>
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
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy ?? (title ? id : undefined)}
            className={cn(
              'relative z-10 flex w-full flex-col rounded-t-3xl border-t border-line bg-[#221b16] outline-none',
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
  const on = { lime: 'bg-brand', violet: 'bg-violet', gold: 'bg-gold' }[tone]
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
  return <p className={cn('serif text-base text-cream/55', className)}>{children}</p>
}

/* ---------------- Lifetime badge ---------------- */
export function LifetimeBadge({ small }: { small?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-sm bg-brand font-display font-extrabold uppercase tracking-wide text-ink poster-shadow', small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs')}>
      ✦ Founding Member · Lifetime
    </span>
  )
}

/* ---------------- Waveform / voice bubble ---------------- */
export function VoiceBubble({ duration, wave, mine, audioUrl }: { duration: number; wave: number[]; mine?: boolean; audioUrl?: string }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => () => audio.current?.pause(), [])

  useEffect(() => {
    if (!playing) return
    // real recording: follow the audio element
    if (audioUrl) {
      const a = audio.current ?? new Audio(audioUrl)
      audio.current = a
      const onTime = () => setProgress(a.duration && isFinite(a.duration) ? a.currentTime / a.duration : a.currentTime / duration)
      const onEnd = () => {
        setPlaying(false)
        setProgress(0)
      }
      a.addEventListener('timeupdate', onTime)
      a.addEventListener('ended', onEnd)
      a.play().catch(onEnd)
      return () => {
        a.pause()
        a.removeEventListener('timeupdate', onTime)
        a.removeEventListener('ended', onEnd)
      }
    }
    // simulated note
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
        className={cn('grid size-8 shrink-0 place-items-center rounded-full', mine ? 'bg-cream text-forest' : 'bg-brand text-ink')}
        aria-label={playing ? 'Pausa nota vocale' : 'Riproduci nota vocale'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex h-7 items-center gap-[3px]" aria-hidden>
        {wave.map((v, i) => (
          <span key={i} className={cn('w-[3px] rounded-full transition-colors', i / wave.length <= progress ? 'bg-cream' : 'bg-cream/35')} style={{ height: `${v * 9 + 10}%` }} />
        ))}
      </div>
      <span className="text-xs tabular-nums text-cream/60">{mm}</span>
    </div>
  )
}

/* ---------------- Revolut tip ---------------- */
export const REVOLUT_URL = 'https://revolut.me/acrisci05'

function RevolutMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#F6F4EF" />
      <path d="M10 8h7.2c3.4 0 5.6 2 5.6 5 0 2.3-1.3 4-3.4 4.7L24 24h-4.1l-3.9-6h-2.3v6H10V8Zm3.7 3.1v3.9h3.3c1.4 0 2.1-.8 2.1-2s-.7-1.9-2.1-1.9h-3.3Z" fill="#1c1612" />
    </svg>
  )
}

export function RevolutTip({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <a href={REVOLUT_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-cream/15 px-3 py-1.5 text-xs font-medium text-cream/80 transition hover:border-brand/60 hover:text-brand">
        <RevolutMark className="size-4" /> Offrici una birra 🍺
      </a>
    )
  }
  return (
    <div className="relative overflow-hidden rounded-3xl border border-cream/10 bg-surface p-4">
      <div className="absolute -right-8 -top-10 size-32 rounded-full bg-brand/25 blur-3xl" aria-hidden />
      <div className="relative flex items-start gap-3">
        <RevolutMark className="size-10 shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-base font-bold">Offrici una birra ☕⚡</p>
          <p className="mt-1 text-sm leading-snug text-cream/70">
            Ti piace ALONG e vuoi supportare lo sviluppo indipendente? Offri un caffè/birra al creator su Revolut. Niente pubblicità, niente dati venduti, solo gratitudine.
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
