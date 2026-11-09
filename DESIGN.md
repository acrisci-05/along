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
| Verde scuro | `forest` | #24473A | blocchi in evidenza (Questo o quello, Sostieni ALONG) |
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
- **Pagina iniziale:** logo “along” che si compone lettera per lettera, “Persone vere, vicine.”, Registrati / Ho già un account.
- **Card di Scopri:** foto a tutto schermo (si sfogliano toccando), nome, età, città, bio, passioni in comune e il **Questo o quello** con due risposte toccabili. Azioni: annulla · ✕ · **Mi piace**. Trascinando compaiono MI PIACE / PASSO.
- **Like ricevuti:** mazzo, una persona alla volta con la sua scelta al tuo Questo o quello; destra = Match, sinistra = No, grazie.
- **Match:** le due foto si avvicinano inclinate e un cuore cade in mezzo; vibrazione leggera.
- **Chat:** intestazione con avatar, nome, età e città (o “sta scrivendo…”). Il primo messaggio è la carta Questo o quello. Fumetti: miei `forest`, suoi `surface-2`. Azioni nel “+”: brano, chiudi con gentilezza. Conferme ✓ / ✓✓ disattivabili.

## Movimento
Morbido e discreto: passaggi laterali tra le schede, pulsanti che si comprimono al tocco, indicatori che scivolano (scheda attiva, Date/Amici), contatori che “saltano” quando cambiano, vibrazione breve su like e match. Rispetta “riduci movimento” del telefono.

## Emoji
Restano nelle categorie e in pochi punti di personalità; mai come decorazione dei titoli.
