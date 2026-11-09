-- migration: create_jokes
-- הטבלה של הבדיחות. רק השרת (service_role) ניגש אליה.

create table public.jokes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic text,
  text text not null,
  laughs integer not null default 0
);

-- RLS דולק, בלי אף policy
alter table public.jokes enable row level security;

-- רק service_role, במפורש
revoke all on table public.jokes from anon, authenticated;
grant select, insert, update on table public.jokes to service_role;

-- צחוק אחד: עדכון אחד, כדי ששתי לחיצות באותו רגע לא ידרסו זו את זו.
-- אין שורה עם ה-id: מחזירה null.
create function public.add_laugh(joke_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  update public.jokes
  set laughs = laughs + 1
  where id = joke_id
  returning laughs;
$$;

revoke execute on function public.add_laugh(uuid) from public, anon, authenticated;
grant execute on function public.add_laugh(uuid) to service_role;
