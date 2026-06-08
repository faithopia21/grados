# GradOS — Security Policy

This file is a directive for all AI agents 
and developers working on this codebase.
All rules are non-optional. Read before 
generating or reviewing any code.

---

## Stack

- Frontend: React + Vite (client-side SPA)
- Backend: Supabase (Auth, Database, Storage)
- Hosting: Vercel
- No server-side API routes currently exist

---

## Agent Rules (MUST FOLLOW)

### 1. Never put secrets in code

Never commit or hardcode:
- Supabase service role key
- Any API key, JWT secret, or token
- Database passwords

Client-side environment variables must 
use the VITE_ prefix and must only contain 
non-sensitive values:

ALLOWED in .env:
  VITE_SUPABASE_URL        (public, safe)
  VITE_SUPABASE_ANON_KEY   (public, safe)

NEVER in .env or any code file:
  SUPABASE_SERVICE_ROLE_KEY
  Any key with "secret" or "service" 
  in the name

The .env file must always be in .gitignore.
Never commit .env to GitHub.

### 2. Never disable or weaken RLS

Row Level Security (RLS) is enabled on 
every table in this project. Never:

- Set a policy to WITH CHECK (true) 
  for INSERT, UPDATE, or DELETE
- Create a policy using (true) for 
  SELECT on sensitive tables
- Disable RLS on any table to "fix" 
  a permission error

If a Supabase query fails due to RLS, 
the correct fix is to write the right 
RLS policy — not to remove the policy.

Current RLS-protected tables:
- profiles
- programs
- checklist_items
- documents
- program_documents
- recommenders
- program_notes
- portal_links

Every policy must follow this pattern:
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id)

### 3. The Supabase anon key is public

The VITE_SUPABASE_ANON_KEY is visible to 
anyone who inspects the browser. This is 
expected and safe ONLY because RLS 
policies enforce data access.

Never write client-side code that assumes 
the anon key provides access control. 
All access control is enforced by RLS.

### 4. No service role key in the frontend

The Supabase service role key bypasses 
all RLS policies. It must never appear 
in any file under src/ or in any 
environment variable prefixed with VITE_.

GradOS has no server-side API routes.
If a feature requires the service role 
key, implement it as a Supabase Edge 
Function — not as a client-side call.

### 5. User data isolation

Every database query that reads or writes 
user data must filter by the authenticated 
user's ID. Never query a table without 
a user_id filter when handling user data.

Pattern to always use:
  supabase
    .from('programs')
    .select('*')
    .eq('user_id', user.id)  // REQUIRED

Never omit the user_id filter.
RLS is a safety net, not a replacement 
for correct query logic.

### 6. File storage security

The Supabase Storage bucket 'documents' 
is private. Storage policies must follow 
the same user isolation pattern:

  auth.uid()::text = 
    (storage.foldername(name))[1]

File paths must always be prefixed with 
the user's UUID:
  userId/timestamp-filename.pdf

Never use shared or public paths for 
user-uploaded documents.

### 7. Authentication checks

Every page except sign-in, sign-up, 
forgot-password, and auth/callback 
is wrapped in ProtectedRoute.

Never remove the ProtectedRoute wrapper 
from protected pages.

Never use a hardcoded user ID in any 
query. Always get the user from:
  supabase.auth.getUser()

### 8. Input handling

Never insert user-provided text directly 
into Supabase queries as raw SQL.
Always use the Supabase client's 
parameterised query methods.

Sanitise file names before using them 
in Storage paths:
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')

---

## Before Every Push — Checklist

Run through this before git push:

- [ ] No .env file staged in git add
- [ ] No service role key anywhere in src/
- [ ] Search codebase for 'service_role' 
      — must return zero results in src/
- [ ] Any new Supabase table has RLS 
      enabled and correct policies
- [ ] Any new query filters by user_id
- [ ] No WITH CHECK (true) policies 
      added to any table

---

## If a Security Problem Is Found

1. If a key is exposed in git history:
   - Immediately rotate the key in 
     Supabase dashboard
   - Force-push to remove from history
   - Audit Supabase logs for unusual access

2. If an RLS policy is too permissive:
   - Drop the policy immediately
   - Write the correct policy
   - Check existing data for unauthorised 
     rows and remove them

3. Report any security concern by 
   emailing support@grados.app

---

## Known Acceptable Risks (Documented)

- VITE_SUPABASE_ANON_KEY is public.
  This is intentional and safe because 
  RLS enforces all data access.

- Email confirmation is disabled during 
  beta. This will be re-enabled before 
  public launch.

- Auth users are not deleted from 
  auth.users when a user deletes their 
  account. User data is fully deleted. 
  The auth.users shell is cleaned up 
  manually until a server-side deletion 
  function is implemented in V2.

---

## V2 Security Improvements Planned

- Supabase Edge Function for account 
  deletion (removes auth.users entry)
- Email confirmation re-enabled with 
  proper redirect URLs
- Rate limiting on sign-up and sign-in
- Custom SMTP for all transactional 
  email (Resend)
- Content Security Policy headers 
  via Vercel configuration
