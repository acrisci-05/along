import { useEffect, useState } from 'react'
import { CheckCircle2, Flag, Ban } from 'lucide-react'
import { REPORT_REASONS } from '../lib/safety'
import { cn } from '../lib/utils'
import { useStore } from '../store/store'
import { Avatar, Button, Sheet } from './ui'

export type SafetyMode = 'menu' | 'block' | 'report'

/** Block / report flows, reachable from Discover, profiles and chats. */
export function SafetySheet({ target, onClose, onViewProfile }: { target: { userId: string; mode: SafetyMode } | null; onClose: () => void; onViewProfile?: (id: string) => void }) {
  const { user, blockUser, reportUser, demo } = useStore()
  const [mode, setMode] = useState<SafetyMode>('menu')
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [done, setDone] = useState<null | 'block' | 'report'>(null)

  useEffect(() => {
    if (target) {
      setMode(target.mode)
      setReason('')
      setDetails('')
      setDone(null)
    }
  }, [target])

  const u = target ? user(target.userId) : null
  const title = done ? undefined : mode === 'menu' ? u?.name : mode === 'block' ? `Bloccare ${u?.name}?` : `Segnala ${u?.name}`

  return (
    <Sheet open={!!target} onClose={onClose} title={title}>
      {u && done && (
        <div className="py-4 text-center">
          <CheckCircle2 size={40} className="mx-auto text-brand" />
          <p className="mt-3 text-xl font-bold">{done === 'report' ? 'Grazie per la segnalazione' : `${u.name} è stat* bloccat*`}</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            {done === 'report'
              ? `${u.name} è stat* bloccat* e non potrà più vederti né scriverti. Il nostro team verificherà entro 24 ore.`
              : 'Non vi vedrete più da nessuna parte e le vostre chat sono chiuse. Puoi sbloccare dal profilo, in Persone bloccate.'}
          </p>
          {demo && <p className="mt-2 text-xs text-muted">Demo: la verifica è simulata.</p>}
          <Button className="mt-6 w-full rounded-full" onClick={onClose}>
            Fatto
          </Button>
        </div>
      )}

      {u && !done && mode === 'menu' && (
        <div className="space-y-1.5">
          <div className="mb-3 flex items-center gap-3">
            <Avatar user={u} size={44} />
            <p className="text-sm text-muted">Cosa vuoi fare?</p>
          </div>
          {onViewProfile && (
            <button
              onClick={() => {
                onClose()
                onViewProfile(u.id)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-surface"
            >
              Vedi profilo completo
            </button>
          )}
          <button onClick={() => setMode('block')} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-surface">
            <Ban size={18} /> Blocca
          </button>
          <button onClick={() => setMode('report')} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-alarm hover:bg-surface">
            <Flag size={18} /> Segnala
          </button>
        </div>
      )}

      {u && !done && mode === 'block' && (
        <div>
          <p className="text-sm text-muted">{u.name} non potrà più vederti né scriverti, e non vedrai più i suoi piani. Le vostre chat verranno chiuse. Non riceverà nessuna notifica.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={onClose}>
              Annulla
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                blockUser(u.id)
                setDone('block')
              }}
            >
              Blocca
            </Button>
          </div>
        </div>
      )}

      {u && !done && mode === 'report' && (
        <div>
          <p className="text-sm text-muted">La segnalazione è anonima. {u.name} verrà anche bloccat*.</p>
          <div className="mt-4 space-y-2" role="radiogroup" aria-label="Motivo della segnalazione">
            {REPORT_REASONS.map((r) => (
              <button key={r} role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={cn('w-full rounded-xl border px-3.5 py-3 text-left text-base', reason === r ? 'border-alarm bg-alarm/10 font-semibold' : 'border-line hover:border-cream/30')}>
                {r}
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="text-sm font-semibold text-muted">Vuoi aggiungere dettagli? (facoltativo)</span>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={400} placeholder="Cosa è successo?" className="mt-1 w-full resize-none rounded-xl border border-line bg-ink p-3 text-base placeholder:text-cream/30 focus:border-alarm focus:outline-none" />
          </label>
          <Button
            variant="danger"
            className="mt-3 w-full"
            disabled={!reason}
            onClick={() => {
              reportUser(u.id, reason, details)
              blockUser(u.id)
              setDone('report')
            }}
          >
            Invia segnalazione e blocca
          </Button>
        </div>
      )}
    </Sheet>
  )
}
