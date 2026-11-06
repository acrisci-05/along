/* ALONG · test delle regole del database (RLS, trigger, funzioni) senza Supabase.
   Simula le parti di Supabase che servono (auth.uid, storage, realtime). Uso: npm run db:test */
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
const db = new PGlite()
const stub = `
create role authenticated nologin; create role anon nologin; create role service_role nologin bypassrls;
create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('test.role', true), ''), 'authenticated') $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
create publication supabase_realtime;
-- come su Supabase: tabelle e funzioni nuove sono accessibili agli utenti autenticati, salvo revoche
grant usage on schema public, storage, auth to authenticated;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
grant all on storage.objects to authenticated;
`
const grants = ''
// applies every migration in supabase/migrations, in order, on an in-memory Postgres (PGlite)
const dir = new URL('../migrations/', import.meta.url)
const sql = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => fs.readFileSync(new URL(f, dir), 'utf8')).join('\n')
let failures = 0
const ok = (l, v) => { if (!v) failures++; console.log((v ? 'OK  ' : 'FAIL') + ' ' + l) }
try {
  await db.exec(stub); await db.exec(sql); await db.exec(grants)
  console.log('migration applied')
} catch (e) { console.error('MIGRATION ERROR:', e.message); process.exit(1) }

const U = { adult1: '11111111-1111-1111-1111-111111111111', adult2: '22222222-2222-2222-2222-222222222222', teen1: '33333333-3333-3333-3333-333333333333', teen2: '44444444-4444-4444-4444-444444444444', kid: '55555555-5555-5555-5555-555555555555' }
for (const id of Object.values(U)) await db.query('insert into auth.users values ($1)', [id])
async function as(uid, fn) { await db.exec(`set role authenticated; set test.uid = '${uid}'; set test.role = 'authenticated';`); try { return await fn() } finally { await db.exec('reset role; reset test.uid;') } }
async function tryq(uid, q, p = []) { try { const r = await as(uid, () => db.query(q, p)); return { ok: true, rows: r.rows } } catch (e) { return { ok: false, err: e.message } } }
const yearsAgo = (y, extraDays = 0) => { const d = new Date(); d.setFullYear(d.getFullYear() - y); d.setDate(d.getDate() - extraDays); return d.toISOString().slice(0, 10) }
const ins = (uid, name, bd) => tryq(uid, `insert into profiles (id, name, birth_date, dilemma, intent) values ($1, $2, $3, 'Alba o tramonto?', '{date,friends}')`, [uid, name, bd])

ok('adult1 can create profile', (await ins(U.adult1, 'Anna', yearsAgo(25))).ok)
ok('adult2 can create profile', (await ins(U.adult2, 'Bruno', yearsAgo(30))).ok)
ok('teen1 (16) can create profile', (await ins(U.teen1, 'Carla', yearsAgo(16, 5))).ok)
ok('teen2 (17) can create profile', (await ins(U.teen2, 'Dario', yearsAgo(17, 5))).ok)
const kid = await ins(U.kid, 'Ezio', yearsAgo(15)); ok('under 16 rejected', !kid.ok && /16 anni/.test(kid.err))
{ const other = crypto.randomUUID(); await db.query('insert into auth.users values ($1)', [other]); const r = await tryq(U.adult1, `insert into profiles (id, name, birth_date, dilemma) values ($1, 'Fake', $2, 'q')`, [other, yearsAgo(30)]); ok('cannot create profile for someone else', !r.ok) }
const teenIntent = await db.query(`select intent from profiles where id = $1`, [U.teen1]); ok('16-17 forced to friends only', JSON.stringify(teenIntent.rows[0].intent) === '["friends"]' || teenIntent.rows[0].intent === '{friends}')

const see = async (viewer) => (await tryq(viewer, 'select name from profiles order by name')).rows.map(r => r.name).join(',')
ok('adult sees only adults: ' + await see(U.adult1), (await see(U.adult1)) === 'Anna,Bruno')
ok('teen sees only teens: ' + await see(U.teen1), (await see(U.teen1)) === 'Carla,Dario')

const selfVerify = await tryq(U.adult1, `update profiles set verified = true, karma = 999 where id = $1 returning verified, karma`, [U.adult1])
ok('client cannot self-verify or set karma', selfVerify.ok && selfVerify.rows[0].verified === false && selfVerify.rows[0].karma === 100)

