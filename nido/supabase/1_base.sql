-- NIDO · Paso 1 de 2: tablas, seguridad y tiempo real.
-- Pegar TODO en Supabase → SQL Editor → Run. Se puede correr más de una vez sin romper nada.
-- Conserva los productos que ya estaban cargados en "inventory".

-- ───────────── Quién puede entrar ─────────────
create table if not exists public.members (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.es_miembro()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;
revoke all on function public.es_miembro() from public, anon;
grant execute on function public.es_miembro() to authenticated;

-- ───────────── Tablas ─────────────
create table if not exists public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '',
  emoji text not null default '🙂',
  color text not null default '#E2725B',
  gym_goal smallint not null default 3 check (gym_goal between 0 and 7),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb
);

create table if not exists public.work_templates (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null default '',
  place text not null default '',
  start_time time not null,
  end_time time not null,
  weekdays smallint[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  off boolean not null default false,
  start_time time,
  end_time time,
  place text not null default '',
  unique (user_id, date)
);

create table if not exists public.plans (
  id bigint generated always as identity primary key,
  title text not null,
  icon text not null default '📌',
  date date not null,
  time time,
  note text not null default '',
  done boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  title text not null,
  icon text not null default '🧹',
  assigned_to uuid,
  frequency text not null default 'weekly' check (frequency in ('once', 'daily', 'weekly', 'monthly')),
  due_date date,
  last_done date,
  done_by uuid,
  created_at timestamptz not null default now()
);

-- Inventario: si existe la tabla vieja, se renombra, se copian los productos y se borra.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'inventory' and column_name = 'last_updated') then
    alter table public.inventory rename to inventory_viejo;
  end if;
end $$;

create table if not exists public.inventory (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null default 'General',
  status text not null default 'verde' check (status in ('verde', 'amarillo', 'rojo')),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.inventory_viejo') is not null then
    insert into public.inventory (name, category, status, updated_by)
    select name,
           coalesce(nullif(trim(category), ''), 'General'),
           case when status in ('verde', 'amarillo', 'rojo') then status else 'verde' end,
           null
    from public.inventory_viejo
    where coalesce(trim(name), '') <> '';
    drop table public.inventory_viejo;
  end if;
end $$;

create table if not exists public.meals (
  id bigint generated always as identity primary key,
  date date not null,
  slot text not null default 'cena' check (slot in ('almuerzo', 'cena')),
  title text not null default '',
  cook text not null default '',
  unique (date, slot)
);

create table if not exists public.bills (
  id bigint generated always as identity primary key,
  title text not null,
  icon text not null default '💡',
  amount numeric(12, 2),
  due_day smallint not null default 10 check (due_day between 1 and 31),
  paid_month text,
  paid_by uuid,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.touches (
  id bigint generated always as identity primary key,
  from_user uuid not null default auth.uid(),
  to_user uuid not null,
  kind text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create table if not exists public.gym_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  time time,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- ───────────── Seguridad: solo ustedes dos ─────────────
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'settings', 'work_templates', 'shifts', 'plans', 'tasks',
                           'inventory', 'meals', 'bills', 'touches', 'gym_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('drop policy if exists "solo la pareja" on public.%I', t);
    execute format('create policy "solo la pareja" on public.%I for all to authenticated
                    using (public.es_miembro()) with check (public.es_miembro())', t);
  end loop;
end $$;

alter table public.members enable row level security;
revoke all on table public.members from anon;
grant select on table public.members to authenticated;
drop policy if exists "ver si estoy habilitado" on public.members;
create policy "ver si estoy habilitado" on public.members for select to authenticated
  using (user_id = auth.uid());

-- Cada uno solo edita su propio perfil, turnos, plantillas y gym (los dos ven todo).
drop policy if exists "solo la pareja" on public.profiles;
drop policy if exists "ver perfiles" on public.profiles;
drop policy if exists "mi perfil" on public.profiles;
drop policy if exists "editar mi perfil" on public.profiles;
create policy "ver perfiles" on public.profiles for select to authenticated using (public.es_miembro());
create policy "mi perfil" on public.profiles for insert to authenticated with check (public.es_miembro() and id = auth.uid());
create policy "editar mi perfil" on public.profiles for update to authenticated
  using (public.es_miembro() and id = auth.uid()) with check (id = auth.uid());

-- ───────────── Tiempo real (los cambios aparecen al instante en el otro celu) ─────────────
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['profiles', 'settings', 'work_templates', 'shifts', 'plans', 'tasks',
                             'inventory', 'meals', 'bills', 'touches', 'gym_sessions'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
