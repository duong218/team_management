# Deployment Hardening Plan

**Goal:** Reduce authenticated write spam, prevent a blank-screen crash, add browser security headers, and keep a Supabase Free project active with a daily external ping.

**Architecture:** Enforce write limits in PostgreSQL triggers, wrap the React root in a native error boundary, configure Vercel response headers, and call a no-data health RPC from GitHub Actions. No new runtime dependency or service-role key.

**Tech Stack:** PostgreSQL, React, Vercel static hosting, GitHub Actions, Node built-ins.

**Spec:** User request in this conversation (mitigate review items 2, 3, 5, and 6).

## Global Constraints

- Do not expose or use the Supabase service-role key.
- Keep RLS and existing business RPC permissions unchanged.
- The daily ping must return no application data and must run outside Supabase.
- Do not push or commit.

## Review Focus

- Simultaneous writes must not bypass per-user limits.
- Normal group usage should remain within the selected limits.
- CSP must permit current Google Fonts, Supabase API traffic, and HTTPS avatars.
- Keepalive failure or an already-paused project must not be reported as success.

## Tasks

1. Add a numbered SQL migration that rate-limits comments, task creation, and transfer requests with per-user transaction locks; add a no-data ping RPC callable by `anon`; document its contract.
2. Add an app-root Error Boundary with a reload fallback.
3. Configure Vercel security headers for the client deployment.
4. Add a Node built-in keepalive script and a daily GitHub Actions workflow using only the project URL and publishable key.
5. Run lint, production build, and diff checks; do not run tests or apply SQL to the remote database.
