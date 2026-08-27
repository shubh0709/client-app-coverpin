# Entity Registry (client-app)

Frontend for the Entity Registry — a compliance-tracking registry built alongside a companion
[coverpin-backend](../coverpin-backend) NestJS API. Upload `entities.csv` / `ownership.csv` /
`filings.csv` in one batch, browse the resulting entity hierarchy (top-level entities expanded
into their foreign qualifications and subsidiaries, each with an independently computed
compliance status), and review portfolio-wide analytics. See
`../entity-registry-requirements-analysis.md` in the repo root for the full domain brief.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + TypeScript
- **Tailwind CSS v4**
- **shadcn/ui** on the **Radix UI** primitives (`radix-nova` style) — button, input, select,
  dialog, table, card, badge, etc.
- **Zod** for the upload form's client-side file-selection checks, with domain types/enums in
  [`src/lib/schemas.ts`](src/lib/schemas.ts) mirroring the backend's API contract
- **sonner** for toast notifications
- Charts are hand-built (plain SVG/CSS, no charting library) against the palette and mark specs
  in this repo's `dataviz` skill — see [`src/lib/chart-colors.ts`](src/lib/chart-colors.ts) for
  the validated color assignment.

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
`npm run seed` on the list page.

## Pages

- `/` — list page: searchable/filterable top-level entities, each expandable (one level deep)
  into its FQs and subsidiaries; FQ vs. subsidiary rows are visually distinguished via
  `RelationChip`, and every row (top-level and child alike) shows its own independently computed
  compliance status
- `/upload` — three-file upload (entities/ownership/filings, `.csv` or `.xlsx`); on success shows
  row counts, on the backend's 422 response renders every validation error grouped by file and
  sorted by line
- `/analytics` — page-level jurisdiction/entity-status filters above four charts: compliance
  status breakdown, entity status by region, subsidiary/FQ counts per top-level entity, and
  ownership % for a selected parent (with the unallocated remainder as its own segment)

Built and typechecked against `NEXT_PUBLIC_API_URL` pointing at a backend that isn't running yet
— every page's loading/empty/error states were verified to render without crashing against an
unreachable API (see `npx tsc --noEmit`, `npm run build`, `npm run lint`, all clean).

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
