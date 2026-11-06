-- ALONG · schema iniziale (step 3.1)
-- Regole chiave applicate dal database, non solo dall'interfaccia:
--   * età minima 16 anni; 16-17 e 18+ in gruppi separati che non si vedono mai
--   * chi è bloccato (in un senso o nell'altro) è invisibile
--   * 16-17: solo modalità Amici, verifica obbligatoria per scrivere/rispondere, piani solo 8–20
--   * massimo 3 chat attive (5 con Forever), selezione di 20 profili al giorno
--   * foto: originali visibili solo al proprietario e ai match; versione sfocata ai compatibili


-- ───────────────────────── tipi ─────────────────────────
create type public.gender as enum ('f', 'm', 'nb');
create type public.intent as enum ('date', 'friends');
create type public.habit as enum ('si', 'a volte', 'no');
create type public.plan_mode as enum ('local', 'remote');
create type public.like_status as enum ('pending', 'matched', 'declined');
create type public.chat_kind as enum ('match', 'crew');
create type public.member_status as enum ('active', 'waiting', 'closed', 'evolved', 'expired');
create type public.message_kind as enum ('text', 'voice', 'system', 'dilemma', 'track', 'farewell', 'proposal');
create type public.swipe_kind as enum ('pass', 'like');

-- ───────────────────────── profili ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 24),
  birth_date date not null,
  gender public.gender not null default 'nb',
  intent public.intent[] not null default '{friends}',
  show_pref text not null default 'all' check (show_pref in ('all', 'f', 'm')),
  city text not null default 'Napoli',
  bio text not null default '' check (char_length(bio) <= 160),
  work text check (char_length(work) <= 60),
  languages text[] not null default '{}',
  smoke public.habit,
  drink public.habit,
  interests text[] not null default '{}' check (cardinality(interests) <= 8),
  habitats text[] not null default '{}' check (cardinality(habitats) <= 5),
  dilemma text not null,
  avatar jsonb,                       -- avatar illustrato (look + hue) se non ci sono foto
  verified boolean not null default false,
  verified_at timestamptz,
  verified_photo uuid,                -- foto principale su cui è stata fatta la verifica
  karma integer not null default 100,
  lifetime boolean not null default false,
  read_receipts boolean not null default true,
  typing_indicator boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- età e gruppo calcolati sempre "oggi"
create or replace function public.age_of(d date) returns integer
language sql stable as $$ select extract(year from age(current_date, d))::int $$;

create or replace function public.is_minor(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.age_of(birth_date) < 18 from public.profiles where id = uid
$$;

create or replace function public.profiles_guard() returns trigger
language plpgsql as $$
begin
  if public.age_of(new.birth_date) < 16 then
    raise exception 'ALONG è vietata ai minori di 16 anni';
  end if;
  -- 16-17: solo Amici
  if public.age_of(new.birth_date) < 18 then
    new.intent := '{friends}';
  end if;
  -- campi che il client non può impostare da solo (la chiave di servizio sì)
  if coalesce(auth.role(), '') = 'service_role' then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.verified := old.verified;
    new.verified_at := old.verified_at;
    new.verified_photo := old.verified_photo;
    new.karma := old.karma;
    new.lifetime := old.lifetime;
    new.birth_date := old.birth_date;   -- la data di nascita non si modifica
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

create trigger profiles_guard before insert or update on public.profiles
for each row execute function public.profiles_guard();

-- ───────────────────────── blocchi e segnalazioni ─────────────────────────
create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles (id) on delete cascade,
  reported uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) <= 80),
  details text check (char_length(details) <= 400),
  created_at timestamptz not null default now()
);

