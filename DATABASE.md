# Database Policy

This project uses **Supabase (PostgreSQL)**. All database access must follow these rules. A misconfigured database is the most common cause of serious data breaches.

Treat all database rules as **non-optional**.

## Rules (MUST FOLLOW)

- **Row Level Security (RLS) is mandatory**
  - Every table that stores user data must have RLS enabled.
  - Policies must be reviewed whenever a new table is added.
  - `anon` role must never have write access to user-owned tables.
  - Test policies in Supabase's built-in RLS policy editor before deploying.

- **Never disable RLS without explicit sign-off**
  - If a table genuinely requires no RLS (e.g. a public read-only lookup table), document the reason inline.
  - Tables with RLS disabled must have zero writes from client code.

- **Client code uses the `anon` key only**
  - The Supabase `anon` key is safe in the browser — RLS is the enforcement layer.
  - The `service_role` key must **never** be used in client-side or Vite-bundled code.
  - `service_role` usage is restricted to server-side edge functions or trusted backend workers.

- **No raw SQL from user input**
  - Never concatenate user-provided strings into SQL queries.
  - Use Supabase's typed query builder (`.select()`, `.eq()`, `.insert()`) exclusively.
  - For complex queries, use parameterised Postgres functions (RPCs).

- **Limit what you select**
  - Never `select('*')` in production code paths.
  - Only request the columns your component actually needs.

- **Validate before writing**
  - All data written to the database must be validated client-side (e.g. zod) before the Supabase call.
  - Server-side validation (Postgres constraints, triggers, or edge functions) is the final authority.

## Schema & Migration Rules

- **All schema changes must be done via migrations**
  - Use `supabase/migrations/` for every DDL change (CREATE, ALTER, DROP).
  - Never modify the schema directly in the Supabase dashboard in production.
  - Name migrations clearly: `YYYYMMDDHHMMSS_description.sql`

- **Test migrations on a staging project first**
  - Supabase supports multiple projects — use a separate project for staging.
  - Confirm `supabase db push` succeeds on staging before applying to production.

- **Destructive migrations require a backup**
  - Before any `DROP TABLE`, `DROP COLUMN`, or data-mutating migration, take a manual backup from the Supabase dashboard.
  - Add a comment in the migration file confirming the backup was taken.

## Supabase-Specific Rules

- **RLS policy patterns**

  ```sql
  -- Users can only read their own rows
  CREATE POLICY "Users read own data"
    ON public.your_table FOR SELECT
    USING (auth.uid() = user_id);

  -- Users can only insert their own rows
  CREATE POLICY "Users insert own data"
    ON public.your_table FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  ```

- **Edge functions for privileged writes**
  - Any write that requires elevated trust (e.g. admin actions, payment recording) must go through a Supabase Edge Function using the `service_role` client.
  - Edge functions must verify the caller's JWT before acting.

- **Postgres functions (RPCs)**
  - Functions that run with `SECURITY DEFINER` are elevated-privilege — treat them like admin code.
  - Restrict `EXECUTE` grants to the minimum required role.
  - Always set `search_path = ''` on `SECURITY DEFINER` functions to prevent schema injection.

  ```sql
  CREATE OR REPLACE FUNCTION public.my_function(...)
  RETURNS ...
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
  BEGIN
    -- implementation
  END;
  $$;
  ```

## Required Checks Before Merge

Before merging any database-related changes:

- [ ] New tables have RLS enabled and policies defined
- [ ] `service_role` key is not referenced in any client-side file
- [ ] No raw user input is concatenated into queries
- [ ] Schema changes are implemented as migration files in `supabase/migrations/`
- [ ] RLS policies have been tested for both `anon` and `authenticated` roles
- [ ] Destructive migrations have a backup confirmation comment
- [ ] `SECURITY DEFINER` functions set `search_path = ''`
- [ ] `EXECUTE` grants on RPCs are scoped to the minimum required role
