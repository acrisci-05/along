# Collegare ALONG a Supabase (step 3.1 e 3.2)

Tempo: circa 10 minuti. Ti servono: il tuo account Supabase, Node.js 20+ e il repository sul tuo computer.

> **Regola d’oro sulle chiavi**
> - **Project URL** e **Publishable key** (`sb_publishable_…`, nei progetti vecchi “anon public”) sono **pubbliche per natura**: finiscono nel sito e sono protette dalle regole di sicurezza del database.
> - **Secret key** / **service_role** e **password del database** sono **segrete**: non incollarle mai in chat, nel codice o su GitHub. Restano nel tuo gestore di password.

---

## 1 · Crea il progetto (sul sito)

1. Vai su <https://supabase.com/dashboard> → **New project**.
2. **Name:** `along` · **Database password:** generane una forte e salvala nel gestore di password (servirà al passo 3).
3. **Region:** **Central EU (Frankfurt)** — i dati restano in Europa (GDPR).
4. Piano **Free** → **Create new project** e attendi 1–2 minuti.
5. Copia il **Project ref**: è la parte prima di `.supabase.co` nell’indirizzo del progetto (es. `abcdefghijklmnopqrst`), visibile anche in **Project Settings → General**.

## 2 · Prepara il repository (terminale)

```bash
git pull
```
```bash
npm install
```

## 3 · Installa il database con la Supabase CLI

```bash
npx supabase login
```
Si apre il browser per autorizzare la CLI (oppure ti chiede un *access token*: lo crei in **Account → Access Tokens**).

```bash
npx supabase link --project-ref IL_TUO_PROJECT_REF
```
Può chiederti la **password del database** del passo 1 (ora o al passo successivo).

```bash
npx supabase db push --remote
```
(`--remote` è necessario con la CLI 3: senza, prova a usare un database locale con Docker.) Applica `supabase/migrations/…_along_init.sql`: tabelle, regole di sicurezza (RLS), funzioni, bucket per foto e vocali, tempo reale, elenco Habitat. Rispondi `Y` alla conferma.

Controllo facoltativo:
```bash
npx supabase migration list --remote
```
La migrazione deve comparire sia in *Local* sia in *Remote*.

## 4 · Impostazioni di accesso (sul sito)

**Authentication → URL Configuration**
- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** aggiungi `http://localhost:5173` e `http://localhost:4173`

(Quando pubblicheremo il sito, nello step 5.1, aggiungeremo anche l’indirizzo pubblico.)

## 5 · Collega l’app

1. **Project Settings → API Keys** (o **API**): copia **Project URL** e **Publishable key**.
2. Nella cartella del progetto crea `.env.local` partendo dall’esempio:
   ```bash
   cp .env.example .env.local
   ```
3. Apri `.env.local` e incolla i due valori. Il file è già escluso da Git.
4. Avvia l’app:
   ```bash
   npm run dev
   ```
5. Apri <http://localhost:5173> → **Profilo** → sezione **Backend** → **Verifica**. Deve comparire “Collegato a …”.

## 6 · Dimmi com’è andata

Scrivimi “fatto”, oppure incollami l’eventuale errore. Se vuoi che provi io il collegamento da questa sessione, puoi mandarmi **solo** Project URL e Publishable key (sono pubbliche); **mai** la secret key o la password.

---

## 7 · Attiva l’app vera (step 3.2: account, Scopri, like, chat)

Da qui, con `.env.local` presente, l’app **non è più una demo**: niente persone finte, si entra con email e codice.

1. Aggiorna il codice:
   ```bash
   git pull
   ```
2. Installa le nuove funzioni del database (`…_along_rpc.sql`):
   ```bash
   npx supabase db push --remote
   ```
3. Manda a Supabase le email in italiano con il **codice di 6 cifre**. Prima guarda cosa cambierebbe:
   ```bash
   npx supabase config diff
   ```
   poi applica (ti mostra le differenze e chiede conferma, rispondi `y`):
   ```bash
   npx supabase config push
   ```
   **Importante:** senza questo passo l’email di Supabase contiene un link invece del codice. In alternativa puoi farlo a mano: **Authentication → Emails → Magic Link**, oggetto `Il tuo codice ALONG: {{ .Token }}` e nel testo `{{ .Token }}` (il contenuto pronto è in `supabase/templates/codice-accesso.html`); in **Authentication → Sign In / Providers → Email** controlla che *Email OTP Length* sia **6** e *Email OTP Expiration* **600** secondi.
4. Avvia e prova:
   ```bash
   npm run dev
   ```
   Apri <http://localhost:5173> → **Crea il tuo profilo** → la tua email → il codice che ricevi → i 3 passi del profilo. Per provare un match ti serve una seconda persona: una finestra in incognito con un’altra email.

> **Limite delle email:** il mittente gratuito di Supabase manda pochi codici all’ora e solo agli indirizzi dei membri del progetto (il tuo va bene). Prima di far provare l’app ad amici collegheremo un mittente tuo (SMTP, per esempio Resend o Brevo) in **Authentication → Emails → SMTP Settings**.

Senza `.env.local` l’app torna la demo con persone finte (utile per mostrarla senza account).

---

### Cosa fa già il database (provato con `npm run db:test`, 70 controlli)
- Età minima **16 anni**; **16-17 e 18+ non si vedono mai** (profili, piani, foto, like, chat).
- 16-17: solo **Amici**, **verifica obbligatoria** prima di rispondere, unirsi a piani o scrivere; piani solo **8–20** e in **luoghi pubblici**; niente vocali nelle chat 1:1.
- **Blocchi**: chi è bloccato sparisce e non può più scrivere. **Segnalazioni** solo in scrittura (le legge la moderazione).
- Spunta di verifica, karma e Forever **non modificabili dal browser**.
- **Foto**: originale visibile solo a te e ai tuoi match, versione sfocata ai profili compatibili.
- Limiti: **3 piani attivi**, **20 profili al giorno**, **3 chat attive** (5 con Forever).
- Data di nascita esatta **non leggibile** dagli altri: vedono solo l’età.
- Funzioni del server per match, piani, chiusura chat, timer 48h, verifica, blocco ed **eliminazione account** (cancella anche i messaggi; chi parlava con te vede la chat chiusa).

### Problemi comuni
| Messaggio | Soluzione |
|---|---|
| `Cannot find project ref` | Rifai `npx supabase link --project-ref …` |
| `password authentication failed` | Password del database sbagliata: la reimposti in **Project Settings → Database** |
| “le tabelle mancano” nella verifica | Esegui `npx supabase db push --remote` |
| `failed to connect … 127.0.0.1:54322` / “Make sure Docker is running” | Hai dimenticato `--remote`: `npx supabase db push --remote` |
| “Non collegato” | Controlla i nomi delle variabili in `.env.local` e riavvia `npm run dev` |
| Nell’email c’è un link e non il codice | Fai il punto 3 della sezione 7 (`npx supabase config push` o il modello a mano) |
| “Troppi tentativi” / l’email non arriva | Limite del mittente gratuito: aspetta qualche minuto, guarda nello spam, usa l’email del tuo account Supabase |
| “Non riesco a collegarmi” dopo l’accesso | Mancano le nuove funzioni: `npx supabase db push --remote` |
