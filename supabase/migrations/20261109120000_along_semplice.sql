-- ALONG · Fase 3B: app 1:1 più semplice
-- like con un tocco (+ "Questo o quello" facoltativo), foto visibili a chi è compatibile,
-- niente timer di 48 ore, 3 chat attive per tutti (pagare non dà più possibilità)

-- "Questo o quello" sul profilo: { question, a, b }
alter table public.profiles add column if not exists this_or_that jsonb
  check (this_or_that is null or (
    jsonb_typeof(this_or_that) = 'object'
    and char_length(this_or_that->>'question') between 3 and 80
    and char_length(this_or_that->>'a') between 1 and 30
    and char_length(this_or_that->>'b') between 1 and 30));
alter table public.profiles alter column dilemma drop not null;
alter table public.profiles alter column dilemma set default '';
grant select (this_or_that) on public.profiles to authenticated;

-- il like non richiede più una risposta scritta: domanda e scelta sono facoltative
alter table public.likes alter column question drop not null;
alter table public.likes alter column answer drop not null;
alter table public.likes drop constraint if exists likes_answer_check;
alter table public.likes add constraint likes_answer_len check (answer is null or char_length(answer) between 1 and 200);

-- 3 chat attive per tutti
create or replace function public.slot_limit(uid uuid) returns integer
language sql stable as $$ select 3 $$;

-- foto visibili ai profili compatibili (stesso gruppo d'età, nessun blocco)
drop policy if exists "foto originali: tu e i tuoi match" on storage.objects;
create policy "foto: profili compatibili" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.can_see(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- match: nessun timer; se c'è la scelta del "Questo o quello" diventa il primo messaggio
create or replace function public.accept_like(like_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  l public.likes;
  cid uuid;
  me uuid := auth.uid();
begin
  select * into l from public.likes where id = like_id and to_user = me and status = 'pending' for update;
  if not found then raise exception 'Like non trovato'; end if;
  if not public.can_see(me, l.from_user) then raise exception 'Profilo non disponibile'; end if;
  if not public.can_interact(me) then raise exception 'Verifica il profilo per accettare match'; end if;

  select a.chat_id into cid from public.chat_members a join public.chat_members b on a.chat_id = b.chat_id
    join public.chats c on c.id = a.chat_id
    where c.kind = 'match' and a.user_id = me and b.user_id = l.from_user and a.status in ('active', 'waiting') limit 1;
  if cid is not null then
    update public.likes set status = 'matched' where id = like_id;
    return cid;
  end if;

  insert into public.chats (kind, mode, deadline) values ('match', 'remote', null) returning id into cid;
  insert into public.chat_members (chat_id, user_id, status) values
    (cid, me, case when public.active_slots(me) >= public.slot_limit(me) then 'waiting'::public.member_status else 'active'::public.member_status end),
    (cid, l.from_user, case when public.active_slots(l.from_user) >= public.slot_limit(l.from_user) then 'waiting'::public.member_status else 'active'::public.member_status end);

  perform public.system_message(cid, 'È un match! Rompi il ghiaccio.');
  if l.answer is not null then
    insert into public.messages (chat_id, sender, kind, question, text, created_at)
    values (cid, l.from_user, 'dilemma', l.question, l.answer, clock_timestamp());
  end if;

  update public.likes set status = 'matched' where id = like_id;
  update public.likes set status = 'matched' where from_user = me and to_user = l.from_user and status = 'pending';
  return cid;
end $$;

create or replace function public.promote_waiting(uid uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare promoted integer := 0; r record;
begin
  for r in select cm.chat_id from public.chat_members cm
           where cm.user_id = uid and cm.status = 'waiting' order by cm.joined_at loop
    exit when public.active_slots(uid) >= public.slot_limit(uid);
    update public.chat_members set status = 'active' where chat_id = r.chat_id and user_id = uid;
    perform public.system_message(r.chat_id, 'Uno slot si è liberato: la conversazione è attiva.');
    promoted := promoted + 1;
  end loop;
  return promoted;
end $$;

create or replace function public.activate_chat(cid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if public.active_slots(me) >= public.slot_limit(me) then return false; end if;
  update public.chat_members set status = 'active' where chat_id = cid and user_id = me and status = 'waiting';
  return found;
end $$;

-- chiusura gentile: l'altra persona riceve il congedo e un messaggio chiaro
create or replace function public.finish_chat(cid uuid, new_status public.member_status, reason text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m record;
begin
  if not public.is_member(cid, me) then raise exception 'Non sei in questa chat'; end if;
  if new_status not in ('closed', 'evolved') then raise exception 'Stato non valido'; end if;
  update public.chat_members set status = new_status, closed_reason = reason where chat_id = cid and status in ('active', 'waiting');
  perform public.system_message(cid, 'Conversazione chiusa con gentilezza.');
  for m in select user_id from public.chat_members where chat_id = cid loop
    perform public.promote_waiting(m.user_id);
  end loop;
end $$;

-- le chat esistenti non scadono più
update public.chats set deadline = null where deadline is not null;
