import { Briefcase, Cigarette, Languages, MapPin, Wine } from 'lucide-react'
import type { Habit, User } from '../types'

const SMOKE: Record<Habit, string> = { si: 'Fuma', 'a volte': 'Fuma a volte', no: 'Non fuma' }
const DRINK: Record<Habit, string> = { si: 'Beve', 'a volte': 'Beve a volte', no: 'Non beve' }

/** Compact facts: work, languages, habits, habitats. Renders nothing when empty. */
export function InfoRows({ user, showHabitats = true }: { user: User; showHabitats?: boolean }) {
  const rows: Array<[typeof Briefcase, string, string]> = []
  if (user.work) rows.push([Briefcase, 'Lavoro o studio', user.work])
  if (user.languages?.length) rows.push([Languages, 'Lingue', user.languages.join(', ')])
  if (user.smoke) rows.push([Cigarette, 'Fumo', SMOKE[user.smoke]])
  if (user.drink) rows.push([Wine, 'Alcol', DRINK[user.drink]])
  if (showHabitats && user.habitats.length) rows.push([MapPin, 'Habitat', user.habitats.join(' · ')])
  if (!rows.length) return null
  return (
    <dl className="divide-y divide-line rounded-xl border border-line">
      {rows.map(([Icon, k, v]) => (
        <div key={k} className="flex items-start gap-3 px-3.5 py-2.5 text-sm">
          <Icon size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <dt className="sr-only">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
