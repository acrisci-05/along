import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Eye, Undo2, Infinity as InfinityIcon, Loader2, MessagesSquare, Plane, ShieldCheck, Sparkles } from 'lucide-react'
import { Button, LifetimeBadge, RevolutTip, Sheet, Toggle } from './ui'
import { useStore } from '../store/store'

const FEATURES = [
  { icon: InfinityIcon, title: 'Piani attivi illimitati', sub: 'Free: fino a 3 contemporaneamente' },
  { icon: MessagesSquare, title: '5 slot chat attivi', sub: 'Free: 3 slot in Focus Mode' },
  { icon: Plane, title: 'Travel Bridge illimitato', sub: 'Tutte le città future che vuoi' },
  { icon: Sparkles, title: 'Badge Founding Member', sub: 'Bordo gradiente neon permanente' },
  { icon: Eye, title: 'Vedi chi ti ha salvato', sub: 'Chi ha salvato il tuo profilo e i tuoi piani' },
  { icon: Undo2, title: 'Annulla l’ultimo “passo”', sub: 'Quando il dito è più veloce del cuore' },
]

export function Paywall({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const { state, setLifetime } = useStore()
  const [phase, setPhase] = useState<'idle' | 'paying' | 'done'>('idle')
  const [launch, setLaunch] = useState(true)

  useEffect(() => {
    if (open) setPhase(state.lifetime ? 'done' : 'idle')
  }, [open, state.lifetime])

  const price = launch ? '14,99 €' : '19,99 €'

  const buy = () => {
    setPhase('paying')
    window.setTimeout(() => {
      setLifetime(true)
      setPhase('done')
    }, 1400)
  }

  return (
    <Sheet open={open} onClose={onClose} full>
      <AnimatePresence mode="wait">
        {phase === 'done' ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center pt-8 text-center">
            <div className="relative">
              <motion.div className="absolute inset-0 rounded-full bg-brand/40 blur-2xl" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2.4 }} />
              <div className="relative grid size-24 place-items-center rounded-full bg-brand text-ink">
                <Check size={44} strokeWidth={3} />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold">Sei ALONG Forever.</h2>
            <p className="mt-2 max-w-xs text-cream/65">Per sempre. Nessun rinnovo, nessuna sorpresa in estratto conto. Grazie per sostenere un’app indipendente.</p>
            <div className="mt-5">
              <LifetimeBadge />
            </div>
            <ConfettiBurst />
            <Button className="mt-8 w-full" size="lg" onClick={onClose}>
              Torniamo a fare cose
            </Button>
            <div className="mt-6 w-full text-left">
              <RevolutTip />
            </div>
          </motion.div>
        ) : (
          <motion.div key="pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="relative overflow-hidden rounded-2xl bg-forest p-5 text-cream">
              <p className="text-sm font-semibold text-brand">Pay once, own it forever</p>
              <h2 className="mt-1 text-3xl leading-[0.95]">
                ALONG Forever.
              </h2>
              <p className="mt-2 text-base leading-snug text-cream/75">
                {reason ?? 'Niente abbonamenti mensili. Paghi una volta, sblocchi tutto per sempre, come un buon quaderno.'}
              </p>
              <div className="mt-4 flex items-end gap-3">
                <span className="whitespace-nowrap font-display text-3xl font-extrabold leading-none tracking-[-0.04em] tabular-nums">{price}</span>
                <span className="whitespace-nowrap pb-1 text-sm text-cream/60">
                  una tantum{launch && <span className="ml-1.5 line-through">19,99 €</span>}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-md bg-ink/40 px-3 py-2">
                <span className="text-sm text-cream/80">Prezzo di lancio · primi iscritti</span>
                <Toggle checked={launch} onChange={setLaunch} label="Prezzo di lancio" />
              </div>
            </div>

            <ul className="mt-5 grid gap-2">
              {FEATURES.map((f, i) => (
                <motion.li
                  key={f.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-center gap-3 rounded-2xl border border-cream/5 bg-cream/[0.03] p-3"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand">
                    <f.icon size={18} />
                  </span>
                  <div>
                    <p className="text-base font-semibold">{f.title}</p>
                    <p className="text-sm text-cream/50">{f.sub}</p>
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="mt-4 rounded-2xl border border-cream/5 bg-cream/[0.03] p-3 text-sm text-cream/60">
              <p className="flex items-center gap-1.5 font-semibold text-cream/80">
                <ShieldCheck size={14} className="text-cyan" /> Il livello Free resta generoso
              </p>
              <p className="mt-1">Swipe e risposte illimitate, 3 piani attivi, 3 chat, Mappa e Senza Confini. Per sempre gratis.</p>
            </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-dashed border-cream/15 px-3 py-2.5">
                <span className="text-sm text-cream/60">
                  <span className="font-semibold text-cream/85">Demo:</span> simula acquisto avvenuto
                </span>
                <Toggle checked={state.lifetime} onChange={(v) => setLifetime(v)} label="Simula stato Lifetime" tone="gold" />
              </div>

            <div className="sticky bottom-0 -mx-5 -mb-8 mt-2 bg-gradient-to-t from-[#221b16] via-[#221b16] to-transparent px-5 pb-6 pt-6">
              <Button className="w-full" size="lg" onClick={buy} disabled={phase === 'paying'}>
                {phase === 'paying' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Elaborazione…
                  </>
                ) : (
                  <>Sblocca per sempre a {price}</>
                )}
              </Button>
              <p className="mt-2 text-center text-xs text-cream/35">Pagamento simulato · nessun addebito reale in questa demo</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  )
}

function ConfettiBurst() {
  const colors = ['#D7FF66', '#FF806D', '#8B5CF6', '#06B6D4', '#F6F4EF']
  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center" aria-hidden>
      {Array.from({ length: 26 }).map((_, i) => {
        const angle = (i / 26) * Math.PI * 2
        const dist = 90 + (i % 5) * 26
        return (
          <motion.span
            key={i}
            className="absolute size-2 rounded-sm"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + 60, opacity: 0, rotate: 360 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}
