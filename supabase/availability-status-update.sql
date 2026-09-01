-- Availability status update for the RC Endurance Series
-- Run this once in Supabase SQL Editor if you have an existing database.

update driver_availability
set status = 'available_to_drive'
where status = 'looking_for_team';

-- The application uses these statuses:
-- have_team
-- available_to_drive
-- reserve
-- unavailable
