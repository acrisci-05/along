# ALONG

> Persone vere, vicine.

**App d’incontri 1:1 per date e nuove amicizie.** Like con un tocco; sul profilo un **Questo o quello** (es. *Pizza fritta o al forno?*): chi mette like può scegliere una risposta, che diventa il primo messaggio del match. Massimo **3 chat** alla volta (le altre in Sala d’Attesa), **congedo gentile** quando chiudi una chat, **nessun trucco a pagamento**.

Web app mobile-first (React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Motion + lucide-react).

## Avvio

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck (tsc) + build di produzione in dist/
npm run preview    # serve la build
```

## Mappa del codice

| Percorso | Contenuto |
| --- | --- |
| `src/App.tsx` | Cornice, barra in basso (Scopri · Like · Chat · Profilo), transizioni tra schede, notifiche |
| `src/store/store.tsx` | Interfaccia `Store` e demo locale (persone finte, risposte simulate) |
| `src/store/real.tsx` | Versione vera su Supabase: account, profili, foto, like, match, chat in tempo reale |
| `src/views/Discover.tsx` | Scopri: card a tutto schermo, foto da sfogliare, Questo o quello toccabile, Mi piace / Passo |
| `src/views/Likes.tsx` | Like ricevuti (tutti visibili, gratis): Match o No, grazie |
| `src/views/Crew.tsx` | Chat: 3 attive, Sala d’Attesa, chat chiuse |
| `src/views/ChatRoom.tsx` | Conversazione: testo, vocali, brani, congedo gentile, blocca/segnala |
| `src/views/Profile.tsx` | Profilo, verifica, foto, privacy, account |
| `src/components/Onboarding.tsx` | Pagina iniziale (logo che si compone) e i 3 passi del profilo |
| `src/components/ThisOrThatEditor.tsx` | Scelta del Questo o quello (dalla lista o scritto da te) |
| `src/components/Paywall.tsx` | Sostieni ALONG: pagamento unico, nessun vantaggio sugli altri |
| `src/components/MatchOverlay.tsx` | Schermata del match |
| `src/data/mock.ts` | Persone della demo e lista dei Questo o quello |

Senza `.env.local` l’app è una demo con persone finte (Profilo → Impostazioni demo).

## Regole d’età
- Iscrizione dai **16 anni** (data di nascita obbligatoria, l’età si aggiorna da sola).
- **16-17 anni:** solo modalità *Amici*, in un gruppo separato.
- **Maggiorenni e minorenni non si vedono mai:** Scopri, like, profili, foto e chat sono separati dal database stesso (regole RLS) e anche nell’app (`src/lib/age.ts`).
- **16-17 anni:** verifica obbligatoria prima di mettere like o chattare.

## Sicurezza
- **Blocca / Segnala** dalla card di Scopri (⋯), dal profilo e dal menu della chat. Segnalare blocca anche; la verifica del team è simulata.
- **Avvisi sui messaggi** (`src/lib/safety.ts`): prima di inviare numero, indirizzo o social; in arrivo su richieste di soldi, codici, foto intime o di spostarsi su altre app. Sono controlli locali, euristici.
- **16-17 anni:** niente note vocali nelle chat 1:1.

## Backend (Supabase)
- Schema, regole di sicurezza e storage: `supabase/migrations/`. Test delle regole senza Supabase: `npm run db:test`.
- Per collegare un progetto vero segui **[docs/SUPABASE.md](docs/SUPABASE.md)** (Supabase CLI: `login`, `link`, `db push`, poi `.env.local`).
- Con `.env.local` l’app è **vera**: accesso via email (link o codice), profili, foto, like, match e chat sul database (`src/store/real.tsx`, schermate di accesso in `src/components/Account.tsx`). Le stesse schermate funzionano con la demo (`src/store/store.tsx`) grazie a un’unica interfaccia `Store`.
- Senza `.env.local` l’app resta in modalità demo con persone finte; il codice di Supabase si scarica solo quando è configurato.
