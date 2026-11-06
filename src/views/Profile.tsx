import { useState } from 'react'
import { motion } from 'motion/react'
import { BellRing, Check, Crown, Info, KeyRound, MapPin, Pencil, RotateCcw, Sparkles } from 'lucide-react'
import { useNav } from '../nav'
import { useStore } from '../store/store'
import { cn } from '../lib/utils'
import { BadgeRow, BestieSticker, earnedBadges, KarmaMeter } from '../components/Bestie'
import { Avatar, Button, Eyebrow, LifetimeBadge, RevolutTip, Sheet, Toggle } from '../components/ui'

export function Profile() {
  const { state, updateMe, setLifetime, reset, simulateIncoming, toast } = useStore()
  const nav = useNav()
  const me = state.me
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
      <section className="relative overflow-hidden rounded-[28px] border border-cream/10 bg-[radial-gradient(circle_at_80%_0%,rgb(215_255_102/0.18),transparent_50%),radial-gradient(circle_at_0%_100%,rgb(139_92_246/0.25),transparent_55%)] p-5">
        <div className="flex items-start gap-4">
          <div className={cn('rounded-full p-[3px]', state.lifetime ? 'bg-[conic-gradient(from_0deg,var(--color-lime),var(--color-cyan),var(--color-violet),var(--color-coral),var(--color-lime))]' : 'bg-cream/10')}>
            <div className="rounded-full bg-ink p-[3px]">
              <Avatar user={me} size={78} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] font-bold leading-tight">
              {me.name}, {me.age}
            </h1>
            <p className="flex items-center gap-1 text-[13px] text-cream/55">
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
        <p className="mt-3 text-[14px] leading-snug text-cream/80">{me.bio}</p>
        <div className="mt-3">
          <BadgeRow badges={badges} />
        </div>
      </section>

      {/* gatekeeper */}
      <section className="rounded-3xl bg-lime p-4 text-ink">
        <p className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-ink/60">
          <KeyRound size={13} /> Il tuo dilemma Gatekeeper
        </p>
        <p className="mt-1 font-display text-[19px] font-bold leading-tight">{me.dilemma.question}</p>
        <p className="mt-2 text-[12px] text-ink/60">Chi vuole scriverti deve prima rispondere. Mai più “ciao” a vuoto.</p>
      </section>

      <section className="glass space-y-3 rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold">Cosa cerchi</p>
          <span className="text-[11.5px] text-cream/45">visibile sulla tua card</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['date', '💘 Date', 'bg-coral text-ink'],
              ['friends', '🤝 Amici', 'bg-lime text-ink'],
            ] as const
          ).map(([k, l, on]) => {
            const active = me.intent.includes(k)
            return (
              <button
                key={k}
                aria-pressed={active}
                onClick={() => {
                  const next = active ? me.intent.filter((i) => i !== k) : [...me.intent, k]
                  if (next.length) updateMe({ intent: next })
                }}
                className={cn('h-11 rounded-2xl text-[13.5px] font-semibold transition', active ? on : 'border border-cream/10 text-cream/55')}
              >
                {l}
              </button>
            )
          })}
        </div>
        <button onClick={() => nav.setTab('plans')} className="flex w-full items-center justify-between rounded-2xl bg-cream/[0.04] px-3 py-2.5 text-left hover:bg-cream/[0.08]">
          <span>
            <span className="block text-[13.5px] font-semibold">I miei piani</span>
            <span className="block text-[11.5px] text-cream/50">Quello che proponi appare sulla tua card</span>
          </span>
          <span className="text-[12px] font-semibold text-lime">Apri →</span>
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
                  className={cn('h-7 rounded-full px-2.5 text-[11px] font-semibold capitalize', finish === f ? 'bg-cream text-ink' : 'bg-cream/5 text-cream/60')}
                >
                  {locked && '🔒 '}
                  {f === 'paper' ? 'Carta' : f}
                </button>
              )
            })}
          </div>
        </div>
        {me.bestie && <BestieSticker vouch={me.bestie} name={me.name} finish={finish} onShare={() => toast({ tone: 'violet', title: 'Link per il bestie pronto', body: 'Incollalo nella chat col tuo migliore amico.' })} />}
      </section>

      {/* interests */}
      <section className="space-y-3">
        <div>
          <Eyebrow>Passioni</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {me.interests.map((i) => (
              <span key={i} className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-1 text-[12.5px] text-violet-200">
                {i}
              </span>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow>Habitat dichiarati</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {me.habitats.map((h) => (
              <span key={h} className="rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-1 text-[12.5px] text-cyan">
                📍 {h}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* forever */}
      {state.lifetime ? (
        <section className="rounded-3xl border border-lime/25 bg-lime/5 p-4">
          <p className="flex items-center gap-2 font-display font-bold">
            <Crown size={18} className="text-lime" /> ALONG Forever attivo
          </p>
          <p className="mt-1 text-[13px] text-cream/60">Piani illimitati, 5 slot chat, Travel Bridge illimitato e finiture sticker premium. Per sempre.</p>
        </section>
      ) : (
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => nav.openPaywall()} className="relative w-full overflow-hidden rounded-3xl border border-violet/40 bg-[linear-gradient(135deg,rgb(139_92_246/0.35),rgb(6_182_212/0.15))] p-4 text-left">
          <Sparkles className="absolute right-4 top-4 text-lime" size={20} />
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-lime">Pay once · Forever</p>
          <p className="mt-1 font-display text-[20px] font-bold">Sblocca ALONG Forever</p>
          <p className="mt-1 text-[13px] text-cream/70">19,99 € una tantum (14,99 € al lancio). Niente abbonamenti, mai.</p>
        </motion.button>
      )}

      <RevolutTip />

      {/* settings */}
      <section className="space-y-2">
        <Eyebrow>Impostazioni demo</Eyebrow>
        <div className="glass divide-y divide-cream/5 rounded-3xl">
          <div className="flex items-center justify-between gap-3 p-3.5">
            <div>
              <p className="text-[14px] font-semibold">Stato Lifetime (simulato)</p>
              <p className="text-[12px] text-cream/50">Attiva/disattiva ALONG Forever nel localStorage</p>
            </div>
            <Toggle checked={state.lifetime} onChange={setLifetime} label="Stato Lifetime" tone="gold" />
          </div>
          <button onClick={simulateIncoming} className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-cream/[0.03]">
            <div>
              <p className="text-[14px] font-semibold">Simula richiesta in arrivo</p>
              <p className="text-[12px] text-cream/50">Qualcuno risponde al dilemma di un tuo piano</p>
            </div>
            <BellRing size={18} className="text-violet-300" />
          </button>
          <button onClick={() => setConfirmReset(true)} className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-cream/[0.03]">
            <div>
              <p className="text-[14px] font-semibold text-coral">Ripristina Dati Demo</p>
              <p className="text-[12px] text-cream/50">Riporta piani, chat e karma allo stato iniziale</p>
            </div>
            <RotateCcw size={18} className="text-coral" />
          </button>
        </div>
        <p className="flex items-start gap-1.5 px-1 text-[11.5px] text-cream/40">
          <Info size={13} className="mt-0.5 shrink-0" /> Tutti i dati vivono solo nel tuo browser (localStorage). Nessun server, nessun tracciamento GPS.
        </p>
      </section>

      <footer className="pt-2 text-center">
        <p className="font-display text-[13px] font-bold tracking-[0.3em] text-cream/60">ALONG</p>
        <p className="text-[11.5px] text-cream/35">Less scrolling. More doing. Find your people.</p>
      </footer>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Modifica profilo">
        <div className="space-y-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-cream/60">Nome</span>
            <input value={draft.name} maxLength={24} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-cream/10 bg-ink/70 px-3.5 focus:border-lime/60 focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-cream/60">Bio</span>
            <textarea value={draft.bio} rows={3} maxLength={160} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} className="mt-1 w-full resize-none rounded-2xl border border-cream/10 bg-ink/70 p-3.5 focus:border-lime/60 focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-cream/60">Il tuo dilemma Gatekeeper</span>
            <textarea value={draft.dilemma} rows={2} maxLength={140} onChange={(e) => setDraft({ ...draft, dilemma: e.target.value })} className="mt-1 w-full resize-none rounded-2xl border border-cream/10 bg-ink/70 p-3.5 focus:border-lime/60 focus:outline-none" />
          </label>
          <Button className="w-full" onClick={save}>
            <Check size={16} /> Salva
          </Button>
        </div>
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Ripristinare i dati demo?">
        <p className="text-[13.5px] text-cream/65">Piani creati, messaggi, karma e stato Lifetime verranno riportati allo stato iniziale. L’operazione non è reversibile.</p>
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
