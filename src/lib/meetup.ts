import type { AppState, Chat } from '../types'
import { planStatus, planWhen } from './utils'

/** One-tap meetup suggestion for a match: their plan, else my plan, else a coffee. */
export function suggestMeetup(state: AppState, userId: string, chat?: Chat) {
  const u = state.users[userId]
  const now = Date.now()
  const live = (id?: string) => state.plans.find((p) => p.id === id && planStatus(p, now) !== 'EXPIRED')
  const plan =
    live(chat?.planId) ??
    state.plans.find((p) => p.hostId === userId && p.mode === 'local' && planStatus(p, now) === 'OPEN') ??
    state.plans.filter((p) => p.hostId === 'me' && planStatus(p, now) !== 'EXPIRED').sort((a, b) => b.createdAt - a.createdAt)[0]
  if (plan && (chat?.mode ?? 'local') === 'local') {
    const when = (plan.whenLabel ?? planWhen(plan, now).replace(' · ', ' alle ')).toLowerCase()
    const base = plan.habitat.split('·')[0].trim()
    const place = plan.district && !base.toLowerCase().includes(plan.district.toLowerCase()) ? `${base}, ${plan.district}` : base
    return { title: plan.title, when, place }
  }
  if (chat?.mode === 'remote' || (u && u.city !== state.me.city)) {
    return { title: 'Videochiamata di 20 minuti', when: 'domani alle 21:30', place: 'online' }
  }
  const common = u?.habitats.find((h) => state.me.habitats.includes(h))
  return { title: 'Un caffè', when: 'domani alle 18:30', place: common ?? u?.habitats[0] ?? 'da decidere insieme' }
}
