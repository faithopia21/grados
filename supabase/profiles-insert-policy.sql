-- Run in Supabase SQL Editor if profile inserts fail during sign-up or onboarding.
-- Also ensure an UPDATE policy exists for users to update their own row.

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Required for onboarding upsert (updates existing rows)
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
