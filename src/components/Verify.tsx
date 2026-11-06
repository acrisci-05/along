import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, Camera, CheckCircle2, IdCard, Loader2, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import type { User } from '../types'
import { isMinor } from '../lib/age'
import { GESTURES, isVerified } from '../lib/verify'
import { useStore } from '../store/store'
import { Button } from './ui'

export function VerifiedBadge({ user, size = 16 }: { user: User; size?: number }) {
  if (!isVerified(user)) return null
  return <BadgeCheck size={size} className="inline-block shrink-0 align-[-2px] text-brand" aria-label="Profilo verificato" role="img" />
}

/** 16-17 must be verified before chatting / answering. */
export function useNeedsVerification() {
  const { state } = useStore()
  return isMinor(state.me) && !isVerified(state.me)
}

type Step = 'intro' | 'selfie' | 'document' | 'checking' | 'done' | 'nophotos'

export function VerifyFlow({ open, reason, onClose }: { open: boolean; reason?: string; onClose: () => void }) {
  const host = typeof document !== 'undefined' ? document.getElementById('phone-root') : null
  if (!open || !host) return null
  return createPortal(<Flow reason={reason} onClose={onClose} />, host)
}

/** Camera capture with upload fallback. Frames are kept only in memory and dropped after the check. */
function Capture({ facing, mirrored, overlay, onShot }: { facing: 'user' | 'environment'; mirrored: boolean; overlay?: React.ReactNode; onShot: (dataUrl: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [state, setState] = useState<'starting' | 'live' | 'nocamera'>('starting')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera')
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 720 } }, audio: false })
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          await video.current.play().catch(() => {})
        }
        setState('live')
      } catch {
        if (!cancelled) setState('nocamera')
      }
    })()
    return () => {
      cancelled = true
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
  }, [facing])

  const shoot = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = 480
    c.height = Math.round((480 * v.videoHeight) / v.videoWidth)
    const ctx = c.getContext('2d')!
    if (mirrored) {
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0, c.width, c.height)
    onShot(c.toDataURL('image/jpeg', 0.7))
  }

  const fromFile = (f?: File) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => onShot(String(r.result))
    r.readAsDataURL(f)
  }

  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[17rem] overflow-hidden rounded-2xl bg-surface">
        <video ref={video} playsInline muted className="h-full w-full object-cover" style={mirrored ? { transform: 'scaleX(-1)' } : undefined} aria-label="Anteprima della fotocamera" />
        {state === 'starting' && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {state === 'nocamera' && (
          <div className="absolute inset-0 grid place-items-center p-5 text-center text-sm text-muted">Fotocamera non disponibile o permesso negato. Puoi caricare una foto scattata ora.</div>
        )}
        {overlay}
      </div>
      <div className="mt-4 grid gap-2">
        {state === 'live' && (
          <Button size="lg" className="w-full rounded-full" onClick={shoot}>
            <Camera size={18} /> Scatta
          </Button>
        )}
        <button onClick={() => fileRef.current?.click()} className="flex h-11 items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold hover:border-cream/40">
          <Upload size={16} /> Carica una foto
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture={facing === 'user' ? 'user' : 'environment'} className="sr-only" aria-label="Carica una foto per la verifica" onChange={(e) => fromFile(e.target.files?.[0])} />
      </div>
    </div>
  )
}

