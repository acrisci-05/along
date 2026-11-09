import { motion } from 'motion/react'
import { BadgeCheck, Ban, Heart, MessagesSquare, ShieldCheck, Users } from 'lucide-react'
import { ClapMark, Scene } from './Brand'
import { RevolutTip } from './ui'

const POINTS = [
  {
    scene: 'waiting' as const,
    title: 'Like con un tocco',
    body: 'Sul profilo c’è un Questo o quello (“Pizza fritta o al forno?”). Se rispondi insieme al like, avete già il primo argomento.',
  },
  {
    scene: 'search' as const,
    title: 'Al massimo 3 chat',
    body: 'Poche conversazioni alla volta, fatte bene. Gli altri match aspettano in Sala d’Attesa, e chi chiude lo fa con un congedo gentile.',
  },
  {
    scene: 'wave' as const,
    title: 'Nessun trucco a pagamento',
    body: 'Like illimitati, tutti i like ricevuti visibili, stesse regole per tutti. Niente boost, niente abbonamenti.',
  },
]

const SAFETY = [
  { icon: BadgeCheck, text: 'Verifica con un selfie e un gesto' },
  { icon: Users, text: 'Maggiorenni e 16-17 anni non si incontrano mai' },
  { icon: Ban, text: 'Blocca e segnala in un tocco' },
]

/** Desktop home page: what ALONG is, before opening the app. */
export function Landing({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="min-h-dvh bg-ink text-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
        <span className="inline-flex items-center gap-2">
          <ClapMark size={32} />
          <span className="text-3xl font-extrabold tracking-[-0.05em] text-brand">along</span>
        </span>
        <button onClick={onOpen} className="h-11 rounded-full bg-brand px-6 font-bold text-ink transition hover:brightness-105">
          Apri ALONG
        </button>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-8 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-[clamp(44px,6vw,76px)] font-extrabold leading-[0.95] tracking-[-0.04em]">
            Due persone,
            <br />
            <span className="text-brand">una strada.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="mt-5 max-w-lg text-lg leading-relaxed text-cream/75">
            L’app per date e nuove amicizie nata a Napoli. Like con un tocco, poche chat ma vere, nessun trucco a pagamento.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="mt-8 flex flex-wrap items-center gap-4">
            <button onClick={onOpen} className="h-14 rounded-full bg-love px-8 text-lg font-bold text-cream transition hover:brightness-110">
              <span className="inline-flex items-center gap-2">
                <Heart size={20} fill="currentColor" /> Apri ALONG
              </span>
            </button>
            <span className="text-sm text-muted">Gratis · dai 16 anni · funziona dal telefono</span>
          </motion.div>
        </div>
        <div className="relative grid place-items-center">
          <div className="absolute size-[420px] rounded-full bg-brand/10 blur-3xl" aria-hidden />
          <div className="relative grid size-[360px] place-items-center rounded-full border border-line bg-surface/60">
            <ClapMark mode="intro" size={220} />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-ink-2">
        <div className="mx-auto grid max-w-6xl gap-6 px-8 py-16 md:grid-cols-3">
          {POINTS.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              className="rounded-2xl border border-line bg-surface p-6"
            >
              <Scene kind={p.scene} size={84} />
              <h2 className="mt-4 text-xl font-bold">{p.title}</h2>
              <p className="mt-2 text-base leading-relaxed text-cream/70">{p.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-8 py-16">
        <div className="grid items-center gap-8 rounded-3xl bg-forest p-8 md:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-brand">
              <ShieldCheck size={16} /> Sicurezza prima di tutto
            </p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-[-0.02em]">Solo persone vere, nel posto giusto.</h2>
          </div>
          <ul className="grid gap-3">
            {SAFETY.map((s) => (
              <li key={s.text} className="flex items-center gap-3 rounded-xl bg-ink/30 px-4 py-3 text-base">
                <s.icon size={20} className="shrink-0 text-brand" /> {s.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-8 pb-16 text-center">
        <MessagesSquare size={28} className="mx-auto text-brand" />
        <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.02em]">Meno chat. Più incontri.</h2>
        <button onClick={onOpen} className="mt-6 h-14 rounded-full bg-brand px-8 text-lg font-bold text-ink transition hover:brightness-105">
          Apri ALONG
        </button>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-8 py-6 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <ClapMark size={20} /> ALONG · Napoli
          </span>
          <div className="w-fit">
            <RevolutTip compact />
          </div>
        </div>
      </footer>
    </div>
  )
}
