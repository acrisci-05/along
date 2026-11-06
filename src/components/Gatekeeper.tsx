import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { KeyRound, Lock, MessageCircleOff, Sparkles } from 'lucide-react'
import type { Dilemma, User } from '../types'
import type { JoinResult } from '../store/store'
import { Avatar, Button, Sheet } from './ui'

export function GatekeeperSheet({
  open,
  onClose,
  dilemma,
  host,
  context,
  onSubmit,
  onGoChat,
  onManageSlots,
  onUpgrade,
  slotLimit,
  lifetime,
}: {
  open: boolean
  onClose: () => void
  dilemma?: Dilemma
  host?: User
  context: string
  onSubmit: (answer: string) => JoinResult
  onGoChat: (chatId: string) => void
  onManageSlots: () => void
  onUpgrade: () => void
  slotLimit: number
  lifetime: boolean
}) {
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<JoinResult | null>(null)

  useEffect(() => {
    if (open) {
      setAnswer('')
      setError(null)
    }
  }, [open])

  const valid = answer.trim().length >= 3
  const lowEffort = /^(ciao|hey|hola|hi|ehi|ok)[!. ]*$/i.test(answer.trim())

  const submit = () => {
    if (!valid || lowEffort) return
    const r = onSubmit(answer.trim())
    if (r.ok) onGoChat(r.chatId)
    else if (r.reason === 'exists' && r.chatId) onGoChat(r.chatId)
    else setError(r)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Il Gatekeeper">
      {dilemma && host && (
        <AnimatePresence mode="wait">
          {error && !error.ok && error.reason === 'slots' ? (
            <motion.div key="slots" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 pb-2">
              <div className="rounded-3xl border border-gold/30 bg-gold/10 p-4">
                <div className="flex items-center gap-2 text-gold">
                  <Lock size={18} />
                  <p className="font-display font-bold">Focus Mode: {slotLimit}/{slotLimit} slot pieni</p>
                </div>
                <p className="mt-2 text-sm text-cream/75">
                  Su ALONG puoi avere al massimo {slotLimit} conversazioni attive. Meno chat, più piani reali. Fai evolvere una chat, chiudila con eleganza (+15 Karma) oppure espandi gli slot.
                </p>
              </div>
              <Button className="w-full" variant="gold" onClick={onManageSlots}>
                Gestisci i miei slot
              </Button>
              {!lifetime && (
                <Button className="w-full" variant="outline" onClick={onUpgrade}>
                  <Sparkles size={16} /> 5 slot per sempre con ALONG Forever
                </Button>
              )}
            </motion.div>
          ) : error && !error.ok && error.reason === 'full' ? (
            <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-2">
              <p className="rounded-2xl bg-cream/5 p-4 text-sm text-cream/75">La crew è al completo. Salva il piano: se si libera un posto lo vedrai per primo.</p>
              <Button className="w-full" variant="ghost" onClick={onClose}>
                Ok
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <Avatar user={host} size={44} />
                <div className="min-w-0">
                  <p className="text-sm text-cream/55">
                    Per entrare in <span className="font-semibold text-cream">{context}</span>
                  </p>
                  <p className="text-sm text-cream/55">{host.name} chiede di rispondere a:</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl bg-forest p-5 text-cream">
                <KeyRound className="absolute -right-3 -top-3 size-20 text-cream/10" aria-hidden />
                <p className="font-display text-xs font-bold text-cream/60">Il dilemma</p>
                <p className="mt-1.5 font-display text-lg font-bold leading-tight">{dilemma.question}</p>
              </div>
              {dilemma.options && dilemma.options.length > 0 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Risposte rapide">
                  {dilemma.options.map((o) => (
                    <button
                      type="button"
                      key={o}
                      onClick={() => setAnswer(o)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${answer === o ? 'border-brand bg-brand text-ink' : 'border-cream/15 text-cream/80 hover:border-cream/35'}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              <label className="block">
                <span className="sr-only">La tua risposta</span>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={3}
                  maxLength={220}
                  placeholder="Rispondi con sincerità (o con stile)…"
                  className="w-full resize-none rounded-2xl border border-cream/10 bg-ink/70 p-3.5 text-base text-cream placeholder:text-cream/30 focus:border-brand/60 focus:outline-none"
                />
              </label>
              <div className="flex items-center justify-between text-sm text-cream/45">
                <span className="flex items-center gap-1.5">
                  <MessageCircleOff size={13} /> {lowEffort ? 'Un “ciao” non basta. Rispondi al dilemma!' : 'Niente “ciao”: la chat parte dalla tua risposta.'}
                </span>
                <span className="tabular-nums">{answer.length}/220</span>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={!valid || lowEffort}>
                Invia risposta e unisciti
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      )}
    </Sheet>
  )
}
