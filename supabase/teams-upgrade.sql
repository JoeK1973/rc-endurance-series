-- RC Endurance Series: Teams area upgrade
create table if not exists team_shortlist(
  manager_id uuid not null references profiles(id) on delete cascade,
  driver_id uuid not null references drivers(profile_id) on delete cascade,
  created_at timestamptz default now(),
  primary key(manager_id,driver_id)
);

alter table team_shortlist enable row level security;

drop policy if exists "team_shortlist_access" on team_shortlist;
create policy "team_shortlist_access"
on team_shortlist for all to authenticated
using (true) with check (true);
