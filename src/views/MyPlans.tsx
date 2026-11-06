import { useState } from 'react'
import { motion } from 'motion/react'
import { Eye, Lock, Plus, Sparkles, UserPlus } from 'lucide-react'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { cn } from '../lib/utils'
import { LivingPlanCard } from '../components/LivingPlanCard'
import { Avatar, Eyebrow } from '../components/ui'

type Seg = 'host' | 'join' | 'saved'

export function MyPlans() {
  const { state, user, toggleSave, hostedActivePlans, limits, simulateIncoming, demo } = useStore()
  const nav = useNav()
  const now = useNow(30_000)
  const [seg, setSeg] = useState<Seg>('host')

  const hosted = state.plans.filter((p) => p.hostId === 'me').sort((a, b) => b.createdAt - a.createdAt)
  const joined = state.plans.filter((p) => p.hostId !== 'me' && p.participants.includes('me'))
  const saved = state.plans.filter((p) => state.saved.includes(p.id))
  const lists = { host: hosted, join: joined, saved }
  const list = lists[seg]

  return (
    <div className="space-y-4 pb-6">
      <header>
        <Eyebrow>I miei piani</Eyebrow>
        <h1 className="mt-1 text-2xl font-bold leading-none">
          Le tue <span className="text-brand">mosse</span>
        </h1>
      </header>

      <div className="glass grid grid-cols-3 rounded-2xl p-1" role="tablist">
        {(
          [
            ['host', 'Ospito', hosted.length],
            ['join', 'Partecipo', joined.length],
            ['saved', 'Salvati', saved.length],
          ] as const
        ).map(([k, l, n]) => (
          <button key={k} role="tab" aria-selected={seg === k} onClick={() => setSeg(k)} className={cn('relative h-10 rounded-xl text-sm font-semibold', seg === k ? 'text-ink' : 'text-cream/60')}>
            {seg === k && <motion.span layoutId="seg-pill" className="absolute inset-0 rounded-xl bg-brand" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative">
              {l} <span className="opacity-60">{n}</span>
            </span>
          </button>
        ))}
      </div>

      {seg === 'host' && (
        <div className="flex items-center justify-between rounded-2xl border border-cream/10 bg-cream/[0.03] px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">
              Piani attivi: {hostedActivePlans.length}/{limits.plans === Infinity ? '∞' : limits.plans}
            </p>
            <div className="mt-1 flex gap-1" aria-hidden>
              {Array.from({ length: limits.plans === Infinity ? Math.max(5, hostedActivePlans.length + 1) : limits.plans }).map((_, i) => (
                <span key={i} className={cn('h-1.5 w-6 rounded-full', i < hostedActivePlans.length ? 'bg-brand' : 'bg-cream/10')} />
              ))}
            </div>
          </div>
          <button onClick={nav.openCreate} className="inline-flex h-9 items-center gap-1 rounded-md bg-brand px-3 text-sm font-semibold text-ink">
            <Plus size={15} /> Nuovo
          </button>
        </div>
      )}

      <div className="space-y-4">
        {list.map((p, i) => (
          <div key={p.id} className="space-y-2">
            <LivingPlanCard plan={p} index={i} now={now} users={p.participants.map(user)} saved={state.saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => nav.openPlan(p.id)} />
            {seg === 'host' && (
              <div className="glass rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Eye size={15} className="text-violet" /> {p.interested.length} person{p.interested.length === 1 ? 'a' : 'e'} interessat{p.interested.length === 1 ? 'a' : 'e'}
                  </p>
                  {demo && (
                    <button onClick={simulateIncoming} className="inline-flex items-center gap-1 text-sm font-semibold text-cyan hover:underline">
                      <UserPlus size={13} /> Simula richiesta
                    </button>
                  )}
                </div>
                {p.interested.length > 0 &&
                  (state.lifetime ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.interested.map((id) => {
                        const u = user(id)
                        return (
                          <button key={id} onClick={() => nav.openUser(id)} className="flex items-center gap-1.5 rounded-md bg-cream/5 py-1 pl-1 pr-2.5 text-sm hover:bg-cream/10">
                            <Avatar user={u} size={22} /> {u.name}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <button onClick={() => nav.openPaywall('Scopri chi ha salvato o mostrato interesse per i tuoi piani prima del match. Incluso in ALONG Forever.')} className="mt-2 flex w-full items-center gap-2 rounded-xl bg-violet/10 p-2 text-left">
                      <div className="flex -space-x-2">
                        {p.interested.slice(0, 4).map((id) => (
                          <Avatar key={id} user={user(id)} size={26} blur ring />
                        ))}
                      </div>
                      <span className="flex-1 text-sm text-cream/65">Chi sono? Scoprilo con Forever</span>
                      <Lock size={14} className="text-violet" />
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}
        {!list.length && (
          <div className="rounded-3xl border border-dashed border-cream/15 p-6 text-center">
            <Sparkles className="mx-auto text-brand" />
            <p className="mt-2 font-display text-lg font-bold">{seg === 'saved' ? 'Nessun piano salvato' : seg === 'join' ? 'Non partecipi ancora a nessun piano' : 'Non ospiti ancora nulla'}</p>
            <p className="mt-1 text-sm text-cream/55">{seg === 'saved' ? 'Tocca il segnalibro sulle card che ti ispirano.' : 'Esplora o crea qualcosa: meno scroll, più fare.'}</p>
            <button onClick={() => (seg === 'host' ? nav.openCreate() : nav.setTab('explore'))} className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-ink">
              {seg === 'host' ? 'Crea un piano' : 'Vai a Esplora'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
