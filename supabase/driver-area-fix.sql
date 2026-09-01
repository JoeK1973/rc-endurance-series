-- RC Endurance Series Driver Area support
alter table drivers add column if not exists endurance_experience text;

-- Existing schema uses permissive authenticated policies. These ensure the driver-area
-- queries can access profiles, drivers, availability and conversations.
drop policy if exists "p1" on profiles;
drop policy if exists "p2" on drivers;
drop policy if exists "p4" on driver_availability;
drop policy if exists "p7" on conversations;
create policy "p1" on profiles for all to authenticated using (true) with check (true);
create policy "p2" on drivers for all to authenticated using (true) with check (true);
create policy "p4" on driver_availability for all to authenticated using (true) with check (true);
create policy "p7" on conversations for all to authenticated using (true) with check (true);
