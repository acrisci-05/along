-- ALONG · funzioni per l'app vera (step 3.2)
-- Le operazioni che toccano più righe o campi protetti passano da qui (security definer),
-- con i controlli di permesso fatti dentro la funzione.

-- I campi protetti del profilo (verifica, karma, Forever) si possono cambiare
-- solo dalla chiave di servizio o da queste funzioni fidate.
create or replace function public.profiles_guard() returns trigger
language plpgsql as $$
begin
  if public.age_of(new.birth_date) < 16 then
    raise exception 'ALONG è vietata ai minori di 16 anni';
  end if;
  if public.age_of(new.birth_date) < 18 then
    new.intent := '{friends}';
  end if;
  if coalesce(auth.role(), '') = 'service_role' or current_setting('along.trusted', true) = 'on' then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.verified := old.verified;
    new.verified_at := old.verified_at;
    new.verified_photo := old.verified_photo;
    new.karma := old.karma;
    new.lifetime := old.lifetime;
    new.birth_date := old.birth_date;
  else
    new.verified := false;
    new.verified_at := null;
    new.verified_photo := null;
    new.karma := 100;
    new.lifetime := false;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.trusted() returns void
language sql as $$ select set_config('along.trusted', 'on', true) $$;

create or replace function public.add_karma(uid uuid, delta integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.trusted();
  update public.profiles set karma = greatest(0, karma + delta) where id = uid;
end $$;

-- messaggio di sistema (sender null)
create or replace function public.system_message(cid uuid, body text) returns void
language sql security definer set search_path = public as $$
  insert into public.messages (chat_id, sender, kind, text) values (cid, null, 'system', body)
$$;

-- porta in "attiva" le chat in Sala d'Attesa finché ci sono slot liberi
create or replace function public.promote_waiting(uid uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare promoted integer := 0; r record;
begin
  for r in select cm.chat_id from public.chat_members cm
           where cm.user_id = uid and cm.status = 'waiting' order by cm.joined_at loop
    exit when public.active_slots(uid) >= public.slot_limit(uid);
    update public.chat_members set status = 'active' where chat_id = r.chat_id and user_id = uid;
    update public.chats set deadline = case when mode = 'local' then now() + interval '48 hours' end where id = r.chat_id and deadline is null;
    promoted := promoted + 1;
  end loop;
  return promoted;
end $$;

-- chiude una chat per tutti: 'closed' (congedo elegante, +15) o 'evolved' (vi siete visti, +10)
create or replace function public.finish_chat(cid uuid, new_status public.member_status, reason text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m record;
begin
  if not public.is_member(cid, me) then raise exception 'Non sei in questa chat'; end if;
  if new_status not in ('closed', 'evolved') then raise exception 'Stato non valido'; end if;
  update public.chat_members set status = new_status, closed_reason = reason where chat_id = cid and status in ('active', 'waiting');
  perform public.system_message(cid, case when new_status = 'evolved' then 'Missione compiuta: vi siete visti o avete scambiato i contatti. Chat archiviata.' else 'Conversazione chiusa con eleganza.' end);
  perform public.add_karma(me, case when new_status = 'closed' then 15 else 10 end);
  for m in select user_id from public.chat_members where chat_id = cid loop
    perform public.promote_waiting(m.user_id);
  end loop;
end $$;

-- ferma il timer 48h e conferma il piano collegato
create or replace function public.stop_clock(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not public.is_member(cid, me) then raise exception 'Non sei in questa chat'; end if;
  update public.chats set clock_stopped = true where id = cid;
  update public.plans set confirmed = true where id = (select plan_id from public.chats where id = cid) and host = me;
  perform public.system_message(cid, 'Ritrovo confermato: il timer di 48 ore è fermo.');
  perform public.add_karma(me, 5);
end $$;

-- l'altra persona accetta la proposta d'uscita
create or replace function public.accept_proposal(mid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); msg public.messages;
begin
  select * into msg from public.messages where id = mid and kind = 'proposal' for update;
  if not found then raise exception 'Proposta non trovata'; end if;
  if not public.is_member(msg.chat_id, me) or msg.sender = me then raise exception 'Non puoi accettare questa proposta'; end if;
  update public.messages set proposal = jsonb_set(coalesce(proposal, '{}'::jsonb), '{status}', '"accepted"') where id = mid;
  update public.chats set clock_stopped = true where id = msg.chat_id;
  perform public.system_message(msg.chat_id, format('Uscita confermata: %s, %s, %s. Timer fermato.', msg.proposal->>'title', msg.proposal->>'when', msg.proposal->>'place'));
  perform public.add_karma(me, 5);
  perform public.add_karma(msg.sender, 5);
end $$;

-- attiva una chat in Sala d'Attesa se c'è uno slot libero
create or replace function public.activate_chat(cid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if public.active_slots(me) >= public.slot_limit(me) then return false; end if;
  update public.chat_members set status = 'active' where chat_id = cid and user_id = me and status = 'waiting';
  update public.chats set deadline = case when mode = 'local' then now() + interval '48 hours' end where id = cid and deadline is null;
  return found;
end $$;

-- timer scaduti senza ritrovo → chat scaduta, poi promozione della Sala d'Attesa
create or replace function public.sweep_my_chats() returns integer
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n integer := 0; r record;
begin
  for r in select c.id from public.chats c join public.chat_members cm on cm.chat_id = c.id
           where cm.user_id = me and cm.status = 'active' and c.mode = 'local'
             and c.deadline is not null and c.deadline < now() and not c.clock_stopped loop
    update public.chat_members set status = 'expired', closed_reason = 'Timer 48h scaduto' where chat_id = r.id and status = 'active';
    perform public.system_message(r.id, 'Il timer di 48 ore è scaduto senza un ritrovo confermato.');
    n := n + 1;
  end loop;
  perform public.promote_waiting(me);
  return n;
end $$;

-- unisciti a un piano rispondendo al dilemma: entri nella crew e nella chat di gruppo
create or replace function public.join_plan(pid uuid, answer text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p public.plans; cid uuid;
begin
  select * into p from public.plans where id = pid;
  if not found then raise exception 'Piano non trovato'; end if;
  if not public.can_see(me, p.host) then raise exception 'Piano non disponibile'; end if;
  if not public.can_interact(me) then raise exception 'Verifica il profilo per unirti'; end if;
  if exists (select 1 from public.plan_members m where m.plan_id = pid and not public.can_see(me, m.user_id)) then raise exception 'Piano non disponibile'; end if;
  if public.is_minor(me) and p.mode = 'local'
     and (extract(hour from p.starts_at at time zone 'Europe/Rome') < 8 or extract(hour from p.starts_at at time zone 'Europe/Rome') > 20) then
    raise exception 'Sotto i 18 anni solo piani tra le 8 e le 20';
  end if;
  if (select count(*) from public.plan_members where plan_id = pid) >= p.capacity
     and not exists (select 1 from public.plan_members where plan_id = pid and user_id = me) then
    raise exception 'Crew al completo';
  end if;
  insert into public.plan_members (plan_id, user_id) values (pid, me) on conflict do nothing;

  select id into cid from public.chats where plan_id = pid and kind = 'crew' limit 1;
  if cid is null then
    insert into public.chats (kind, plan_id, mode, deadline)
    values ('crew', pid, p.mode, case when p.mode = 'local' then now() + interval '48 hours' end) returning id into cid;
    insert into public.chat_members (chat_id, user_id, status) select cid, user_id, 'active' from public.plan_members where plan_id = pid
    on conflict do nothing;
  end if;
  insert into public.chat_members (chat_id, user_id, status)
  values (cid, me, case when public.active_slots(me) >= public.slot_limit(me) then 'waiting'::public.member_status else 'active'::public.member_status end)
  on conflict do nothing;
  insert into public.messages (chat_id, sender, kind, question, text) values (cid, me, 'dilemma', p.dilemma, answer);
  return cid;
end $$;

-- verifica: per ora l'esito è simulato (approvato) e nessuna immagine arriva al server.
-- Va sostituita dal webhook del fornitore di verifica prima del lancio.
create or replace function public.complete_verification(method text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); main_photo uuid;
begin
  select id into main_photo from public.photos where owner = me order by position limit 1;
  if main_photo is null then raise exception 'Servono le foto per verificarti'; end if;
  if public.is_minor(me) and method <> 'selfie+document' then raise exception 'Sotto i 18 anni serve anche il documento'; end if;
  insert into public.verifications (user_id, method, result) values (me, method, 'approved');
  perform public.trusted();
  update public.profiles set verified = true, verified_at = now(), verified_photo = main_photo where id = me;
end $$;

-- eliminazione immediata dell'account (i file vanno rimossi prima dal client con l'API dello storage)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Non autenticato'; end if;
  delete from public.reports where reporter = me;
  delete from auth.users where id = me;   -- a cascata: profilo, foto, like, chat, messaggi, blocchi
end $$;

revoke all on function public.trusted() from public, anon, authenticated;
revoke all on function public.add_karma(uuid, integer) from public, anon, authenticated;
revoke all on function public.system_message(uuid, text) from public, anon, authenticated;
revoke all on function public.promote_waiting(uuid) from public, anon, authenticated;
grant execute on function public.finish_chat(uuid, public.member_status, text) to authenticated;
grant execute on function public.stop_clock(uuid) to authenticated;
grant execute on function public.accept_proposal(uuid) to authenticated;
grant execute on function public.activate_chat(uuid) to authenticated;
grant execute on function public.sweep_my_chats() to authenticated;
grant execute on function public.join_plan(uuid, text) to authenticated;
grant execute on function public.complete_verification(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.accept_like(uuid) to authenticated;

-- le chat di crew e le chat promosse arrivano in tempo reale
alter publication supabase_realtime add table public.chats;
