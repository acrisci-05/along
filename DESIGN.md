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
| Terracotta | `love` | #C4553A | solo like, match e contatori dei like |
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

## Simbolo
Due omini stilizzati (crema e salvia) che si incontrano e si danno il cinque, con tre trattini sul battito delle mani. Componente `ClapMark` (`src/components/Brand.tsx`) con 4 modi: `intro` (arrivano camminando e battono il cinque: pagina iniziale), `clap` (solo il cinque: match), `loop` (battono il cinque di continuo: caricamenti), `static` (posa finale: icona dell’app, intestazione). Frase: **Due persone, una strada.** Icone in `public/favicon.svg` e `public/apple-touch-icon.png`.

## Componenti chiave
- **Pagina iniziale:** i due omini arrivano e si danno il cinque, poi “along” si compone lettera per lettera e compare “Due persone, una strada.”; Registrati / Ho già un account.
- **Card di Scopri:** foto libera a tutto schermo (si sfogliano toccando) con solo nome, età e città; scorrendo dentro la card: bio, **Questo o quello** toccabile, passioni, info. Azioni: annulla · ✕ · **Mi piace** (terracotta). Trascinando compaiono MI PIACE / PASSO. Filtri nell’intestazione.
- **Like ricevuti:** griglia di foto a 2 colonne con la scelta al tuo Questo o quello; tocchi e decidi Match / No, grazie nel profilo.
- **Chat:** contatore “2/3 attive”, fila “Nuovi match” (anello terracotta), elenco stile WhatsApp, Sala d’Attesa.
- **Profilo:** solo ciò che vedono gli altri + “Cosa manca”; ingranaggio → Impostazioni (privacy, bloccati, Sostieni, account).
- **Stati vuoti:** piccole scene con gli omini (aspetta, cercano, saluta).
- **Computer:** pagina di presentazione per chi non ha ancora un account, poi l’app nella cornice del telefono.
- **Match:** le due foto si avvicinano inclinate e in mezzo i due omini si danno il cinque; vibrazione leggera.
- **Chat:** intestazione con avatar, nome, età e città (o “sta scrivendo…”). Il primo messaggio è la carta Questo o quello. Fumetti: miei `forest`, suoi `surface-2`. Azioni nel “+”: brano, chiudi con gentilezza. Conferme ✓ / ✓✓ disattivabili.

## Movimento
Morbido e discreto: passaggi laterali tra le schede, pulsanti che si comprimono al tocco, indicatori che scivolano (scheda attiva, Date/Amici), contatori che “saltano” quando cambiano, vibrazione breve su like e match. Rispetta “riduci movimento” del telefono.

## Emoji
Restano nelle categorie e in pochi punti di personalità; mai come decorazione dei titoli.
