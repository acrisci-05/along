import { useState } from 'react'
import { Check, Gauge, Mic, Share2, ShieldCheck, Zap } from 'lucide-react'
import type { BestieVouch, MeStats, User } from '../types'
import { cn, computeBadges, formatReply } from '../lib/utils'

export function BestieSticker({
  vouch,
  name,
  finish = 'paper',
  onShare,
}: {
  vouch: BestieVouch
  name: string
  finish?: 'paper' | 'holo' | 'neon'
  onShare?: () => void
}) {
  return (
    <div className="sticker-wrap py-2" tabIndex={0} aria-label={`Recensione del bestie di ${name}`}>
      <div
        className={cn(
          'sticker rounded-2xl p-4 text-ink shadow-[0_14px_30px_-12px_rgb(0_0_0/0.7)]',
          finish === 'paper' && 'bg-[#FFF6C9]',
          finish === 'holo' && 'holo',
          finish === 'neon' && 'bg-coral',
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-ink px-2.5 py-1 font-display text-xs font-bold uppercase tracking-widest text-cream">Bestie Vouching</span>
          <span className="font-display text-xs font-semibold text-ink/60">certified ✓</span>
        </div>
        <dl className="space-y-2.5">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Il suo peggior difetto al primo appuntamento:</dt>
            <dd className="font-display text-base font-semibold leading-snug">“{vouch.worstFlaw}”</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Perché dovreste uscirci comunque:</dt>
            <dd className="font-display text-base font-semibold leading-snug">“{vouch.whyGoOut}”</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">La sua red flag innocua:</dt>
            <dd className="font-display text-base font-semibold leading-snug">“{vouch.redFlag}” 🚩</dd>
          </div>
        </dl>
        <p className="mt-3 text-right text-sm italic text-ink/60">— {vouch.by}</p>
        <div className="sticker-peel" aria-hidden />
      </div>
      {onShare && <ShareBestie name={name} onShare={onShare} />}
    </div>
  )
}

function ShareBestie({ name, onShare }: { name: string; onShare: () => void }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    const url = `${location.origin}${location.pathname}#vouch/${encodeURIComponent(name.toLowerCase())}-${Math.random().toString(36).slice(2, 7)}`
    try {
      if (navigator.share) await navigator.share({ title: 'Recensiscimi su ALONG', text: `Scrivi il mio sticker Bestie su ALONG 🙈`, url })
      else await navigator.clipboard.writeText(url)
    } catch {
      /* user cancelled */
    }
    setCopied(true)
    onShare()
    window.setTimeout(() => setCopied(false), 2200)
  }
  return (
    <button onClick={share} className="mt-4 inline-flex items-center gap-2 rounded-full border border-cream/15 px-3.5 py-2 text-sm font-medium text-cream/85 transition hover:border-coral/50 hover:text-coral">
      {copied ? <Check size={15} /> : <Share2 size={15} />} {copied ? 'Link copiato!' : 'Condividi link con il tuo bestie'}
    </button>
  )
}

const BADGE_META = {
  fast: { icon: Zap, label: 'Fast Replier', emoji: '⚡', color: 'text-coral bg-coral/10 border-coral/25' },
  voice: { icon: Mic, label: 'Voice Lover', emoji: '🎙️', color: 'text-violet bg-violet/15 border-violet/30' },
  zero: { icon: ShieldCheck, label: 'Zero Ghosting', emoji: '🛡️', color: 'text-cyan bg-cyan/10 border-cyan/25' },
} as const

export function BadgeRow({ badges }: { badges: User['badges'] }) {
  if (!badges.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span key={b} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', BADGE_META[b].color)}>
          <span aria-hidden>{BADGE_META[b].emoji}</span> {BADGE_META[b].label}
        </span>
      ))}
    </div>
  )
}

export function KarmaMeter({ karma, stats }: { karma: number; stats: MeStats }) {
  const b = computeBadges(stats)
  const level = karma >= 250 ? 'Leggenda' : karma >= 180 ? 'Affidabile' : karma >= 130 ? 'In ascesa' : 'Nuova leva'
  const pct = Math.min(100, (karma / 300) * 100)
  const rows = [
    { key: 'fast' as const, on: b.fast, detail: `Risposta media ${formatReply(b.avgReply)}`, hint: 'Rispondi entro 2 min in media' },
    { key: 'voice' as const, on: b.voice, detail: `${Math.round(b.voiceRatio * 100)}% note vocali`, hint: 'Almeno 1 messaggio su 4 vocale' },
    { key: 'zero' as const, on: b.zero, detail: stats.ghosted ? `${stats.ghosted} timer scaduti` : `${stats.elegantCloses} chiusure eleganti`, hint: 'Mai lasciar scadere un timer' },
  ]
  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-cream/50">
            <Gauge size={14} /> Karma Meter
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-coral">{karma}</p>
        </div>
        <span className="rounded-full bg-coral/10 px-2.5 py-1 text-sm font-semibold text-coral">{level}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream/10" role="progressbar" aria-valuenow={karma} aria-valuemin={0} aria-valuemax={300} aria-label="Livello karma">
        <div className="h-full rounded-full bg-coral transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => {
          const M = BADGE_META[r.key]
          return (
            <li key={r.key} className={cn('flex items-center gap-3 rounded-2xl border p-2.5', r.on ? M.color : 'border-cream/5 bg-cream/[0.02] text-cream/40')}>
              <M.icon size={18} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{M.label}</p>
                <p className="text-xs opacity-80">{r.on ? r.detail : r.hint}</p>
              </div>
              <span className="text-xs font-semibold">{r.on ? 'ATTIVO' : 'Bloccato'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function earnedBadges(stats: MeStats): User['badges'] {
  const b = computeBadges(stats)
  return (['fast', 'voice', 'zero'] as const).filter((k) => b[k])
}