// likes
ok('adult can like adult', (await tryq(U.adult1, `insert into likes (from_user, to_user, question, answer) values ($1, $2, 'Alba o tramonto?', 'Tramonto sul mare')`, [U.adult1, U.adult2])).ok)
ok('adult cannot like teen', !(await tryq(U.adult1, `insert into likes (from_user, to_user, question, answer) values ($1, $2, 'q', 'risposta')`, [U.adult1, U.teen1])).ok)
ok('unverified teen cannot like', !(await tryq(U.teen1, `insert into likes (from_user, to_user, question, answer) values ($1, $2, 'q', 'risposta')`, [U.teen1, U.teen2])).ok)
await db.exec(`set test.role='service_role'`); await db.query(`update profiles set verified = true, verified_at = now() where id in ($1, $2)`, [U.teen1, U.teen2]); await db.exec(`reset test.role`)
ok('verified teen can like teen', (await tryq(U.teen1, `insert into likes (from_user, to_user, question, answer) values ($1, $2, 'q', 'risposta ok')`, [U.teen1, U.teen2])).ok)

// accept like -> chat
const likeId = (await db.query(`select id from likes where from_user = $1 and to_user = $2`, [U.adult1, U.adult2])).rows[0].id
const acc = await tryq(U.adult2, `select accept_like($1) as chat`, [likeId]); ok('recipient accepts like -> chat', acc.ok)
const chatId = acc.rows?.[0]?.chat
ok('chat visible to members', (await tryq(U.adult1, `select id from chats`)).rows.length === 1)
ok('chat invisible to others', (await tryq(U.teen1, `select id from chats`)).rows.length === 0)
ok('member can write', (await tryq(U.adult1, `insert into messages (chat_id, sender, kind, text) values ($1, $2, 'text', 'Ciao! Tramonto sabato?')`, [chatId, U.adult1])).ok)
ok('cannot spoof sender', !(await tryq(U.adult1, `insert into messages (chat_id, sender, kind, text) values ($1, $2, 'text', 'x')`, [chatId, U.adult2])).ok)
ok('dilemma message created', (await tryq(U.adult2, `select kind from messages where chat_id = $1 order by created_at`, [chatId])).rows.some((r) => r.kind === 'dilemma'))

// block hides
ok('block', (await tryq(U.adult2, `insert into blocks (blocker, blocked) values ($1, $2)`, [U.adult2, U.adult1])).ok)
ok('blocked user disappears: ' + await see(U.adult1), (await see(U.adult1)) === 'Anna')
ok('blocked user cannot write in chat', !(await tryq(U.adult1, `insert into messages (chat_id, sender, kind, text) values ($1, $2, 'text', 'ehi?')`, [chatId, U.adult1])).ok)
ok('unblock', (await tryq(U.adult2, `delete from blocks where blocker = $1`, [U.adult2])).ok)

