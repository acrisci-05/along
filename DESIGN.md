# ALONG — Design system (Editorial Poster)

Scelto nello step 1.1: **direzione B · Editorial Poster**, brand **corallo**, **Bricolage Grotesque + Inter**, emoji solo come firma.
I token vivono in `src/index.css` (`@theme`).

## Colori
| Ruolo | Token | Uso |
|---|---|---|
| Sfondo | `ink` #101010 | pagina |
| Superfici | `surface` #1a1a1a · `surface-2` #242424 · `line` #2e2e2e | card, input, bordi |
| Testo | `cream` #F6F4EF (+ /70, /55, /40) | testo primario e secondario |
| **Brand** | `coral` #FF806D | azioni principali, match, Date, indicatore attivo |
| Amici | `lime` #D7FF66 | solo intento "Amici" |
| Senza Confini | `violet` #C4B5FD | solo modalità remota |
| Timer 48h | `cyan` > 12h · `ember` 12–6h · `alarm` < 6h | solo Border Beam e countdown |
| Sala d'Attesa | `gold` #F5C451 | solo richieste in attesa |
| Locandine | `p-food`, `p-drink`, `p-sport`, `p-cinema`, `p-study`, `p-walk`, `p-gaming`, `p-music`, `p-books`, `p-talk`, `p-travel` | sfondo pieno delle card-locandina, testo sempre `ink` |

Regola: **un solo colore d'azione per schermata (corallo)**. Gli altri colori hanno un significato e compaiono solo lì.

## Tipografia (7 dimensioni)
| Classe | px | Uso |
|---|---|---|
| `text-xs` | 11 | metadati, badge |
| `text-sm` | 13 | testo secondario, chip |
| `text-base` | 15 | testo |
| `text-lg` | 18 | sottotitoli |
| `text-xl` | 24 | titoli di card |
| `text-2xl` | 32 | titoli di pagina |
| `text-3xl` | 48 | numeri e titoli-poster |

- Titoli: `font-display` (Bricolage Grotesque) 800, tracking stretto.
- Testo: Inter.
- Etichette editoriali: utility `serif` (Instrument Serif corsivo), es. *"il suo dilemma —"*. Niente più MAIUSCOLO spaziato.

## Forme
- Raggi: `rounded-sm` 6 (locandine, sticker) · `rounded-md` 10 (bottoni, card-poster) · `rounded-2xl` 14 (superfici, input) · `rounded-3xl` 20 (sheet) · `rounded-full` (avatar, chip).
- Niente vetro, glow o sfondi animati. Ombra-firma: `poster-shadow` (3px 4px 0 ink) solo per sticker e badge.

## Componenti
- `Button`: primary corallo, outline crema 2px, ghost su `surface-2`; disabilitato = superficie piena (mai trasparente).
- `Chip`: inattivo con bordo `line`; attivo crema (o corallo per l'intento Date).
- `Eyebrow`: serif corsivo.
- Card di Scopri = **locandina** a 3 pagine-storia (tocca a destra/sinistra, frecce ↑/↓): *Locandina* (orario gigante, foto sfocata incorniciata, sticker inclinato), *In comune* (% sintonia, passioni e Habitat condivisi), *Affidabilità* (karma e badge). Nome e dilemma restano fissi in basso.
- Animazioni firma: passo = il poster si stacca e cade ruotando; rispondo = la card si gira come un biglietto e vola via.
- Fine selezione giornaliera (20 profili): locandina crema "Per oggi è tutto." con riepilogo e conto alla rovescia.
- Bottom nav: barra piatta con bordo superiore, etichette maiuscole Bricolage, "+" corallo quadrato.

## Emoji
Solo come firma: categorie, sticker Bestie, schermata di match. Altrove icone Lucide.
