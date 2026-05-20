-- Run in Supabase SQL Editor to create profile rows for existing auth users
-- who signed up before profile creation was enforced.

insert into profiles (id)
select id from auth.users
where id not in (select id from profiles);
