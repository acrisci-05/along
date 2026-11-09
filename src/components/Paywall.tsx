import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Heart, Loader2, ShieldCheck } from 'lucide-react'
import { Button, LifetimeBadge, RevolutTip, Sheet, Toggle } from './ui'
import { useStore } from '../store/store'

/** What stays free for everyone, forever: paying never buys more chances. */
const PROMISES = [
  'Like illimitati e tutti i like ricevuti visibili',
  'Stesse 3 chat attive per tutti',
  'Nessun boost, nessuna visibilità comprata',
  'Nessun abbonamento',
]

/** “Sostieni ALONG”: a one-off contribution, with only a Sostenitore mark on your profile. */
export function Paywall({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const { state, setLifetime, demo } = useStore()
  const [phase, setPhase] = useState<'idle' | 'paying' | 'done'>('idle')
  const [launch, setLaunch] = useState(true)

  useEffect(() => {
    if (open) setPhase(state.lifetime ? 'done' : 'idle')
  }, [open, state.lifetime])

  const price = launch ? '14,99 €' : '19,99 €'

  const buy = () => {
    if (!demo) {
      setLifetime(true)
      return
    }
    setPhase('paying')
    window.setTimeout(() => {
      setLifetime(true)
      setPhase('done')
    }, 1200)
  }

  return (
    <Sheet open={open} onClose={onClose} full>
      <AnimatePresence mode="wait">
        {phase === 'done' ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center pt-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }} transition={{ duration: 0.5 }} className="grid size-24 place-items-center rounded-full bg-brand text-ink">
              <Check size={44} strokeWidth={3} />
            </motion.div>
            <h2 className="mt-6 text-3xl font-bold">Grazie di cuore.</h2>
            <p className="mt-2 max-w-xs text-cream/70">Il tuo sostegno tiene ALONG indipendente e onesta. Sul profilo ora c’è il segno Sostenitore.</p>
            <div className="mt-5">
              <LifetimeBadge />
            </div>
            <Button className="mt-8 w-full" size="lg" onClick={onClose}>
              Torna all’app
            </Button>
            <div className="mt-6 w-full text-left">
              <RevolutTip />
            </div>
          </motion.div>
        ) : (
          <motion.div key="pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl bg-forest p-5 text-cream">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand">
                <Heart size={14} fill="currentColor" /> Niente trucchi a pagamento
              </p>
              <h2 className="mt-1 text-3xl leading-[0.95]">Sostieni ALONG</h2>
              <p className="mt-2 text-base leading-snug text-cream/80">
                {reason ?? 'Un pagamento unico, per sempre. Non compri più like né più visibilità: aiuti un’app indipendente a restare così.'}
              </p>
              <div className="mt-4 flex items-end gap-3">
                <span className="whitespace-nowrap text-3xl font-extrabold leading-none tracking-[-0.04em] tabular-nums">{price}</span>
                <span className="whitespace-nowrap pb-1 text-sm text-cream/60">
                  una volta sola{launch && <span className="ml-1.5 line-through">19,99 €</span>}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-md bg-ink/40 px-3 py-2">
                <span className="text-sm text-cream/80">Prezzo per i primi iscritti</span>
                <Toggle checked={launch} onChange={setLaunch} label="Prezzo per i primi iscritti" />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
              <p className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck size={16} className="text-brand" /> Gratis per tutti, sempre
              </p>
              <ul className="mt-2 grid gap-1.5">
                {PROMISES.map((p, i) => (
                  <motion.li key={p} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="flex items-center gap-2 text-sm text-cream/80">
                    <Check size={15} className="shrink-0 text-brand" /> {p}
                  </motion.li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted">Con il sostegno ricevi solo il segno ♥ Sostenitore sul profilo, e la nostra gratitudine.</p>
            </div>

            {demo && (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-dashed border-cream/15 px-3 py-2.5">
                <span className="text-sm text-cream/60">
                  <span className="font-semibold text-cream/85">Demo:</span> simula sostegno
                </span>
                <Toggle checked={state.lifetime} onChange={(v) => setLifetime(v)} label="Simula sostegno" tone="gold" />
              </div>
            )}

            <div className="sticky bottom-0 -mx-5 -mb-8 mt-2 bg-gradient-to-t from-[#221b16] via-[#221b16] to-transparent px-5 pb-6 pt-6">
              <Button className="w-full" size="lg" onClick={buy} disabled={phase === 'paying'}>
                {phase === 'paying' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Un attimo…
                  </>
                ) : (
                  <>Sostieni con {price}</>
                )}
              </Button>
              <p className="mt-2 text-center text-xs text-cream/40">{demo ? 'Pagamento simulato · nessun addebito in questa demo' : 'Pagamenti in arrivo a breve · nessun addebito oggi'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  )
}