-- chi può vedere chi: stesso gruppo d'età e nessun blocco
create or replace function public.can_see(viewer uuid, target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select viewer = target or (
    exists (select 1 from public.profiles v, public.profiles t
            where v.id = viewer and t.id = target
              and (public.age_of(v.birth_date) < 18) = (public.age_of(t.birth_date) < 18))
    and not exists (select 1 from public.blocks b
                    where (b.blocker = viewer and b.blocked = target)
                       or (b.blocker = target and b.blocked = viewer))
  )
$$;

create or replace function public.can_interact(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  -- 16-17 devono essere verificati prima di scrivere/rispondere
  select coalesce((select public.age_of(birth_date) >= 18 or verified from public.profiles where id = uid), false)
$$;

-- ───────────────────────── foto e verifiche ─────────────────────────
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles (id) on delete cascade,
  position smallint not null check (position between 0 and 5),
  path text not null,            -- photos/<owner>/<id>.jpg (originale, privato)
  blurred_path text not null,    -- photos-blurred/<owner>/<id>.jpg (sfocata)
  created_at timestamptz not null default now(),
  unique (owner, position) deferrable initially deferred
);

-- nessuna immagine: solo l'esito
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  method text not null check (method in ('selfie', 'selfie+document')),
  result text not null check (result in ('approved', 'rejected', 'pending')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── piani ─────────────────────────
create table public.habitats (
  name text primary key,
  district text not null,
  city text not null default 'Napoli',
  public_place boolean not null default true
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  host uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 60),
  category text not null,
  mode public.plan_mode not null default 'local',
  city text not null default 'Napoli',
  habitat text not null,
  starts_at timestamptz not null,
  when_label text,
  capacity smallint not null check (capacity between 2 and 8),
  vibes text[] not null default '{}' check (cardinality(vibes) <= 3),
  dilemma text not null,
  privacy boolean not null default false,
  cost numeric(8, 2),
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.plan_members (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create or replace function public.plans_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare h numeric;
begin
  if public.is_minor(new.host) then
    h := extract(hour from new.starts_at at time zone 'Europe/Rome') + extract(minute from new.starts_at at time zone 'Europe/Rome') / 60;
    if new.mode = 'local' and (h < 8 or h > 20) then
      raise exception 'Sotto i 18 anni i piani si fanno tra le 8 e le 20';
    end if;
    if new.mode = 'local' and not exists (select 1 from public.habitats where name = new.habitat and public_place) then
      raise exception 'Sotto i 18 anni i piani si fanno solo in luoghi pubblici';
    end if;
  end if;
  -- limite piani attivi (Free 3)
  if tg_op = 'INSERT' and not (select lifetime from public.profiles where id = new.host)
     and (select count(*) from public.plans where host = new.host and starts_at > now() - interval '3 hours') >= 3 then
    raise exception 'Hai già 3 piani attivi';
  end if;
  return new;
end $$;

create trigger plans_guard before insert or update on public.plans
for each row execute function public.plans_guard();

-- l'host entra subito nella crew
create or replace function public.plans_add_host() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.plan_members (plan_id, user_id) values (new.id, new.host) on conflict do nothing;
  return new;
end $$;

create trigger plans_add_host after insert on public.plans
for each row execute function public.plans_add_host();

-- ───────────────────────── scopri: swipe e like ─────────────────────────
create table public.swipes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target uuid not null references public.profiles (id) on delete cascade,
  kind public.swipe_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target)
);

create or replace function public.swipes_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.swipes
      where user_id = new.user_id and (created_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date) >= 20 then
    raise exception 'Selezione di oggi finita: 20 profili al giorno';
  end if;
  return new;
end $$;

create trigger swipes_guard before insert on public.swipes
for each row execute function public.swipes_guard();

-- un like è sempre una risposta al dilemma dell'altra persona
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  question text not null,
  answer text not null check (char_length(answer) between 3 and 200),
  status public.like_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);

-- ───────────────────────── chat ─────────────────────────
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  kind public.chat_kind not null default 'match',
  plan_id uuid references public.plans (id) on delete set null,
  mode public.plan_mode not null default 'local',
  deadline timestamptz,               -- timer 48h (solo local)
  clock_stopped boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.chat_members (
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.member_status not null default 'active',
  closed_reason text,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create or replace function public.is_member(cid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_members where chat_id = cid and user_id = uid)
$$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  sender uuid references public.profiles (id) on delete set null,   -- null = messaggio di sistema
  kind public.message_kind not null default 'text',
  text text check (char_length(text) <= 2000),
  question text,
  audio_path text,                    -- voice/<chat>/<id>.webm
  duration smallint,
  wave smallint[],
  proposal jsonb,                     -- { title, when, place, status }
  created_at timestamptz not null default now()
);

create index messages_chat_created on public.messages (chat_id, created_at);

