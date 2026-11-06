# ALONG — The Plan & People Playground

> Less scrolling. More doing. Find your people.

Web app mobile-first (React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Motion + lucide-react).
Niente backend: tutto lo stato (piani, chat, karma, Lifetime, Travel Bridge) persiste in `localStorage`.

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
| `src/index.css` | Design tokens "Editorial Neon Dark", aurora mesh, Border Beam, sticker peel, radar sweep, `prefers-reduced-motion` |
| `src/data/mock.ts` | 10 profili, 12 piani, 6 chat precaricate (timer a 30h / 9h / 3h), Habitat di Napoli |
| `src/store/store.tsx` | Stato globale + persistenza: Gatekeeper, 3/5 slot, Sala d'Attesa, Chiusura con Eleganza (+15 Karma), timer 48h con watchdog anti-ghosting, risposte simulate, Lifetime |
| `src/components/LivingPlanCard.tsx` | Card centrale con stati OPEN / ALMOST FULL / FULL / CONFIRMED / EXPIRED e varianti per categoria |
| `src/components/QuickCreate.tsx` | Creazione in 5 passi con live preview e cronometro < 60s |
| `src/components/Gatekeeper.tsx` | Dilemma obbligatorio prima di entrare/scrivere |
| `src/components/Paywall.tsx` | ALONG Forever pay-once (19,99 € / lancio 14,99 €) con simulatore |
| `src/components/Bestie.tsx` | Sticker Bestie Vouching, Karma Meter, badge comportamentali |
| `src/views/*` | Esplora (doppia frequenza + Travel Bridge), City Radar, I Miei Piani, Crew, Plan Hub/Chat, Profilo & impostazioni |

Impostazioni demo (Profilo): toggle Lifetime, "Simula richiesta in arrivo", "Ripristina Dati Demo".
Su desktop l'app è mostrata in una cornice smartphone, con switch per la vista estesa (navbar superiore).
