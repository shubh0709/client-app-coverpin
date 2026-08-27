# CoverPin Compliance Console (client-app)

Frontend for a compliance entities/filings console — interview-prep scaffolding built
alongside a companion [coverpin-backend](../coverpin-backend) NestJS API. Lets you register
compliance entities, track their filings through a lifecycle (PENDING → AI_PROCESSING → FILED
→ CONFIRMED), and generate an AI (ChatGPT) compliance checklist per entity.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + TypeScript
- **Tailwind CSS v4**
- **shadcn/ui** on the **Radix UI** primitives (`radix-nova` style) — button, input, select,
  dialog, table, card, badge, etc.
- **React Hook Form** + **Zod** for form state and validation, with schemas in
  [`src/lib/schemas.ts`](src/lib/schemas.ts) deliberately mirroring the backend's DTOs so
  invalid input is caught client-side before it ever hits the API
- **sonner** for toast notifications

### Architecture note: client-side SPA pattern, not server components

Every page here is a client component (`'use client'`) that calls the NestJS API directly
from the browser via `fetch` (see [`src/lib/api.ts`](src/lib/api.ts)), rather than using Next
Server Components/Server Actions to proxy through the Next server. This was a deliberate
choice: it's the simpler mental model for a small app talking to one independent backend
service, it keeps the API contract (and its errors) fully in the browser's control, and it
avoids duplicating environment/config between "server-side fetch" and "client-side fetch"
paths. The trade-off is no SSR data-fetching benefits (no first-paint data, no server-side
caching) — fine here, and something I'd reconsider for a public-facing/SEO-sensitive surface.

## Local setup

Requires the backend running first — see [coverpin-backend's README](../coverpin-backend/README.md)
for that (docker-compose Postgres, migrations, seed data, `npm run start:dev` on port 4000).

```bash
npm install
cp .env.local.example .env.local
# .env.local: NEXT_PUBLIC_API_URL=http://localhost:4000 (default, matches the backend's default port)
npm run dev
```

Visit `http://localhost:3000`. You should see the seeded entities from the backend's
`npm run seed` on the dashboard.

## Pages

- `/` — dashboard: table of all entities with status badges and filing counts
- `/entities/new` — register a new entity (name, type, jurisdiction, formation date, agent)
- `/entities/[id]` — entity detail: info card, "Generate checklist" (calls the backend's
  ChatGPT-backed endpoint and renders the validated, structured result), and a filings table
  where each row only shows the button(s) for its valid next lifecycle state (mirrors the
  backend's forward-only state machine in `src/lib/schemas.ts`'s `FILING_TRANSITIONS`)

All three were smoke-tested end-to-end with a headless browser against a live backend
(create entity → add filing → transition it → attempt the AI checklist without an API key
configured, which fails gracefully via a toast instead of crashing the page).

## Deployment (Vercel)

1. Push this repo to its own GitHub repo.
2. In Vercel, "Add New Project" → import that repo. Vercel auto-detects Next.js; no custom
   build config needed.
3. Set the environment variable `NEXT_PUBLIC_API_URL` to your deployed backend's URL (e.g.
   `https://coverpin-backend.onrender.com`) in the Vercel project settings, for all
   environments you plan to use (Production/Preview/Development).
4. Deploy. Every push to the connected branch redeploys automatically.
5. Once you have the Vercel URL, go back to the backend's `CORS_ORIGIN` env var on Render and
   set it to that URL so the browser is allowed to call the API cross-origin.

## Known trade-offs / what wasn't built

- **No auth (Clerk)** — the JD names Clerk explicitly; deferred here to keep this scaffold
  focused on the compliance domain modeling on the backend. Would add a Clerk provider +
  middleware-protected routes first if auth were in scope.
- **No frontend tests** — the testing effort went into the backend (unit + e2e against a real
  Postgres). Would add component tests (Vitest + Testing Library) and a couple of Playwright
  flows (the ones used to manually verify this build) as fast-follows.
- **No pagination/loading skeletons/optimistic updates** — fine at seed-data scale (a handful
  of entities); would matter once the entity list is large.
- `npm audit` reports 2 vulnerabilities (1 high) in `postcss`, pulled in transitively by
  Next.js 15's own build pipeline (dev/build-time only, not shipped to the browser). The fix
  is bumping to Next.js 16, which was deliberately avoided here to stay on Next 15 per the
  target stack.
