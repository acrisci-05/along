# ALONG — Roadmap

Un passo alla volta: ogni **step** è pensato per una sessione di lavoro, si prova nel browser e si chiude prima di passare al successivo.

Stato: ✅ fatto · 🔜 prossimo · ⬜ da fare

---

## Sezioni del progetto

| # | Sezione | Cosa comprende |
|---|---|---|
| A | **Scopri & Match** | Mazzo di card, swipe, risposta al dilemma, match, like ricevuti, filtri |
| B | **Chat** | Slot (3/5), Sala d'Attesa, timer 48h, Stop the Clock, note vocali, chiusura con eleganza |
| C | **Profilo & identità** | Onboarding, foto, dilemma, sticker Bestie, karma e badge, preferenze |
| D | **Piani & Mappa** | Proporre un piano, elenco piani, mappa della città, crew di gruppo, Split the Bill |
| E | **Sicurezza & fiducia** | Blocca/segnala, verifica profilo, consigli per il primo incontro, 18+ |
| F | **Design system** | Colori, tipografia, componenti, animazioni, accessibilità |
| G | **Backend & dati** | Account, database, chat in tempo reale, foto online, privacy |
| H | **Monetizzazione & lancio** | ALONG Forever con pagamento vero, Revolut, deploy, PWA, aspetti legali |

---

## Fase 1 — Demo convincente (solo frontend, dati finti)
Obiettivo: un'app che si può far provare a qualcuno e che "sembra vera".

- ✅ **1.1 Design system (F)** — direzione Editorial Poster, brand corallo, Bricolage + Inter, 7 dimensioni di testo, 4 raggi, niente vetro/glow, card di Scopri a locandina → vedi `DESIGN.md`
- ✅ **1.2 Scopri (A)** — card-locandina a 3 pagine-storia (Locandina · In comune · Affidabilità), Bestie solo dopo il match, selezione di 20 profili al giorno con locandina "Per oggi è tutto", animazione "poster che si stacca"
- ✅ **1.3 Match & Like (A)** — nuovo stile scuro marrone + salvia (solo Work Sans), card a foto intera, like ricevuti a mazzo, match "biglietto doppio", proposta di uscita in 1 tap che ferma il timer
- ✅ **1.4 Chat (B)** — intestazione pulita con biglietto dell'uscita fissato e barra del timer, azioni nel "+", fumetti verde scuro / marrone, note vocali dal microfono vero, congedo con 3 modelli + frase personale, visualizzato e "sta scrivendo" disattivabili (reciproci, come WhatsApp)
- 🔜 **1.5 Onboarding vero (C)** — creare il proprio profilo: nome, età, cosa cerchi, interessi, Habitat, dilemma (non più "Alex")
- ⬜ **1.6 Sicurezza base (E)** — blocca e segnala, conferma 18+, consigli per il primo incontro, condividi il piano con un amico

## Fase 2 — Profilo reale
- ⬜ **2.1 Foto vere** — caricare 3–6 foto, ritaglio, ordine; sfocatura fino al match
- ⬜ **2.2 Profilo ricco** — più dilemmi/prompt a scelta, modifica Habitat e interessi, anteprima "come ti vedono gli altri"
- ⬜ **2.3 Bestie Vouching reale** — link che apre un modulo per il tuo amico, approvazione prima della pubblicazione
- ⬜ **2.4 Verifica profilo** — selfie di verifica (simulata) e badge "verificato"

## Fase 3 — Backend (diventa multi-utente)
- ⬜ **3.1 Scelta e setup** — es. Supabase: progetto, schema dati, regole di sicurezza
- ⬜ **3.2 Account** — registrazione e login (email / magic link)
- ⬜ **3.3 Profili, like e match su database** — sostituire i dati finti
- ⬜ **3.4 Chat in tempo reale** — messaggi, note vocali vere (microfono), timer 48h lato server
- ⬜ **3.5 Foto online** — storage, compressione, sfocatura protetta lato server

## Fase 4 — Esperienza completa
- ⬜ **4.1 Notifiche** — nuovo like, match, timer in scadenza
- ⬜ **4.2 Piani di gruppo reali (D)** — crew, partecipanti, Split the Bill condiviso
- ⬜ **4.3 Mappa vera (D)** — mappa della città con gli Habitat, senza tracciamento GPS continuo
- ⬜ **4.4 Dopo l'uscita** — "Com'è andata?", ri-proporre un piano, recensione Bestie reciproca
- ⬜ **4.5 Moderazione** — gestione segnalazioni, filtri contenuti

## Fase 5 — Lancio
- ⬜ **5.1 Deploy** — link pubblico (Vercel o GitHub Pages) e dominio
- ⬜ **5.2 App installabile (PWA)** — icona, schermata iniziale, offline di base
- ⬜ **5.3 ALONG Forever reale** — pagamento una tantum (es. Stripe), Revolut per le mance
- ⬜ **5.4 Legale & privacy** — privacy policy, termini, GDPR, cancellazione account
- ⬜ **5.5 Beta** — 20–50 persone vere, raccolta feedback, correzioni

---

## Già fatto (prototipo attuale)
- ✅ Scopri con swipe persona + piano, risposta al dilemma, foto sfocate fino al match
- ✅ Match simulato con foto svelata e timer 48h
- ✅ Like ricevuti (Match / Non stavolta)
- ✅ Chat con 3 slot, Sala d'Attesa, Stop the Clock, chiusura con eleganza, note vocali simulate, Split the Bill
- ✅ Profilo con sticker Bestie, Karma Meter, badge
- ✅ Piani, Quick Create, Mappa stilizzata, Travel Bridge
- ✅ Paywall ALONG Forever simulato, link Revolut
- ✅ Dati salvati nel browser (localStorage), reset demo