// plans: minor daytime + public place
const at = (h) => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.toISOString().slice(0, 10)} ${String(h).padStart(2, '0')}:00:00 Europe/Rome` }
const planIns = (uid, h, habitat) => tryq(uid, `insert into plans (host, title, category, habitat, starts_at, capacity, dilemma) values ($1, 'Calcetto', 'sport', $2, $3::timestamptz, 6, 'q') returning id`, [uid, habitat, at(h)])
ok('teen plan at 22:00 rejected', !(await planIns(U.teen1, 22, 'Parco della Floridiana')).ok)
ok('teen plan in private place rejected', !(await planIns(U.teen1, 16, 'Casa mia')).ok)
const tp = await planIns(U.teen1, 16, 'Parco della Floridiana'); ok('teen daytime public plan ok', tp.ok)
ok('host auto-joined', (await db.query(`select count(*)::int c from plan_members where plan_id = $1`, [tp.rows[0].id])).rows[0].c === 1)
ok('adult cannot see teen plan', (await tryq(U.adult1, `select id from plans`)).rows.length === 0)
ok('teen sees teen plan', (await tryq(U.teen2, `select id from plans`)).rows.length === 1)
ok('adult cannot join teen plan', !(await tryq(U.adult1, `insert into plan_members (plan_id, user_id) values ($1, $2)`, [tp.rows[0].id, U.adult1])).ok)
ok('teen can join teen plan', (await tryq(U.teen2, `insert into plan_members (plan_id, user_id) values ($1, $2)`, [tp.rows[0].id, U.teen2])).ok)
ok('adult 3 plans limit', (await planIns(U.adult1, 19, 'Lungomare Caracciolo')).ok && (await planIns(U.adult1, 20, 'Lungomare Caracciolo')).ok && (await planIns(U.adult1, 21, 'Lungomare Caracciolo')).ok && !(await planIns(U.adult1, 22, 'Lungomare Caracciolo')).ok)

// swipes daily limit
await db.exec(`set test.role='service_role'`)
for (let i = 0; i < 20; i++) { const id = crypto.randomUUID(); await db.query('insert into auth.users values ($1)', [id]); await db.query(`insert into profiles (id, name, birth_date, dilemma) values ($1, 'Persona', $2, 'q')`, [id, yearsAgo(28)]) }
await db.exec(`reset test.role`)
const targets = (await db.query(`select id from profiles where name = 'Persona'`)).rows.map(r => r.id)
let swOk = 0; for (const t of targets) { if ((await tryq(U.adult1, `insert into swipes (user_id, target, kind) values ($1, $2, 'pass')`, [U.adult1, t])).ok) swOk++ }
const extra = await tryq(U.adult1, `insert into swipes (user_id, target, kind) values ($1, $2, 'pass')`, [U.adult1, U.adult2])
ok(`20 swipes per day (${swOk}) then blocked`, swOk === 20 && !extra.ok)

// reports write-only
ok('report insert', (await tryq(U.adult1, `insert into reports (reporter, reported, reason) values ($1, $2, 'Profilo falso o truffa')`, [U.adult1, U.adult2])).ok)
ok('reports not readable by users', (await tryq(U.adult1, `select * from reports`)).rows.length === 0)

// storage
ok('upload own photo', (await tryq(U.adult1, `insert into storage.objects (bucket_id, name) values ('photos', $1)`, [`${U.adult1}/a.jpg`])).ok)
ok('cannot upload into someone else folder', !(await tryq(U.adult1, `insert into storage.objects (bucket_id, name) values ('photos', $1)`, [`${U.adult2}/x.jpg`])).ok)
await db.exec(`set test.role='service_role'`); await db.query(`insert into storage.objects (bucket_id, name) values ('photos', $1), ('photos-blurred', $1)`, [`${U.teen2}/t.jpg`]); await db.exec(`reset test.role`)
ok('teen original photo hidden before match', (await tryq(U.teen1, `select name from storage.objects where bucket_id = 'photos' and name like $1`, [`${U.teen2}/%`])).rows.length === 0)
ok('teen blurred photo visible to compatible teen', (await tryq(U.teen1, `select name from storage.objects where bucket_id = 'photos-blurred' and name like $1`, [`${U.teen2}/%`])).rows.length === 1)
ok('adult cannot see teen blurred photo', (await tryq(U.adult1, `select name from storage.objects where bucket_id = 'photos-blurred' and name like $1`, [`${U.teen2}/%`])).rows.length === 0)
ok('adult1 original visible to its match adult2', (await tryq(U.adult2, `select name from storage.objects where bucket_id = 'photos' and name like $1`, [`${U.adult1}/%`])).rows.length === 1)

// funzioni dell'app (step 3.2)
{
  const A = U.adult1, B = U.adult2
  const msgs = async (uid) => (await tryq(uid, `select kind, text from messages where chat_id = $1 order by created_at`, [chatId])).rows
  ok('proposal insert', (await tryq(A, `insert into messages (chat_id, sender, kind, proposal) values ($1, $2, 'proposal', '{"title":"Tramonto","when":"sabato 19","place":"Lungomare","status":"pending"}') `, [chatId, A])).ok)
  const pid = (await db.query(`select id from messages where kind = 'proposal'`)).rows[0].id
  ok('sender cannot accept own proposal', !(await tryq(A, `select accept_proposal($1)`, [pid])).ok)
  ok('peer accepts proposal', (await tryq(B, `select accept_proposal($1)`, [pid])).ok)
  ok('clock stopped after proposal', (await db.query(`select clock_stopped from chats where id = $1`, [chatId])).rows[0].clock_stopped === true)
  ok('karma +5 both', (await db.query(`select karma from profiles where id = $1`, [B])).rows[0].karma === 105)
  ok('outsider cannot finish chat', !(await tryq(U.teen1, `select finish_chat($1, 'closed', 'x')`, [chatId])).ok)
  ok('internal helpers not callable', !(await tryq(A, `select add_karma($1, 1000)`, [A])).ok)
  ok('finish chat elegantly', (await tryq(A, `select finish_chat($1, 'closed', 'Chiusura con eleganza')`, [chatId])).ok)
  ok('both members closed', (await db.query(`select count(*)::int c from chat_members where chat_id = $1 and status = 'closed'`, [chatId])).rows[0].c === 2)
  ok('system message added', (await msgs(A)).some((m) => m.kind === 'system'))
  // like reciproco: niente chat doppie
  await tryq(A, `insert into likes (from_user, to_user, question, answer) values ($1, $2, 'q', 'secondo giro')`, [B, A]).catch(() => {})
  await db.query(`delete from likes`)
  await tryq(A, `insert into likes (from_user, to_user, question, answer) values ($1, $2, 'q', 'risposta di A')`, [A, B])
  await tryq(B, `insert into likes (from_user, to_user, question, answer) values ($1, $2, 'q', 'risposta di B')`, [B, A])
  const lAB = (await db.query(`select id from likes where from_user = $1`, [A])).rows[0].id
  const c2 = (await tryq(B, `select accept_like($1) as c`, [lAB])).rows?.[0]?.c
  ok('mutual like -> both matched', (await db.query(`select count(*)::int c from likes where status = 'matched'`)).rows[0].c === 2)
  ok('new chat has spark + dilemma', JSON.stringify((await tryq(A, `select kind from messages where chat_id = $1 order by created_at`, [c2])).rows.map((r) => r.kind)) === '["system","dilemma"]')
  ok('48h timer set', (await db.query(`select deadline is not null d from chats where id = $1`, [c2])).rows[0].d === true)
  const persona = (await db.query(`select id from profiles where name = 'Persona' limit 1`)).rows[0].id
  await db.query(`insert into likes (from_user, to_user, question, answer) values ($1, $2, 'q', 'ciao Bruno')`, [persona, B])
  const lx = (await db.query(`select id from likes where answer = 'ciao Bruno'`)).rows[0].id
  const k0 = (await db.query(`select karma from profiles where id = $1`, [B])).rows[0].karma
  ok('decline like +3 karma', (await tryq(B, `select decline_like($1)`, [lx])).ok && (await db.query(`select karma from profiles where id = $1`, [B])).rows[0].karma === k0 + 3)
  { const ka = (await db.query(`select karma from profiles where id = $1`, [A])).rows[0].karma; await tryq(A, `select decline_like($1)`, [lx]); ok('cannot decline others likes', (await db.query(`select karma from profiles where id = $1`, [A])).rows[0].karma === ka) }
  ok('birth date not readable by others', !(await tryq(A, `select birth_date from profiles where id = $1`, [B])).ok)
  { const r = await tryq(A, `select id, age, birth_date from profile_ages()`); ok('ages visible, own birth date only', r.ok && r.rows.some((x) => x.id === B && x.age === 30 && x.birth_date === null) && r.rows.some((x) => x.id === A && x.birth_date)) }
  // blocco
  ok('block_user', (await tryq(B, `select block_user($1)`, [A])).ok)
  ok('chat closed after block', (await db.query(`select count(*)::int c from chat_members where chat_id = $1 and status = 'closed'`, [c2])).rows[0].c === 2)
  ok('likes removed after block', (await db.query(`select count(*)::int c from likes where (from_user = $1 and to_user = $2) or (from_user = $2 and to_user = $1)`, [A, B])).rows[0].c === 0)
  await tryq(B, `delete from blocks where blocker = $1`, [B])
  // voce
  ok('upload own voice', (await tryq(A, `insert into storage.objects (bucket_id, name) values ('voice', $1)`, [`${c2}/${A}/v.webm`])).ok)
  ok('cannot upload voice as someone else', !(await tryq(A, `insert into storage.objects (bucket_id, name) values ('voice', $1)`, [`${c2}/${B}/v.webm`])).ok)
  // verifica
  ok('verification needs photos', !(await tryq(A, `select complete_verification('selfie')`)).ok)
  await tryq(A, `insert into photos (owner, position, path, blurred_path) values ($1, 0, 'p', 'b')`, [A])
  ok('verification ok with photos', (await tryq(A, `select complete_verification('selfie')`)).ok && (await db.query(`select verified from profiles where id = $1`, [A])).rows[0].verified === true)
  // elimina account
  ok('delete my account', (await tryq(A, `select delete_my_account()`)).ok)
  ok('profile gone', (await db.query(`select count(*)::int c from profiles where id = $1`, [A])).rows[0].c === 0)
  ok('no orphan messages from deleted user', (await db.query(`select count(*)::int c from messages where sender is null and kind <> 'system'`)).rows[0].c === 0)
  ok('peer sees chat closed', (await db.query(`select status from chat_members where chat_id = $1 and user_id = $2`, [c2, B])).rows[0].status === 'closed')
}

console.log(failures ? `\n${failures} controlli falliti` : '\nTutti i controlli superati')
process.exit(failures ? 1 : 0)
