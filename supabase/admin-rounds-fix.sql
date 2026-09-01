-- Run this if your current schema is already installed.
-- Allows authenticated users to read rounds and your app's admin UI to create/edit/delete them.
drop policy if exists "p3" on rounds;
create policy "Authenticated users can view rounds" on rounds for select to authenticated using (true);
create policy "Authenticated users can insert rounds" on rounds for insert to authenticated with check (true);
create policy "Authenticated users can update rounds" on rounds for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete rounds" on rounds for delete to authenticated using (true);

-- Make yourself an admin:
-- update profiles set role='admin' where email='YOUR_EMAIL_ADDRESS';
