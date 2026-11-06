import { Bookmark, Clock, Globe2, KeyRound, Lock, MapPin, MessageCircle, Plane } from 'lucide-react'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { affinity, CATEGORY_META, cn, planStatus, planWhen, sharedInterests, STATUS_STYLE } from '../lib/utils'
import { Avatar, Button, Eyebrow, LifetimeBadge, Sheet } from './ui'
import { BadgeRow, BestieSticker } from './Bestie'
import { LivingPlanCard } from './LivingPlanCard'

export function PlanDetailSheet({ planId, onClose, onJoin }: { planId: string | null; onClose: () => void; onJoin: (planId: string) => void }) {
  const { state, user, toggleSave } = useStore()
  const nav = useNav()
  const now = useNow(30_000)
  const plan = state.plans.find((p) => p.id === planId)
  const chat = plan && state.chats.find((c) => c.planId === plan.id && (c.status === 'active' || c.status === 'waiting') && !c.incoming)

  return (
    <Sheet open={!!plan} onClose={onClose}>
      {plan && (() => {
        const meta = CATEGORY_META[plan.category]
        const status = planStatus(plan, now)
        const host = user(plan.hostId)
        const isHost = plan.hostId === 'me'
        const joined = plan.participants.includes('me')
        const full = plan.participants.length >= plan.capacity
        return (
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', meta.tone, meta.text)}>
                  {meta.emoji} {meta.label}
                </span>
                <span className={cn('rounded-full px-2 py-0.5 font-display text-[10px] font-bold tracking-wider', STATUS_STYLE[status])}>{status}</span>
                {plan.mode === 'remote' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet/15 px-2.5 py-1 text-[12px] font-semibold text-violet-300">
                    <Globe2 size={12} /> Senza Confini
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-[28px] font-bold leading-[1.05]">{plan.title}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="glass rounded-2xl p-3">
                  <Clock size={15} className="text-cyan" />
                  <p className="mt-1 text-[13px] font-semibold">{planWhen(plan, now)}</p>
                </div>
                <div className="glass rounded-2xl p-3">
                  {plan.mode === 'remote' ? <Globe2 size={15} className="text-violet-300" /> : <MapPin size={15} className="text-coral" />}
                  <p className="mt-1 line-clamp-2 text-[13px] font-semibold">
                    {plan.habitat}
                    {plan.district ? ` · ${plan.district}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => !isHost && nav.openUser(host.id)} className="glass flex w-full items-center gap-3 rounded-3xl p-3 text-left">
              <Avatar user={host} size={48} blur={plan.privacy && !isHost} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-cream/45">Host</p>
                <p className="font-display text-[16px] font-bold">{isHost ? 'Tu' : `${host.name}, ${host.age}`}</p>
                <BadgeRow badges={host.badges} />
              </div>
              {!isHost && <span className="text-[12px] font-semibold text-lime">Profilo →</span>}
            </button>

            {plan.vibes.length > 0 && (
              <div>
                <Eyebrow>Instant Vibe</Eyebrow>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.vibes.map((v) => (
                    <span key={v} className="rounded-full border border-lime/25 bg-lime/5 px-2.5 py-1 text-[12.5px] text-lime">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Eyebrow>
                Crew · {plan.participants.length}/{plan.capacity}
              </Eyebrow>
              <div className="mt-2 flex flex-wrap gap-3">
                {plan.participants.map((id) => {
                  const u = user(id)
                  return (
                    <div key={id} className="flex w-14 flex-col items-center gap-1">
                      <Avatar user={u} size={48} blur={plan.privacy && id !== 'me'} />
                      <span className="truncate text-[11px] text-cream/60">{id === 'me' ? 'Tu' : plan.privacy ? '???' : u.name}</span>
                    </div>
                  )
                })}
                {Array.from({ length: Math.max(0, plan.capacity - plan.participants.length) }).map((_, i) => (
                  <div key={i} className="flex w-14 flex-col items-center gap-1">
                    <div className="size-12 rounded-full border border-dashed border-cream/20" />
                    <span className="text-[11px] text-cream/30">libero</span>
                  </div>
                ))}
              </div>
              {plan.privacy && (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] text-violet-300">
                  <Lock size={12} /> Progressive Unblur: le foto si svelano dopo 5 messaggi significativi nella crew.
                </p>
              )}
            </div>

            {!isHost && (
              <div className="relative overflow-hidden rounded-3xl border border-lime/30 bg-lime/5 p-4">
                <p className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-lime">
                  <KeyRound size={13} /> Gatekeeper
                </p>
                <p className="mt-1 font-display text-[17px] font-semibold leading-snug">{plan.dilemma.question}</p>
              </div>
            )}

            <LivingPlanCard plan={plan} users={plan.participants.map(user)} preview now={now} />

            <div className="sticky bottom-0 -mx-5 -mb-8 flex gap-2 bg-gradient-to-t from-ink via-ink/95 to-transparent px-5 pb-6 pt-5">
              <button
                onClick={() => toggleSave(plan.id)}
                className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', state.saved.includes(plan.id) ? 'bg-lime text-ink' : 'bg-cream/10 text-cream')}
                aria-label="Salva"
                aria-pressed={state.saved.includes(plan.id)}
              >
                <Bookmark size={18} fill={state.saved.includes(plan.id) ? 'currentColor' : 'none'} />
              </button>
              {isHost ? (
                <Button className="flex-1" size="lg" variant="ghost" onClick={() => nav.setTab('plans')}>
                  Gestisci in “I miei piani”
                </Button>
              ) : chat ? (
                <Button className="flex-1" size="lg" onClick={() => nav.openChat(chat.id)}>
                  <MessageCircle size={18} /> Apri la crew chat
                </Button>
              ) : status === 'EXPIRED' ? (
                <Button className="flex-1" size="lg" disabled>
                  Piano scaduto
                </Button>
              ) : full && !joined ? (
                <Button className="flex-1" size="lg" variant="ghost" disabled>
                  Crew al completo
                </Button>
              ) : (
                <Button className="flex-1" size="lg" onClick={() => onJoin(plan.id)}>
                  <KeyRound size={18} /> Rispondi al dilemma e unisciti
                </Button>
              )}
            </div>
          </div>
        )
      })()}
    </Sheet>
  )
}

export function UserSheet({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { state, user, toggleSave } = useStore()
  const nav = useNav()
  const u = userId ? user(userId) : null
  const dm = u && state.chats.find((c) => !c.planId && c.peerIds.includes(u.id) && c.status === 'active')
  return (
    <Sheet open={!!u} onClose={onClose}>
      {u && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar user={u} size={84} />
            <div className="min-w-0">
              <h2 className="text-[26px] font-bold leading-tight">
                {u.name}, {u.age}
              </h2>
              <p className="flex items-center gap-1 text-[13px] text-cream/55">
                <MapPin size={13} /> {u.city}
                {u.travel && (
                  <span className="ml-1 inline-flex items-center gap-1 text-cyan">
                    <Plane size={12} /> → {u.travel}
                  </span>
                )}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-full bg-violet/20 px-2 py-0.5 text-[12px] font-bold text-violet-200">{affinity(state.me, u)}% sintonia</span>
                <span className="text-[12px] font-semibold text-lime">⚡ {u.karma} karma</span>
              </div>
            </div>
          </div>
          {u.lifetime && <LifetimeBadge small />}
          <p className="text-[14px] leading-snug text-cream/80">{u.bio}</p>
          <BadgeRow badges={u.badges} />
          <div>
            <Eyebrow>Passioni</Eyebrow>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {u.interests.map((i) => {
                const shared = sharedInterests(state.me, u).includes(i)
                return (
                  <span key={i} className={cn('rounded-full border px-2.5 py-1 text-[12.5px]', shared ? 'border-violet bg-violet/25 text-cream' : 'border-cream/10 text-cream/65')}>
                    {shared && '✦ '}
                    {i}
                  </span>
                )
              })}
            </div>
          </div>
          {u.bestie && <BestieSticker vouch={u.bestie} name={u.name} />}

          {state.plans.filter((p) => p.hostId === u.id).length > 0 && (
            <div className="space-y-2">
              <Eyebrow>Piani di {u.name}</Eyebrow>
              {state.plans
                .filter((p) => p.hostId === u.id)
                .map((p) => (
                  <LivingPlanCard key={p.id} plan={p} users={p.participants.map(user)} saved={state.saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => nav.openPlan(p.id)} />
                ))}
            </div>
          )}

          <div className="rounded-3xl border border-lime/30 bg-lime/5 p-4">
            <p className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-lime">
              <KeyRound size={13} /> Il dilemma di {u.name}
            </p>
            <p className="mt-1 font-display text-[17px] font-semibold leading-snug">{u.dilemma.question}</p>
          </div>
          <div className="sticky bottom-0 -mx-5 -mb-8 bg-gradient-to-t from-ink via-ink/95 to-transparent px-5 pb-6 pt-5">
            {dm ? (
              <Button className="w-full" size="lg" onClick={() => nav.openChat(dm.id)}>
                <MessageCircle size={18} /> Apri la chat
              </Button>
            ) : (
              <Button className="w-full" size="lg" onClick={() => nav.openGatekeeperForUser(u.id)}>
                <KeyRound size={18} /> Rispondi per scrivere il primo messaggio
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
