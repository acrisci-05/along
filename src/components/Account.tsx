import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, LogOut, Mail, RefreshCw, Trash2, WifiOff } from 'lucide-react'
import { useStore, type Account } from '../store/store'
import { Button, Eyebrow, Sheet } from './ui'
import { ClapMark } from './Brand'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Email → 6-digit code. The same flow creates the account or signs you back in. */
export function SignIn({ account, intent = 'signup', onBack }: { account: Account; intent?: 'signup' | 'login'; onBack: () => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState(account.email ?? '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const send = async () => {
    if (!EMAIL_RE.test(email.trim()) || busy) return
    setBusy(true)
    setError(null)
    const err = await account.sendCode(email)
    setBusy(false)
    if (err) setError(err)
    else {
      setStep('code')
      setCode('')
      setWait(60)
    }
  }

  const verify = async () => {
    if (code.length < 6 || busy) return
    setBusy(true)
    setError(null)
    const err = await account.verifyCode(code)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="flex min-h-full flex-col pt-[max(16px,env(safe-area-inset-top))] md:pt-11">
      <button onClick={() => (step === 'code' ? setStep('email') : onBack())} className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-surface" aria-label="Indietro">
        <ArrowLeft size={20} />
      </button>

      {step === 'email' ? (
        <form
          className="mt-4 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <h2 className="text-2xl">{intent === 'login' ? 'Bentornat*' : 'Crea il tuo account'}</h2>
          <p className="mt-1 text-sm text-muted">Scrivi la tua email: ti mandiamo un link per entrare. Niente password da ricordare.</p>
          <label className="mt-6 block">
            <span className="text-sm font-semibold">Email</span>
            <input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.it"
              className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base placeholder:text-cream/30 focus:border-brand focus:outline-none"
            />
          </label>
          {(error ?? account.notice) && (
            <p role="alert" className="mt-3 text-sm text-alarm">
              {error ?? account.notice}
            </p>
          )}
          <div className="mt-auto pt-8">
            <Button type="submit" size="lg" className="w-full rounded-full" disabled={!EMAIL_RE.test(email.trim()) || busy}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} Mandami il codice
            </Button>
            <p className="mt-3 text-center text-xs text-muted">Continuando accetti le regole della community: rispetto, niente ghosting, niente minori di 16 anni.</p>
          </div>
        </form>
      ) : (
        <form
          className="mt-4 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            void verify()
          }}
        >
          <h2 className="text-2xl">Controlla la posta</h2>
          <p className="mt-1 text-sm text-muted">
            Abbiamo scritto a <span className="font-semibold text-cream">{email.trim().toLowerCase()}</span>. Apri l’email su questo dispositivo e tocca il link per entrare, oppure scrivi qui il codice se c’è. Se non la trovi, guarda nello spam.
          </p>
          <label className="mt-6 block">
            <span className="text-sm font-semibold">Codice (se presente nell’email)</span>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Codice"
              aria-label="Codice ricevuto per email"
              className="mt-1.5 h-14 w-full rounded-xl border border-line bg-surface px-4 text-center text-2xl font-bold tracking-[0.4em] tabular-nums placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-cream/25 focus:border-brand focus:outline-none"
            />
          </label>
          {error && (
            <p role="alert" className="mt-3 text-sm text-alarm">
              {error}
            </p>
          )}
          <button type="button" onClick={() => void send()} disabled={wait > 0 || busy} className="mt-4 w-fit text-sm font-semibold text-brand disabled:text-muted">
            {wait > 0 ? `Nuova email tra ${wait} s` : 'Mandami una nuova email'}
          </button>
          <div className="mt-auto pt-8">
            <Button type="submit" size="lg" className="w-full rounded-full" disabled={code.length < 6 || busy}>
              {busy && <Loader2 size={18} className="animate-spin" />} Entra
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export function Splash() {
  return (
    <div className="grid min-h-full place-items-center" aria-busy="true" aria-label="Caricamento">
      <div className="flex flex-col items-center">
        <ClapMark mode="loop" size={84} />
        <p className="mt-3 text-2xl font-extrabold tracking-[-0.05em] text-cream">along</p>
      </div>
    </div>
  )
}

export function Offline({ account }: { account: Account }) {
  return (
    <div className="grid min-h-full place-items-center text-center">
      <div>
        <WifiOff size={28} className="mx-auto text-muted" />
        <p className="mt-3 text-xl font-bold">Non riesco a collegarmi</p>
        <p className="mt-1 text-sm text-muted">Controlla la connessione e riprova.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={account.retry}>
            <RefreshCw size={16} /> Riprova
          </Button>
          <Button variant="outline" onClick={() => void account.signOut()}>
            Esci
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Profile → Account: who you're signed in as, sign out, delete everything. */
export function AccountSection() {
  const { account } = useStore()
  const [confirm, setConfirm] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState<null | 'out' | 'delete'>(null)
  const [error, setError] = useState<string | null>(null)
  if (!account) return null

  return (
    <section className="space-y-2">
      <Eyebrow>Account</Eyebrow>
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
        <div className="p-3.5">
          <p className="text-sm text-muted">Accesso con</p>
          <p className="truncate text-base font-semibold">{account.email ?? '—'}</p>
        </div>
        <button
          onClick={async () => {
            setBusy('out')
            await account.signOut()
            setBusy(null)
          }}
          disabled={!!busy}
          className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-cream/[0.03]"
        >
          <span className="text-base font-semibold">Esci</span>
          {busy === 'out' ? <Loader2 size={18} className="animate-spin text-muted" /> : <LogOut size={18} className="text-muted" />}
        </button>
        <button onClick={() => setConfirm(true)} className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-cream/[0.03]">
          <span>
            <span className="block text-base font-semibold text-alarm">Elimina account</span>
            <span className="block text-sm text-muted">Profilo, foto, like, chat e vocali spariscono subito</span>
          </span>
          <Trash2 size={18} className="text-alarm" />
        </button>
      </div>

      <Sheet
        open={confirm}
        onClose={() => {
          if (busy) return
          setConfirm(false)
          setTyped('')
          setError(null)
        }}
        title="Eliminare l’account?"
      >
        <p className="text-sm text-cream/70">
          Cancelliamo subito profilo, foto, like, messaggi e vocali. Le persone con cui parlavi vedranno la chat chiusa. Non si può annullare.
        </p>
        <label className="mt-4 block">
          <span className="text-sm font-semibold">
            Per confermare scrivi <span className="text-alarm">ELIMINA</span>
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base focus:border-alarm focus:outline-none"
          />
        </label>
        {error && (
          <p role="alert" className="mt-2 text-sm text-alarm">
            {error}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" disabled={!!busy} onClick={() => setConfirm(false)}>
            Annulla
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={typed.trim().toUpperCase() !== 'ELIMINA' || !!busy}
            onClick={async () => {
              setBusy('delete')
              setError(null)
              const err = await account.deleteAccount()
              if (err) {
                setError(err)
                setBusy(null)
              }
            }}
          >
            {busy === 'delete' && <Loader2 size={16} className="animate-spin" />} Elimina per sempre
          </Button>
        </div>
      </Sheet>
    </section>
  )
}
