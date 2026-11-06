import { motion } from 'motion/react'
import { Bookmark, Clock, Globe2, Lock, MapPin, Users } from 'lucide-react'
import type { Plan, User } from '../types'
import { CATEGORY_META, cn, planStatus, planWhen, STATUS_STYLE } from '../lib/utils'
import { AvatarStack } from './ui'

function ContextRow({ plan }: { plan: Plan }) {
  const d = plan.details
  const items: Array<[string, string]> = []
  switch (plan.category) {
    case 'food':
    case 'drink':
      if (d.cuisine) items.push(['Cucina', d.cuisine])
      if (d.budget) items.push(['Spesa', d.budget])
      break
    case 'sport':
      if (d.level) items.push(['Livello', d.level])
      items.push(['Mancano', `${Math.max(0, plan.capacity - plan.participants.length)} giocator${plan.capacity - plan.participants.length === 1 ? 'e' : 'i'}`])
      break
    case 'cinema':
      if (d.film) items.push(['Film', d.film])
      if (d.language) items.push(['Lingua', d.language])
      break
    case 'study':
      items.push(['Modalità', d.studyMode === 'collaborativo' ? '🗣️ Collaborativo' : '🤫 Silenzioso'])
      break
    case 'travel':
      if (d.destination) items.push(['Meta', d.destination])
      if (d.budget) items.push(['Budget', d.budget])
      break
    default:
      if (d.platform) items.push(['Piattaforma', d.platform])
      if (d.timezone) items.push(['Fuso', d.timezone])
  }
  if (!items.length && !d.track) return null
  return (
    <div className="mt-3 space-y-2">
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {items.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-ink/60 px-2.5 py-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-cream/40">{k}</p>
              <p className="truncate text-sm font-medium text-cream/90">{v}</p>
            </div>
          ))}
        </div>
      )}
      {d.track && (
        <div className="flex items-center gap-3 rounded-xl bg-violet/15 p-2">
          <div className="grid size-10 place-items-center rounded-lg bg-[var(--color-p-music)] text-lg" aria-hidden>
            💿
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{d.track.title}</p>
            <p className="truncate text-xs text-cream/55">
              {d.track.artist} · {d.track.length}
            </p>
          </div>
          <div className="flex h-5 items-end gap-[2px] pr-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="block h-full w-[3px] origin-bottom animate-wave rounded-full bg-violet" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function LivingPlanCard({
  plan,
  users,
  onOpen,
  saved,
  onSave,
  affinity,
  preview,
  now = Date.now(),
  index = 0,
}: {
  plan: Plan
  users: User[]
  onOpen?: () => void
  saved?: boolean
  onSave?: () => void
  affinity?: number
  preview?: boolean
  now?: number
  index?: number
}) {
  const status = planStatus(plan, now)
  const meta = CATEGORY_META[plan.category]
  const host = users[0]
  const left = plan.capacity - plan.participants.length
  const expired = status === 'EXPIRED'
  const remote = plan.mode === 'remote'

  return (
    <motion.article
      layout={!preview}
      initial={preview ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.05, type: 'spring', damping: 26, stiffness: 260 }}
      whileHover={preview ? undefined : { y: -3 }}
      whileTap={preview || !onOpen ? undefined : { scale: 0.985 }}
      className={cn('group relative overflow-hidden rounded-3xl p-[1px]', expired && 'opacity-55')}
    >
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-3xl opacity-60 transition-opacity group-hover:opacity-100',
          remote ? 'bg-line' : 'bg-line',
          status === 'CONFIRMED' && 'bg-cyan/60',
        )}
      />
      <div className="relative rounded-3xl bg-[#1a1a1a]/95 p-4">
        {/* header */}
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', meta.tone, meta.text)}>
            <span aria-hidden>{meta.emoji}</span> {meta.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-cream/[0.06] px-2.5 py-1 text-xs font-medium text-cream/80">
            <Clock size={12} /> {planWhen(plan, now)}
          </span>
          <span className={cn('ml-auto rounded-full px-2 py-0.5 font-display text-xs font-bold tracking-wider', STATUS_STYLE[status])}>{status}</span>
        </div>

        {/* title */}
        <h3 className="mt-3 font-display text-lg font-bold leading-[1.12] text-cream">
          {onOpen ? (
            <button type="button" onClick={onOpen} className="text-left focus-visible:outline-none">
              {plan.title}
              <span className="absolute inset-0 rounded-3xl group-has-[:focus-visible]:ring-2 group-has-[:focus-visible]:ring-coral" aria-hidden />
            </button>
          ) : (
            plan.title || <span className="text-cream/30">Il tuo piano…</span>
          )}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-cream/60">
          {remote ? <Globe2 size={14} className="text-violet" /> : <MapPin size={14} className="text-coral" />}
          <span className="truncate">
            {plan.habitat || 'Scegli un habitat'}
            {plan.district && ` · ${plan.district}`}
            {!remote && plan.city !== 'Napoli' && ` · ${plan.city}`}
          </span>
        </p>

        <ContextRow plan={plan} />

        {/* vibes */}
        {plan.vibes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-coral/80">Instant Vibe</span>
            {plan.vibes.slice(0, 3).map((v) => (
              <span key={v} className="rounded-full border border-cream/10 px-2 py-0.5 text-xs text-cream/70">
                {v}
              </span>
            ))}
          </div>
        )}

        {/* footer */}
        <div className="mt-4 flex items-center gap-3">
          <AvatarStack users={users} capacity={plan.capacity} size={30} blur={plan.privacy || undefined} max={4} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-semibold">
              <Users size={13} className="text-cream/50" /> {plan.participants.length}/{plan.capacity}
              {plan.privacy && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-medium text-violet">
                  <Lock size={11} /> Unblur
                </span>
              )}
            </p>
            <p className="truncate text-xs text-cream/50">
              {left > 0 ? `${left} post${left === 1 ? 'o' : 'i'} liber${left === 1 ? 'o' : 'i'}` : 'Crew al completo'} · host {host?.id === 'me' ? 'tu' : host?.name}
            </p>
          </div>
          {affinity !== undefined && (
            <span className="rounded-xl bg-violet/20 px-2 py-1 text-center font-display text-sm font-bold leading-none text-violet">
              {affinity}%<span className="block text-xs font-medium text-violet/80">sintonia</span>
            </span>
          )}
          {onSave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSave()
              }}
              className={cn('relative z-10 grid size-9 place-items-center rounded-full transition', saved ? 'bg-coral text-ink' : 'bg-cream/[0.06] text-cream/70 hover:bg-cream/10')}
              aria-label={saved ? 'Rimuovi dai salvati' : 'Salva piano'}
              aria-pressed={saved}
            >
              <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  )
}
