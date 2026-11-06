import { Gauge, Mic, ShieldCheck, Zap } from 'lucide-react'
import type { MeStats, User } from '../types'
import { cn, computeBadges, formatReply } from '../lib/utils'

const BADGE_META = {
  fast: { icon: Zap, label: 'Fast Replier', emoji: '⚡', color: 'text-brand bg-brand/10 border-brand/25' },
  voice: { icon: Mic, label: 'Voice Lover', emoji: '🎙️', color: 'text-violet bg-violet/15 border-violet/30' },
  zero: { icon: ShieldCheck, label: 'Zero Ghosting', emoji: '🛡️', color: 'text-cyan bg-cyan/10 border-cyan/25' },
} as const

export function BadgeRow({ badges }: { badges: User['badges'] }) {
  if (!badges.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span key={b} className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold', BADGE_META[b].color)}>
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
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-brand">{karma}</p>
        </div>
        <span className="rounded-md bg-brand/10 px-2.5 py-1 text-sm font-semibold text-brand">{level}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream/10" role="progressbar" aria-valuenow={karma} aria-valuemin={0} aria-valuemax={300} aria-label="Livello karma">
        <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
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
