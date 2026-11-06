# ALONG — Roadmap

Un passo alla volta: ogni **step** è pensato per una sessione di lavoro, si prova nel browser e si chiude prima di passare al successivo.

Stato: ✅ fatto · 🔜 prossimo · ⬜ da fare

---

## Sezioni del progetto

| # | Sezione | Cosa comprende |
|---|---|---|
| A | **Scopri & Match** | Mazzo di card, swipe, risposta al dilemma, match, like ricevuti, filtri |
| B | **Chat** | Slot (3/5), Sala d'Attesa, timer 48h, Stop the Clock, note vocali, chiusura con eleganza |
| C | **Profilo & identità** | Onboarding, foto, dilemma, karma e badge, preferenze |
| D | **Piani & Mappa** | Proporre un piano, elenco piani, mappa della città, crew di gruppo, Split the Bill |
| E | **Sicurezza & fiducia** | Blocca/segnala, verifica profilo, consigli per il primo incontro, 18+ |
| F | **Design system** | Colori, tipografia, componenti, animazioni, accessibilità |
| G | **Backend & dati** | Account, database, chat in tempo reale, foto online, privacy |
| H | **Monetizzazione & lancio** | ALONG Forever con pagamento vero, Revolut, deploy, PWA, aspetti legali |

---

## Fase 1 — Demo convincente (solo frontend, dati finti)
Obiettivo: un'app che si può far provare a qualcuno e che "sembra vera".

- ✅ **1.1 Design system (F)** — direzione Editorial Poster, brand corallo, Bricolage + Inter, 7 dimensioni di testo, 4 raggi, niente vetro/glow, card di Scopri a locandina → vedi `DESIGN.md`
- ✅ **1.2 Scopri (A)** — card-locandina a 3 pagine-storia (Locandina · In comune · Affidabilità), selezione di 20 profili al giorno con locandina "Per oggi è tutto", animazione "poster che si stacca"
- ✅ **1.3 Match & Like (A)** — nuovo stile scuro marrone + salvia (solo Work Sans), card a foto intera, like ricevuti a mazzo, match "biglietto doppio", proposta di uscita in 1 tap che ferma il timer
- ✅ **1.4 Chat (B)** — intestazione pulita con biglietto dell'uscita fissato e barra del timer, azioni nel "+", fumetti verde scuro / marrone, note vocali dal microfono vero, congedo con 3 modelli + frase personale, visualizzato e "sta scrivendo" disattivabili (reciproci, come WhatsApp)
- ✅ **1.5 Onboarding vero (C)** — benvenuto + 3 passi (chi sei con data di nascita e foto/avatar · cosa cerchi · dilemma dalla lista). Età minima 16 anni; 16-17 solo modalità Amici e in un gruppo separato: maggiorenni e minorenni non si vedono né si incontrano mai
- ✅ **1.6 Sicurezza base (E)** — Blocca e Segnala separati (card, profilo, chat) con motivo e conferma; avvisi su numero/indirizzo/social in uscita e su soldi/codici/foto intime/altre app in entrata; 16-17: piani solo 8–20, solo luoghi pubblici, niente vocali 1:1; persone bloccate nel profilo con Sblocca

> **Fine Fase 1.** Punti aperti emersi: verifica reale dell'età/identità prima del lancio (flusso pronto nello step 2.4, serve un fornitore di verifica collegato al backend) e moderazione vera delle segnalazioni (step 4.5).

