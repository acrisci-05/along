import { useState } from 'react'
import { motion } from 'motion/react'
import { BellRing, ShieldAlert, Check, Crown, Info, KeyRound, MapPin, Pencil, RotateCcw, Sparkles } from 'lucide-react'
import { useNav } from '../nav'
import { useStore } from '../store/store'
import { cn } from '../lib/utils'
import { isMinor } from '../lib/age'
import { BadgeRow, BestieSticker, earnedBadges, KarmaMeter } from '../components/Bestie'
import { Avatar, Button, Eyebrow, LifetimeBadge, RevolutTip, Sheet, Toggle } from '../components/ui'

export function Profile() {
  const { state, updateMe, setLifetime, reset, simulateIncoming, toast, setPrefs, unblockUser, injectSuspicious } = useStore()
  const nav = useNav()
  const me = state.me
  const minor = isMinor(me)
  const [editing, setEditing] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [draft, setDraft] = useState({ name: me.name, bio: me.bio, dilemma: me.dilemma.question })
  const badges = earnedBadges(state.stats)
  const finish = me.stickerFinish ?? 'paper'

  const save = () => {
    updateMe({ name: draft.name.trim() || me.name, bio: draft.bio.trim(), dilemma: { question: draft.dilemma.trim() || me.dilemma.question, options: [] } })
    setEditing(false)
    toast({ tone: 'lime', title: 'Profilo aggiornato' })
  }

  return (
    <div className="space-y-5 pb-8">
      {/* identity */}
      <section className="relative overflow-hidden rounded-3xl border border-cream/10 bg-surface p-5">
        <div className="flex items-start gap-4">
          <div className={cn('rounded-full p-[3px]', state.lifetime ? 'bg-brand' : 'bg-cream/10')}>
            <div className="rounded-full bg-ink p-[3px]">
              <Avatar user={me} size={78} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight">
              {me.name}, {me.age}
            </h1>
            <p className="flex items-center gap-1 text-sm text-cream/55">
              <MapPin size={13} /> {me.city}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">{state.lifetime && <LifetimeBadge small />}</div>
          </div>
          <button
            onClick={() => {
              setDraft({ name: me.name, bio: me.bio, dilemma: me.dilemma.question })
              setEditing(true)
            }}
            className="grid size-10 place-items-center rounded-full bg-cream/5 hover:bg-cream/10"
            aria-label="Modifica profilo"
          >
            <Pencil size={16} />
          </button>
        </div>
        {me.bio ? (
          <p className="mt-3 text-base leading-snug text-cream/80">{me.bio}</p>
        ) : (
          <button
            onClick={() => {
              setDraft({ name: me.name, bio: me.bio, dilemma: me.dilemma.question })
              setEditing(true)
            }}
            className="mt-3 text-left text-sm text-muted underline-offset-2 hover:underline"
          >
            Aggiungi due righe su di te
          </button>
        )}
        <div className="mt-3">
          <BadgeRow badges={badges} />
        </div>
      </section>

      {/* gatekeeper */}
      <section className="rounded-3xl bg-forest p-4 text-cream">
        <p className="flex items-center gap-1.5 font-display text-xs font-bold text-cream/60">
          <KeyRound size={13} /> Il tuo dilemma Gatekeeper
        </p>
        <p className="mt-1 font-display text-lg font-bold leading-tight">{me.dilemma.question}</p>
        <p className="mt-2 text-sm text-cream/60">Chi vuole scriverti deve prima rispondere. Mai più “ciao” a vuoto.</p>
      </section>

      <section className="glass space-y-3 rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">Cosa cerchi</p>
          <span className="text-xs text-cream/45">visibile sulla tua card</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['date', '💘 Date', 'bg-brand text-ink'],
              ['friends', '🤝 Amici', 'bg-brand text-ink'],
            ] as const
          ).map(([k, l, on]) => {
            const active = me.intent.includes(k)
            return (
              <button
                key={k}
                aria-pressed={active}
                disabled={minor && k === 'date'}
                onClick={() => {
                  const next = active ? me.intent.filter((i) => i !== k) : [...me.intent, k]
                  if (next.length) updateMe({ intent: next })
                }}
                className={cn('h-11 rounded-2xl text-sm font-semibold transition disabled:opacity-40', active ? on : 'border border-cream/10 text-cream/55')}
              >
                {l}
              </button>
            )
          })}
        </div>
        {minor && <p className="text-sm text-gold">Hai {me.age} anni: fino ai 18 anni ALONG è solo per nuove amicizie, con persone di 16 e 17 anni.</p>}
        <button onClick={() => nav.setTab('plans')} className="flex w-full items-center justify-between rounded-2xl bg-cream/[0.04] px-3 py-2.5 text-left hover:bg-cream/[0.08]">
          <span>
            <span className="block text-sm font-semibold">I miei piani</span>
            <span className="block text-xs text-cream/50">Quello che proponi appare sulla tua card</span>
          </span>
          <span className="text-sm font-semibold text-brand">Apri →</span>
        </button>
      </section>

      <KarmaMeter karma={me.karma} stats={state.stats} />

      {/* bestie */}
      <section>
        <div className="flex items-center justify-between">
          <Eyebrow>Bestie Vouching</Eyebrow>
          <div className="flex gap-1" role="radiogroup" aria-label="Finitura sticker">
            {(['paper', 'holo', 'neon'] as const).map((f) => {
              const locked = f !== 'paper' && !state.lifetime
              return (
                <button
                  key={f}
                  role="radio"
                  aria-checked={finish === f}
                  onClick={() => (locked ? nav.openPaywall('Le finiture olografiche e neon dello sticker Bestie sono incluse in ALONG Forever.') : updateMe({ stickerFinish: f }))}
                  className={cn('h-7 rounded-md px-2.5 text-xs font-semibold capitalize', finish === f ? 'bg-cream text-ink' : 'bg-cream/5 text-cream/60')}
                >
                  {locked && '🔒 '}
                  {f === 'paper' ? 'Carta' : f}
                </button>
              )
            })}
          </div>
        </div>
        {me.bestie ? (
          <BestieSticker vouch={me.bestie} name={me.name} finish={finish} onShare={() => toast({ tone: 'violet', title: 'Link per il bestie pronto', body: 'Incollalo nella chat col tuo migliore amico.' })} />
        ) : (
          <div className="mt-2 rounded-2xl border border-dashed border-line p-4">
            <p className="text-base font-semibold">Il tuo sticker è ancora vuoto</p>
            <p className="mt-1 text-sm text-muted">Chiedi al tuo migliore amico di scrivere il tuo peggior difetto al primo incontro, perché uscirci comunque e la tua red flag innocua. Si vede solo dopo il match.</p>
            <button
              onClick={async () => {
                const url = `${location.origin}${location.pathname}#vouch/${encodeURIComponent(me.name.toLowerCase())}`
                try {
                  if (navigator.share) await navigator.share({ title: 'Recensiscimi su ALONG', url })
                  else await navigator.clipboard.writeText(url)
                } catch {
                  /* cancelled */
                }
                toast({ tone: 'violet', title: 'Link per il bestie pronto', body: 'Mandalo al tuo migliore amico.' })
              }}
              className="mt-3 h-10 rounded-full border border-line px-4 text-sm font-semibold hover:border-cream/40"
            >
              Chiedi al tuo bestie
            </button>
          </div>
        )}
      </section>

      {/* interests */}
      <section className="space-y-3">
        <div>
          <Eyebrow>Passioni</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {!me.interests.length && <p className="text-sm text-muted">Nessuna passione ancora. Le aggiungerai presto dal profilo.</p>}
            {me.interests.map((i) => (
              <span key={i} className="rounded-md border border-violet/30 bg-violet/10 px-2.5 py-1 text-sm text-violet">
                {i}
              </span>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow>Habitat dichiarati</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {!me.habitats.length && <p className="text-sm text-muted">Nessun Habitat ancora.</p>}
            {me.habitats.map((h) => (
              <span key={h} className="rounded-md border border-cyan/30 bg-cyan/10 px-2.5 py-1 text-sm text-cyan">
                📍 {h}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* forever */}
      {state.lifetime ? (
        <section className="rounded-3xl border border-brand/25 bg-brand/5 p-4">
          <p className="flex items-center gap-2 font-display font-bold">
            <Crown size={18} className="text-brand" /> ALONG Forever attivo
          </p>
          <p className="mt-1 text-sm text-cream/60">Piani illimitati, 5 slot chat, Travel Bridge illimitato e finiture sticker premium. Per sempre.</p>
        </section>
      ) : (
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => nav.openPaywall()} className="relative w-full overflow-hidden rounded-3xl bg-forest text-cream p-4 text-left">
          <Sparkles className="absolute right-4 top-4 text-brand" size={20} />
          <p className="text-sm font-semibold text-brand">Pay once, forever</p>
          <p className="mt-1 font-display text-xl font-extrabold">Sblocca ALONG Forever</p>
          <p className="mt-1 text-sm text-cream/75">19,99 € una tantum (14,99 € al lancio). Niente abbonamenti, mai.</p>
        </motion.button>
      )}

      <RevolutTip />

      {/* blocked people */}
      <section className="space-y-2">
        <Eyebrow>Persone bloccate</Eyebrow>
        {state.blocked.length ? (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {state.blocked.map((id) => {
              const u = state.users[id]
              if (!u) return null
              const reported = state.reports.some((r) => r.userId === id)
              return (
                <li key={id} className="flex items-center gap-3 p-3">
                  <Avatar user={u} size={36} blur />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-muted">{reported ? 'Bloccat* e segnalat*' : 'Bloccat*'}</p>
                  </div>
                  <button
                    onClick={() => {
                      unblockUser(id)
                      toast({ tone: 'cyan', title: `${u.name} sbloccat*`, body: 'Potrete di nuovo vedervi su ALONG.' })
                    }}
                    className="h-9 rounded-full border border-line px-3.5 text-sm font-semibold hover:border-cream/40"
                  >
                    Sblocca
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-line bg-surface p-3.5 text-sm text-muted">Non hai bloccato nessuno. Puoi bloccare o segnalare dal profilo di una persona, dalla sua card o dal menu della chat.</p>
        )}
      </section>

      {/* chat privacy */}
      <section className="space-y-2">
        <Eyebrow>Privacy in chat</Eyebrow>
        <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <p className="text-base font-semibold">Conferme di lettura</p>
              <p className="text-sm text-muted">Se le disattivi, non vedi nemmeno le conferme degli altri.</p>
            </div>
            <Toggle checked={state.prefs.readReceipts !== false} onChange={(v) => setPrefs({ readReceipts: v })} label="Conferme di lettura" />
          </div>
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <p className="text-base font-semibold">Mostra quando sto scrivendo</p>
              <p className="text-sm text-muted">Se lo disattivi, non vedi nemmeno quando scrivono gli altri.</p>
            </div>
            <Toggle checked={state.prefs.typingIndicator !== false} onChange={(v) => setPrefs({ typingIndicator: v })} label="Mostra quando sto scrivendo" />
          </div>
        </div>
      </section>

      {/* settings */}
      <section className="space-y-2">
        <Eyebrow>Impostazioni demo</Eyebrow>
        <div className="glass divide-y divide-cream/5 rounded-3xl">
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <p className="text-base font-semibold">Stato Lifetime (simulato)</p>
              <p className="text-sm text-cream/50">Attiva/disattiva ALONG Forever nel localStorage</p>
            </div>
            <Toggle checked={state.lifetime} onChange={setLifetime} label="Stato Lifetime" tone="gold" />
          </div>
          <button onClick={simulateIncoming} className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-cream/[0.03]">
            <div>
              <p className="text-base font-semibold">Simula richiesta in arrivo</p>
              <p className="text-sm text-cream/50">Qualcuno risponde al dilemma di un tuo piano</p>
            </div>
            <BellRing size={18} className="text-violet" />
          </button>
          <button onClick={injectSuspicious} className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-cream/[0.03]">
            <div>
              <p className="text-base font-semibold">Simula un messaggio sospetto</p>
              <p className="text-sm text-muted">Arriva una richiesta di soldi in una chat attiva, per vedere l’avviso</p>
            </div>
            <ShieldAlert size={18} className="text-gold" />
          </button>
          <button onClick={() => setConfirmReset(true)} className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-cream/[0.03]">
            <div>
              <p className="text-base font-semibold text-brand">Ripristina Dati Demo</p>
              <p className="text-sm text-cream/50">Riporta piani, chat e karma allo stato iniziale</p>
            </div>
            <RotateCcw size={18} className="text-brand" />
          </button>
        </div>
        <p className="flex items-start gap-1.5 px-1 text-xs text-cream/40">
          <Info size={13} className="mt-0.5 shrink-0" /> Tutti i dati vivono solo nel tuo browser (localStorage). Nessun server, nessun tracciamento GPS.
        </p>
      </section>

      <footer className="pt-2 text-center">
        <p className="font-display text-sm font-bold tracking-[0.3em] text-cream/60">ALONG</p>
        <p className="text-xs text-cream/35">Less scrolling. More doing. Find your people.</p>
      </footer>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Modifica profilo">
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-cream/60">Nome</span>
            <input value={draft.name} maxLength={24} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-cream/10 bg-ink/70 px-3.5 focus:border-brand/60 focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-cream/60">Bio</span>
            <textarea value={draft.bio} rows={3} maxLength={160} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} className="mt-1 w-full resize-none rounded-2xl border border-cream/10 bg-ink/70 p-3.5 focus:border-brand/60 focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-cream/60">Il tuo dilemma Gatekeeper</span>
            <textarea value={draft.dilemma} rows={2} maxLength={140} onChange={(e) => setDraft({ ...draft, dilemma: e.target.value })} className="mt-1 w-full resize-none rounded-2xl border border-cream/10 bg-ink/70 p-3.5 focus:border-brand/60 focus:outline-none" />
          </label>
          <Button className="w-full" onClick={save}>
            <Check size={16} /> Salva
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Ripristinare i dati demo?">
        <p className="text-sm text-cream/65">Piani creati, messaggi, karma e stato Lifetime verranno riportati allo stato iniziale. L’operazione non è reversibile.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Annulla
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              reset()
              setConfirmReset(false)
            }}
          >
            Ripristina
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
