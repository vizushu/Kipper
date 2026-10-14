# Casa Pacifica — direct-booking website

Premium direct-booking site for Casa Pacifica (10840 New Salem Point,
San Diego, CA 92126), operated by Kipper Property Management.
Next.js 15 + TypeScript + Tailwind, mobile-first.

## Quickstart (dev, zero credentials)

```bash
npm install
cp .env.example .env
# set ADMIN_SECRET to a long random string in .env
npm run dev   # http://localhost:3000
```

- Data: local SQLite (`./data/bookings.db`, auto-created).
- Emails: written to `./.dev-emails/` without a Resend key.
- Admin: http://localhost:3000/admin/login

## Verify

```bash
npm run typecheck   # 0 errors
npm test            # 40/40
npm run build       # 27/27 routes
```

## Docs

- [docs/PHASE1-FINDINGS.md](docs/PHASE1-FINDINGS.md) — assets, pricing defaults, content flags
- [docs/CREDENTIALS-CHECKLIST.md](docs/CREDENTIALS-CHECKLIST.md) — everything needed from Renier
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — dev → production runbook
- [docs/API.md](docs/API.md) — API reference
- [docs/TEST-REPORT.md](docs/TEST-REPORT.md) — honest working/placeholder/incomplete breakdown

## Production in one paragraph

Create Supabase (run `supabase/schema.sql`) → add Stripe keys (test first,
live when Renier approves) + webhook → Apple Pay merchant ID + domain file →
Resend key + domain → set `DATA_ADAPTER=supabase` → `npm run build` on
Vercel/your host. Full steps in `docs/DEPLOYMENT.md`.