function Flow({ reason, onClose }: { reason?: string; onClose: () => void }) {
  const { state, verifyMe, toast } = useStore()
  const minor = isMinor(state.me)
  const hasPhotos = (state.me.photos?.length ?? 0) > 0
  const gesture = useMemo(() => GESTURES[Math.floor(Math.random() * GESTURES.length)], [])
  const [step, setStep] = useState<Step>(hasPhotos ? 'intro' : 'nophotos')
  const [selfie, setSelfie] = useState<string | null>(null)
  const [doc, setDoc] = useState<string | null>(null)
  const [phase, setPhase] = useState(0)

  const checks = ['Confronto con le tue foto', `Controllo del gesto: ${gesture.text.toLowerCase()}`, ...(minor ? ['Lettura della data di nascita dal documento'] : [])]

  useEffect(() => {
    if (step !== 'checking') return
    setPhase(0)
    const timers = checks.map((_, i) => window.setTimeout(() => setPhase(i + 1), 900 * (i + 1)))
    const done = window.setTimeout(() => {
      verifyMe()
      // selfie and document are discarded right away
      setSelfie(null)
      setDoc(null)
      setStep('done')
    }, 900 * checks.length + 600)
    return () => [...timers, done].forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const close = () => {
    setSelfie(null)
    setDoc(null)
    onClose()
  }

  const totalSteps = minor ? 3 : 2
  const stepNo = step === 'selfie' ? 1 : step === 'document' ? 2 : step === 'checking' ? totalSteps : 0

  return (
    <motion.div className="absolute inset-0 z-[70] flex flex-col bg-ink" initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 320 }} role="dialog" aria-modal="true" aria-label="Verifica il profilo">
      <header className="flex items-center justify-between border-b border-line px-3 pb-2.5 pt-[max(12px,env(safe-area-inset-top))] md:pt-10">
        <button onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-surface" aria-label="Chiudi verifica">
          <X size={20} />
        </button>
        <h2 className="text-lg">Verifica il profilo</h2>
        <span className="w-10 text-right text-sm tabular-nums text-muted">{stepNo ? `${stepNo}/${totalSteps}` : ''}</span>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
            {step === 'nophotos' && (
              <div className="text-center">
                <ShieldCheck size={40} className="mx-auto text-brand" />
                <h3 className="mt-3 text-2xl">Prima servono le tue foto</h3>
                <p className="mt-2 text-sm text-muted">La verifica confronta un selfie con le foto del profilo. Con l’avatar illustrato non c’è niente da confrontare: aggiungi almeno 2 foto da “Modifica profilo”, poi torna qui.</p>
                <Button className="mt-6 w-full rounded-full" onClick={close}>
                  Ho capito
                </Button>
              </div>
            )}

            {step === 'intro' && (
              <div>
                <BadgeCheck size={40} className="text-brand" />
                <h3 className="mt-3 text-2xl">Dimostra che sei tu</h3>
                {reason && <p className="mt-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold">{reason}</p>}
                <ul className="mt-4 space-y-3 text-base">
                  <li className="flex gap-3">
                    <Camera size={20} className="mt-0.5 shrink-0 text-muted" /> Scatti un selfie facendo un gesto che ti mostriamo.
                  </li>
                  {minor && (
                    <li className="flex gap-3">
                      <IdCard size={20} className="mt-0.5 shrink-0 text-muted" /> Fotografi un documento d’identità per confermare la data di nascita (obbligatorio sotto i 18 anni).
                    </li>
                  )}
                  <li className="flex gap-3">
                    <Trash2 size={20} className="mt-0.5 shrink-0 text-muted" /> {minor ? 'Selfie e documento vengono cancellati' : 'Il selfie viene cancellato'} subito dopo il controllo. Resta solo la spunta e la data.
                  </li>
                  <li className="flex gap-3">
                    <BadgeCheck size={20} className="mt-0.5 shrink-0 text-muted" /> Ottieni la spunta accanto al nome e compari a chi filtra “solo verificati”.
                  </li>
                </ul>
                <p className="mt-4 text-xs text-muted">Demo: le foto vengono scattate davvero, ma il controllo è simulato.</p>
                <Button size="lg" className="mt-6 w-full rounded-full" onClick={() => setStep('selfie')}>
                  Inizia
                </Button>
              </div>
            )}

            {step === 'selfie' && (
              <div>
                <h3 className="text-xl">Copia questo gesto</h3>
                <p className="mt-1 flex items-center gap-2 text-base">
                  <span className="text-3xl" aria-hidden>
                    {gesture.icon}
                  </span>
                  {gesture.text}
                </p>
                <div className="mt-4">
                  {selfie ? (
                    <div>
                      <img src={selfie} alt="Il tuo selfie" className="mx-auto aspect-[3/4] w-full max-w-[17rem] rounded-2xl object-cover" />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button variant="ghost" onClick={() => setSelfie(null)}>
                          Rifai
                        </Button>
                        <Button onClick={() => setStep(minor ? 'document' : 'checking')}>Usa questo</Button>
                      </div>
                    </div>
                  ) : (
                    <Capture
                      facing="user"
                      mirrored
                      onShot={setSelfie}
                      overlay={<div className="pointer-events-none absolute inset-[12%] rounded-[50%] border-2 border-dashed border-cream/50" aria-hidden />}
                    />
                  )}
                </div>
              </div>
            )}

            {step === 'document' && (
              <div>
                <h3 className="text-xl">Il tuo documento</h3>
                <p className="mt-1 text-sm text-muted">Carta d’identità, passaporto o patente: il lato con la foto e la data di nascita. Leggiamo solo la data, poi lo cancelliamo.</p>
                <div className="mt-4">
                  {doc ? (
                    <div>
                      <img src={doc} alt="Il tuo documento" className="mx-auto aspect-[3/4] w-full max-w-[17rem] rounded-2xl object-cover" />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button variant="ghost" onClick={() => setDoc(null)}>
                          Rifai
                        </Button>
                        <Button onClick={() => setStep('checking')}>Usa questo</Button>
                      </div>
                    </div>
                  ) : (
                    <Capture facing="environment" mirrored={false} onShot={setDoc} overlay={<div className="pointer-events-none absolute inset-x-[8%] inset-y-[30%] rounded-xl border-2 border-dashed border-cream/50" aria-hidden />} />
                  )}
                </div>
              </div>
            )}

            {step === 'checking' && (
              <div className="pt-6" aria-live="polite">
                <h3 className="text-xl">Controllo in corso…</h3>
                <ul className="mt-5 space-y-3">
                  {checks.map((c, i) => (
                    <li key={c} className="flex items-center gap-3 text-base">
                      {phase > i ? <CheckCircle2 size={20} className="text-brand" /> : <Loader2 size={20} className="animate-spin text-muted" />}
                      <span className={phase > i ? 'text-cream' : 'text-muted'}>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 'done' && (
              <div className="pt-6 text-center">
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
                  <BadgeCheck size={64} className="mx-auto text-brand" />
                </motion.div>
                <h3 className="mt-4 text-2xl">Profilo verificato</h3>
                <p className="mt-2 text-sm text-muted">Da ora c’è la spunta accanto al tuo nome. {minor ? 'Selfie e documento sono stati cancellati.' : 'Il selfie è stato cancellato.'}</p>
                <p className="mt-1 text-xs text-muted">Se cambi la foto principale, ti chiederemo un nuovo selfie.</p>
                <Button
                  size="lg"
                  className="mt-6 w-full rounded-full"
                  onClick={() => {
                    toast({ tone: 'lime', title: 'Verifica completata', body: 'La spunta è sul tuo profilo.' })
                    close()
                  }}
                >
                  Fatto
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
