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
3. **Non serve altro per entrare:** l’email standard di Supabase contiene un **link**. Aprila sullo stesso dispositivo (e browser) dove hai aperto ALONG e tocca il link: entri direttamente. Se il link è scaduto o già usato, l’app te lo dice e puoi chiederne un altro.
   > Le email in italiano con il **codice** (`supabase/templates/`) si possono attivare solo con un mittente tuo (SMTP): sul piano gratuito Supabase rifiuta la modifica dei modelli con il mittente standard. Per questo **non usare `npx supabase config push`** per ora.
4. Avvia e prova:
   ```bash
   npm run dev
   ```
   Apri <http://localhost:5173> → **Crea il tuo profilo** → la tua email → tocca il link nell’email → i 3 passi del profilo.

> **Limite delle email:** il mittente gratuito di Supabase manda poche email all’ora e **solo agli indirizzi dei membri del progetto** (il tuo va bene, un secondo indirizzo no). Per provare un match con una seconda persona serve un mittente tuo (SMTP) in **Authentication → Emails → SMTP Settings**; con quello si attivano anche le email in italiano con il codice.

Senza `.env.local` l’app torna la demo con persone finte (utile per mostrarla senza account).

---

## 8 · Mittente email con Gmail (per la seconda persona e il codice in italiano)

1. Account Google → **Sicurezza** → attiva la **Verifica in due passaggi**.
2. Apri <https://myaccount.google.com/apppasswords>, nome `ALONG Supabase` → **Crea**. Copia la password di 16 lettere: è **segreta**, va solo nel passo 3 (mai in chat, nel codice o su GitHub).
3. Supabase → **Authentication → Emails → SMTP Settings** → **Enable custom SMTP**:
   - Sender email: il tuo indirizzo Gmail · Sender name: `ALONG`
   - Host: `smtp.gmail.com` · Port: `465`
   - Username: il tuo indirizzo Gmail · Password: la password per le app
   - **Save**
4. Nel terminale, dalla cartella del progetto:
   ```bash
   git pull
   ```
   ```bash
   npx supabase config diff
   ```
   Devono comparire solo: conferma email, durata e lunghezza del codice (600 s, 6 cifre) e i due modelli email. Poi:
   ```bash
   npx supabase config push
   ```
5. Prova: esci dall’app, rientra con la tua email → arriva “Il tuo codice ALONG: 123456”. Poi una finestra in incognito con un’altra email per la seconda persona.

Gmail va benissimo per i test (circa 500 email al giorno). Per il lancio passeremo a un servizio dedicato con un dominio tuo.

---

## 9 · Aggiornamento “app più semplice” (Fase 3B)

Dopo `git pull`, applica la nuova migrazione (like con un tocco, Questo o quello, foto visibili, niente timer, 3 chat per tutti):
```bash
npx supabase db push --remote
```
Poi riavvia `npm run dev`.

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
| Nell’email c’è un link e non il codice | È normale con il mittente standard: tocca il link sullo stesso dispositivo |
| `Email template modification is not available for free tier` | Serve un mittente SMTP tuo; nel frattempo usa il link |
| L’email non arriva a un secondo indirizzo | Il mittente standard scrive solo ai membri del progetto: serve SMTP |
| “Troppi tentativi” / l’email non arriva | Limite del mittente gratuito: aspetta qualche minuto, guarda nello spam, usa l’email del tuo account Supabase |
| “Non riesco a collegarmi” dopo l’accesso | Mancano le nuove funzioni: `npx supabase db push --remote` |
