-- Todo en uno: sincronización entre dispositivos. Cada uno ve SOLO lo suyo.
-- Lo que se guarda acá ya viene cifrado con la contraseña del perfil (ilegible para Supabase).
create table if not exists public.bovedas (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  perfil text not null,
  nombre text not null default '',
  datos jsonb not null,
  version bigint not null default 1,
  dispositivo text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, perfil)
);
alter table public.bovedas enable row level security;
revoke all on table public.bovedas from anon;
grant select, insert, update, delete on table public.bovedas to authenticated;
drop policy if exists "solo lo mio" on public.bovedas;
create policy "solo lo mio" on public.bovedas for all to authenticated
  using (user_id = auth.uid() and public.es_miembro())
  with check (user_id = auth.uid() and public.es_miembro());
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bovedas') then
    alter publication supabase_realtime add table public.bovedas;
  end if;
end $$;