## Fase 2 — Profilo reale
- ✅ **2.1 Foto vere** — galleria da 2 a 6 foto (onboarding e profilo), ritaglio 4:5 con zoom, griglia riordinabile trascinando o con le frecce; prima del match solo la principale sfocata, dopo il match tutte sfogliabili; avatar illustrato come alternativa ("Senza foto")
- ✅ **2.2 Profilo ricco** — pagina unica "Modifica profilo" (foto/avatar, nome, bio 160, lavoro o studio, lingue, fumo e alcol, passioni a categorie 3–8 + personalizzate, Habitat 1–5 per quartiere, dilemma) con un solo Salva e avviso modifiche non salvate; anteprima "Come ti vedono gli altri" prima e dopo il match; info nei profili degli altri
- ❌ **2.3 Bestie Vouching** — tolto: lo sticker scritto dal migliore amico è stato rimosso dall'app
- ✅ **2.4 Verifica profilo** — selfie con gesto casuale (fotocamera vera o caricamento), documento obbligatorio per 16-17, controllo simulato, selfie e documento cancellati subito; spunta ovunque, filtro "solo verificati", spunta sospesa se cambi la foto principale, avviso discreto in chat; per i 16-17 verifica obbligatoria prima di rispondere, accettare match, unirsi a piani o chattare

> **Fine Fase 2.**

## Fase 3 — Backend (diventa multi-utente)
- ✅ **3.1 Scelta e setup** — Supabase (UE, Francoforte): schema, regole di sicurezza RLS (età, blocchi, verifica, limiti), storage foto/vocali, tempo reale, client nel codice, guida `docs/SUPABASE.md`, test `npm run db:test` (42 controlli). Progetto `along` creato in UE, migrazione applicata, app collegata (“Collegato”)
- ✅ **3.2 Account** — accesso via email, con link o codice (niente password; email in italiano con codice quando avremo un mittente SMTP), poi i 3 passi del profilo; chi rientra salta l’onboarding. Profilo → Account: Esci ed Elimina account (scrivi ELIMINA: profilo, foto, like, messaggi e vocali cancellati subito; chi parlava con te vede la chat chiusa). Google: più avanti
- ✅ **3.3 Profili, like e match su database** — Scopri mostra solo persone vere (se non c’è nessuno: “Sei tra i primi a Napoli” + Invita amici), 20 profili al giorno contati dal server, risposta al dilemma = like, accetta/“non stavolta” (+3 karma), match anche se vi siete scelti a vicenda senza chat doppie, piani e crew (`join_plan`), blocchi e segnalazioni, verifica (esito ancora simulato), Karma calcolato dal server. La data di nascita esatta non è leggibile dagli altri: vedono solo l’età
- ✅ **3.4 Chat in tempo reale** — messaggi, “sta scrivendo”, Visualizzato (reciproco), vocali veri caricati sul server, proposta d’uscita con “Ci sto” per l’altra persona (ferma il timer, +5 a entrambi), chiusura con eleganza, Sala d’Attesa che si svuota da sola. Il timer di 48 ore scade lato server quando uno dei due apre l’app
- ✅ **3.5 Foto online** — fino a 6 foto compresse (4:5), più una copia minuscola e sfocata: prima del match gli altri ricevono solo quella; gli originali si scaricano solo dopo il match (regole dello storage)
- Provato su un Supabase locale con persone di prova: `npm run db:test` (70 controlli) e 3 percorsi completi nel browser (registrazione, like, match, chat, vocali, piani, crew, esci/rientra, elimina account, 16-17 separati e verifica)

> **Fine Fase 3.** Punti aperti: verifica con un fornitore vero (oggi l’esito è simulato), timer scaduti anche ad app chiusa (job programmato, con le notifiche 4.1), email da un mittente tuo (SMTP) prima della beta: il mittente gratuito di Supabase manda pochi codici l’ora e solo agli indirizzi del team.

## Fase 4 — Esperienza completa
- 🔜 **4.1 Notifiche** — nuovo like, match, timer in scadenza
- ⬜ **4.2 Piani di gruppo reali (D)** — crew, partecipanti, Split the Bill condiviso
- ⬜ **4.3 Mappa vera (D)** — mappa della città con gli Habitat, senza tracciamento GPS continuo
- ⬜ **4.4 Dopo l'uscita** — "Com'è andata?", ri-proporre un piano
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
- ✅ Profilo con Karma Meter e badge
- ✅ Piani, Quick Create, Mappa stilizzata, Travel Bridge
- ✅ Paywall ALONG Forever simulato, link Revolut
- ✅ Dati salvati nel browser (localStorage), reset demo
