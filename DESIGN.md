# ALONG — Design system

**Direzione attuale (step 1.3):** scura, seria, pochi colori, stile app d'incontri famosa.
**Marrone notte + verde salvia**, un solo font (**Work Sans**), card a **foto intera**.
I token vivono in `src/index.css` (`@theme`).

> Storia: 1.1 era "Editorial Poster" (corallo, Bricolage, locandine colorate). Sostituita in 1.3 su richiesta: meno colori, meno "look AI", più serio.

## Colori
| Ruolo | Token | Valore | Uso |
|---|---|---|---|
| Fondo | `ink` | #1C1612 | pagina |
| Superfici | `surface` · `surface-2` · `line` | #2A221C · #352B24 · #3A3029 | card, input, bordi |
| Testo | `cream` · `muted` | #F2EBDF · #9A8C7D | testo e testo secondario |
| **Azione (unico colore)** | `brand` | #9CC5A1 salvia | bottoni principali, logo, stato attivo |
| Verde scuro | `forest` | #24473A | blocchi in evidenza (dilemma, biglietto, Forever) |
| Semantici | `gold` / `ember` · `alarm` | #D9A55B · #E0675A | Sala d'Attesa e timer 12–6h · timer < 6h, errori |

Regole: **un solo colore d'azione** (salvia). Niente colori per categoria, niente gradienti decorativi, niente vetro o glow.
`coral` e `lime` esistono solo come alias di `brand` per compatibilità.

## Tipografia
Solo **Work Sans** (400–800). Scala a 7 passi: `text-xs` 11 · `sm` 13 · `base` 15 · `lg` 18 · `xl` 24 · `2xl` 32 · `3xl` 48.
Titoli 800 con tracking leggermente stretto. Etichette: testo semplice 600 in `muted`, **niente corsivo e niente trattino lungo**.

## Forme
- Raggi: `rounded-md` 10 per chip, badge e pulsanti secondari; `rounded-2xl` 14 per card; `rounded-full` solo per avatar e i due pulsanti d'azione di Scopri/Like.
- Niente "pillole" tonde ovunque.

## Componenti chiave
- **Card di Scopri:** foto intera sfocata (svelata al match), barre-storia in alto, 3 pagine (piano, in comune, affidabilità), nome e dilemma fissi in basso. Azioni: annulla · ✕ · **Rispondi**.
- **Like ricevuti:** mazzo, una risposta alla volta; destra = Match, sinistra = Non stavolta.
- **Match:** biglietto doppio (tu + l'altra persona) che si unisce e viene timbrato "MATCH", con la proposta della prima uscita.
- **Proposta di uscita:** messaggio a forma di biglietto (cosa, quando, dove); quando viene accettata il timer 48h si ferma.
- **Chat:** intestazione con avatar e nome (sotto: "sta scrivendo…"), biglietto dell'uscita fissato (tocca per i dettagli), barra del timer che si consuma (salvia → ambra → rosso). Fumetti: miei `forest`, suoi `surface-2`. Tutte le azioni nel "+" a sinistra del campo di testo, microfono a destra. Conferme ✓ / ✓✓ e "Visualizzato" sotto l'ultimo messaggio, disattivabili nel profilo.

## Emoji
Restano nelle categorie e in pochi punti di personalità; mai come decorazione dei titoli.