-- slot attivi: 3 (Free) o 5 (Forever)
create or replace function public.slot_limit(uid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case when lifetime then 5 else 3 end from public.profiles where id = uid
$$;

create or replace function public.active_slots(uid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.chat_members where user_id = uid and status = 'active'
$$;

-- accetta un like ricevuto: crea la chat 1:1 (o la mette in Sala d'Attesa se gli slot sono pieni)
create or replace function public.accept_like(like_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  l public.likes;
  cid uuid;
  me uuid := auth.uid();
  local_mode boolean;
begin
  select * into l from public.likes where id = like_id and to_user = me and status = 'pending' for update;
  if not found then raise exception 'Like non trovato'; end if;
  if not public.can_see(me, l.from_user) then raise exception 'Profilo non disponibile'; end if;
  if not public.can_interact(me) then raise exception 'Verifica il profilo per accettare match'; end if;

  select (a.city = b.city) into local_mode from public.profiles a, public.profiles b where a.id = me and b.id = l.from_user;

  insert into public.chats (kind, mode, deadline)
  values ('match', case when local_mode then 'local'::public.plan_mode else 'remote'::public.plan_mode end,
          case when local_mode then now() + interval '48 hours' end)
  returning id into cid;

  insert into public.chat_members (chat_id, user_id, status) values
    (cid, me, case when public.active_slots(me) >= public.slot_limit(me) then 'waiting'::public.member_status else 'active'::public.member_status end),
    (cid, l.from_user, case when public.active_slots(l.from_user) >= public.slot_limit(l.from_user) then 'waiting'::public.member_status else 'active'::public.member_status end);

  insert into public.messages (chat_id, sender, kind, question, text)
  values (cid, l.from_user, 'dilemma', l.question, l.answer);

  update public.likes set status = 'matched' where id = like_id;
  return cid;
end $$;

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.photos enable row level security;
alter table public.verifications enable row level security;
alter table public.habitats enable row level security;
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.swipes enable row level security;
alter table public.likes enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;

-- profili: vedi te stess* e chi è compatibile
create policy "profili visibili se compatibili" on public.profiles for select to authenticated
  using (public.can_see(auth.uid(), id));
create policy "crea il tuo profilo" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "modifica il tuo profilo" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "elimina il tuo profilo" on public.profiles for delete to authenticated
  using (id = auth.uid());

-- blocchi: solo i tuoi
create policy "i tuoi blocchi" on public.blocks for select to authenticated using (blocker = auth.uid());
create policy "blocca" on public.blocks for insert to authenticated with check (blocker = auth.uid());
create policy "sblocca" on public.blocks for delete to authenticated using (blocker = auth.uid());

-- segnalazioni: si inviano, non si leggono (le gestisce la moderazione con la chiave di servizio)
create policy "segnala" on public.reports for insert to authenticated
  with check (reporter = auth.uid() and reporter <> reported);

-- foto: righe visibili ai compatibili (i file sono protetti dalle regole dello storage)
create policy "foto visibili ai compatibili" on public.photos for select to authenticated
  using (public.can_see(auth.uid(), owner));
create policy "gestisci le tue foto" on public.photos for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- verifiche: solo le tue, scritte dal servizio di verifica (chiave di servizio)
create policy "le tue verifiche" on public.verifications for select to authenticated using (user_id = auth.uid());

-- habitat: elenco pubblico
create policy "habitat leggibili" on public.habitats for select to authenticated using (true);

-- piani: visibili se l'host e tutti i membri sono compatibili
create policy "piani visibili" on public.plans for select to authenticated
  using (public.can_see(auth.uid(), host)
         and not exists (select 1 from public.plan_members m where m.plan_id = plans.id and not public.can_see(auth.uid(), m.user_id)));
create policy "crea piani" on public.plans for insert to authenticated with check (host = auth.uid());
create policy "modifica i tuoi piani" on public.plans for update to authenticated using (host = auth.uid()) with check (host = auth.uid());
create policy "elimina i tuoi piani" on public.plans for delete to authenticated using (host = auth.uid());

create policy "membri visibili" on public.plan_members for select to authenticated
  using (public.can_see(auth.uid(), user_id));
create policy "unisciti a un piano" on public.plan_members for insert to authenticated
  with check (
    user_id = auth.uid() and public.can_interact(auth.uid())
    and exists (select 1 from public.plans p where p.id = plan_id and public.can_see(auth.uid(), p.host)
                and (not public.is_minor(auth.uid()) or p.mode = 'remote'
                     or extract(hour from p.starts_at at time zone 'Europe/Rome') between 8 and 20))
    and (select count(*) from public.plan_members m where m.plan_id = plan_members.plan_id)
        < (select capacity from public.plans p where p.id = plan_id)
  );
create policy "lascia un piano" on public.plan_members for delete to authenticated using (user_id = auth.uid());

-- swipe: solo i tuoi, su persone compatibili
create policy "i tuoi swipe" on public.swipes for select to authenticated using (user_id = auth.uid());
create policy "swipe" on public.swipes for insert to authenticated
  with check (user_id = auth.uid() and public.can_see(auth.uid(), target));

-- like: chi li manda e chi li riceve
create policy "like visibili a mittente e destinatario" on public.likes for select to authenticated
  using ((from_user = auth.uid() or to_user = auth.uid()) and public.can_see(from_user, to_user));
create policy "rispondi al dilemma" on public.likes for insert to authenticated
  with check (from_user = auth.uid() and public.can_see(auth.uid(), to_user) and public.can_interact(auth.uid()));
create policy "rifiuta con gentilezza" on public.likes for update to authenticated
  using (to_user = auth.uid()) with check (to_user = auth.uid() and status = 'declined');

-- chat: solo i membri
create policy "chat dei membri" on public.chats for select to authenticated using (public.is_member(id, auth.uid()));
create policy "ferma il timer" on public.chats for update to authenticated
  using (public.is_member(id, auth.uid())) with check (public.is_member(id, auth.uid()));

create policy "membri della chat" on public.chat_members for select to authenticated
  using (public.is_member(chat_id, auth.uid()));
create policy "aggiorna il tuo stato in chat" on public.chat_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "leggi i messaggi" on public.messages for select to authenticated
  using (public.is_member(chat_id, auth.uid()));
create policy "scrivi messaggi" on public.messages for insert to authenticated
  with check (
    sender = auth.uid()
    and public.can_interact(auth.uid())
    and exists (select 1 from public.chat_members m where m.chat_id = messages.chat_id and m.user_id = auth.uid() and m.status = 'active')
    and not exists (select 1 from public.chat_members o where o.chat_id = messages.chat_id and o.user_id <> auth.uid()
                    and not public.can_see(auth.uid(), o.user_id))
    -- 16-17: niente vocali nelle chat 1:1
    and not (kind = 'voice' and public.is_minor(auth.uid())
             and (select count(*) from public.chat_members c where c.chat_id = messages.chat_id) = 2)
  );

-- ───────────────────────── storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('photos', 'photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('photos-blurred', 'photos-blurred', false, 524288, array['image/jpeg', 'image/webp']),
  ('voice', 'voice', false, 5242880, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do nothing;

-- chi ha un match (chat in comune) con il proprietario delle foto
create or replace function public.has_match_with(uid uuid, other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select uid = other or exists (
    select 1 from public.chat_members a join public.chat_members b on a.chat_id = b.chat_id
    where a.user_id = uid and b.user_id = other)
$$;

-- percorso: <bucket>/<owner uuid>/<file>
create policy "carica le tue foto" on storage.objects for insert to authenticated
  with check (bucket_id in ('photos', 'photos-blurred') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "elimina le tue foto" on storage.objects for delete to authenticated
  using (bucket_id in ('photos', 'photos-blurred') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "foto originali: tu e i tuoi match" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.has_match_with(auth.uid(), ((storage.foldername(name))[1])::uuid)
         and public.can_see(auth.uid(), ((storage.foldername(name))[1])::uuid));
create policy "foto sfocate: compatibili" on storage.objects for select to authenticated
  using (bucket_id = 'photos-blurred' and public.can_see(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- vocali: <chat uuid>/<file>, solo membri della chat
create policy "carica vocali" on storage.objects for insert to authenticated
  with check (bucket_id = 'voice' and public.is_member(((storage.foldername(name))[1])::uuid, auth.uid()));
create policy "ascolta vocali" on storage.objects for select to authenticated
  using (bucket_id = 'voice' and public.is_member(((storage.foldername(name))[1])::uuid, auth.uid()));

-- ───────────────────────── tempo reale ─────────────────────────
alter publication supabase_realtime add table public.messages, public.chat_members, public.likes;

-- ───────────────────────── dati di base ─────────────────────────
insert into public.habitats (name, district) values
  ('Ramen bar · Decumani', 'Centro Storico'),
  ('Biblioteca Nazionale', 'San Ferdinando'),
  ('Padel Club Fuorigrotta', 'Fuorigrotta'),
  ('Cinema d’essai Chiaia', 'Chiaia'),
  ('Lungomare Caracciolo', 'Chiaia'),
  ('Belvedere di Posillipo', 'Posillipo'),
  ('Bar storico · Piazza Bellini', 'Centro Storico'),
  ('Parco della Floridiana', 'Vomero'),
  ('Palestra Vomero Fit', 'Vomero'),
  ('Mercato di Porta Nolana', 'Porta Nolana')
on conflict do nothing;
