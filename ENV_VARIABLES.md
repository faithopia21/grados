# Environment Variables

This document describes all environment variables required to run GradOS.

## Quick Start

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

---

## Variables

### Supabase

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ Yes | Your Supabase project URL. Found in **Project Settings → API**. |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous/public API key. Found in **Project Settings → API → anon public**. Safe to expose in the browser — Row Level Security (RLS) controls access. |

---

## Security Notes

- **Never commit `.env`** — it is listed in `.gitignore`.
- **`VITE_*` variables are inlined at build time** by Vite and will appear in the compiled JavaScript bundle. Only put values here that are safe to be public (e.g., the Supabase `anon` key, which is designed to be browser-visible).
- **Service-role keys or admin secrets must never use the `VITE_` prefix** and must never be used in client-side code.
- The `dist/` build output is gitignored to prevent bundled env values from being committed.

---

## Adding New Variables

1. Add the variable to `.env` (your local copy).
2. Add a placeholder entry to `.env.example` with a comment explaining the value.
3. Document it in the table above.
4. If the variable is server-only, **do not** prefix it with `VITE_`.
