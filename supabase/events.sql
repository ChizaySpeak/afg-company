create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_time time,
  place text,
  description text,
  participants text,
  budget numeric,
  status text not null default 'planned' check (status in ('planned','ongoing','done','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "dev_events_all"
on public.events
for all
to anon, authenticated
using (true)
with check (true);

create or replace function public.set_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
before update on public.events
for each row
execute function public.set_events_updated_at();
