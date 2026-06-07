# Incident Response

This document defines how to respond to security incidents, outages, and data issues in GradOS.

**When in doubt, contain first — investigate second.**

## Severity Levels

| Level | Description | Response Time |
|---|---|---|
| **P1 — Critical** | Data breach, exposed secret, production down, active exploit | Immediate (< 15 min) |
| **P2 — High** | Auth broken, significant data loss, major feature outage | < 1 hour |
| **P3 — Medium** | Degraded performance, minor data inconsistency, single-user issue | < 4 hours |
| **P4 — Low** | Cosmetic bugs, minor warnings, non-urgent security findings | Next working day |

---

## P1 Playbooks

### 🔑 Exposed Secret / Credential Leak

> Use this if an API key, JWT secret, Supabase key, or password was committed to git, logged, or otherwise exposed.

1. **Rotate the key immediately.**
   - Supabase `anon`/`service_role` keys: Supabase dashboard → Settings → API → Reset keys.
   - Any third-party API key: rotate in the provider's dashboard.
2. **Remove the secret from history** if it was committed:
   ```bash
   # Use git-filter-repo (preferred) or BFG Repo Cleaner
   git filter-repo --path <file> --invert-paths
   git push --force-with-lease
   ```
3. **Revoke active sessions** if a Supabase auth secret was exposed (users will need to log in again).
4. **Update Vercel environment variables** with the new key.
5. **Audit Supabase logs** for unusual access during the exposure window (Dashboard → Logs → API Logs).
6. **Open a post-mortem issue** documenting: what was exposed, for how long, what was accessed, and what was changed.

---

### 🗄️ Supabase Database Issue / Data Corruption

> Use this if rows are missing, corrupted, or unexpectedly modified.

1. **Identify scope** — which table(s) and how many rows are affected.
2. **Pause writes to the affected table** if possible (via RLS policy change or by temporarily taking the feature offline).
3. **Restore from backup** if data is unrecoverable:
   - Supabase dashboard → Database → Backups → Point-in-time restore (Pro plan) or daily backup.
4. **Identify root cause** — was it a bad migration, a missing RLS policy, or a buggy write path?
5. **Apply a fix migration** and verify on staging first.
6. **Re-enable writes** once the fix is verified.

---

### 🌐 Production Outage (Vercel / App Down)

> Use this if the app is returning errors or is unreachable.

1. **Check Vercel status**: [status.vercel.com](https://status.vercel.com)
2. **Check Supabase status**: [status.supabase.com](https://status.supabase.com)
3. **Roll back the last deployment** if the outage started after a deploy:
   - Vercel dashboard → Deployments → last known-good build → **Promote to Production**.
4. **Check build logs** in Vercel for runtime errors.
5. **Check Supabase API logs** for upstream errors.
6. **Communicate status** to affected users if the outage exceeds 15 minutes.

---

## Post-Incident Process

After every P1 or P2 incident, complete a post-mortem:

1. **Timeline** — when was the issue introduced, when was it detected, when was it resolved?
2. **Root cause** — what actually caused the incident?
3. **Impact** — what data, users, or functionality was affected?
4. **Containment** — what was done to stop the bleeding?
5. **Fix** — what was changed to resolve it?
6. **Prevention** — what process, test, or check would have caught this earlier?

Document the post-mortem in a GitHub issue labelled `incident` and link it to any relevant PR.

---

## Security Vulnerability Reports

If someone reports a security vulnerability:

1. **Do not dismiss or close the report** — acknowledge it within 24 hours.
2. Reproduce the issue privately.
3. Fix it in a private branch or patch.
4. Deploy the fix to production **before** disclosing publicly.
5. Credit the reporter (with their permission) in the release notes.

For responsible disclosure details, see [SECURITY.md](./SECURITY.md).

---

## Key Contacts & Resources

| Resource | Link |
|---|---|
| Vercel Dashboard | https://vercel.com/dashboard |
| Vercel Status | https://status.vercel.com |
| Supabase Dashboard | https://supabase.com/dashboard |
| Supabase Status | https://status.supabase.com |
| Supabase Logs | Dashboard → Logs → API / Auth / Database |
| Supabase Backups | Dashboard → Database → Backups |
