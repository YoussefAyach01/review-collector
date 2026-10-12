# review-collector ("Avis Facile")

A review-gate page for local businesses. Each business owner signs up, pastes their Google review link, and
shares one link or QR code. Customers tap a rating: a high rating (4-5 stars, configurable) sends them
straight to the business's Google review page; a lower rating shows a private feedback form instead, so an
unhappy customer's complaint reaches the owner directly rather than becoming a public one-star review.

Stack: Next.js 16 (App Router) + Tailwind 4 + TypeScript strict + SQLite via the built-in `node:sqlite` (no
native modules, no cloud account). The review page itself needs no JavaScript: ratings are plain links and
the feedback form is a normal POST, so it works even with JS disabled or on a very old phone browser.

## Run

Requires Node 22.18+ (developed on Node 25).

```bash
npm install
cp .env.example .env.local     # then edit SESSION_SECRET
npm run seed                   # optional: demo business at /r/demo (demo@example.com / demo-password-1)
npm run dev                    # http://localhost:3510
```

Checks: `npm run typecheck && npm run lint && npm test`.
End-to-end (real Chrome, needs `npm run build` first): `npm run test:e2e`.

## How it is built

- `src/lib/*`: pure logic (Google URL parsing/validation, slugs, scrypt passwords, signed session cookies,
  rate limiter, SQLite repository). Unit-tested without Next.
- `src/app/actions.ts`: server actions. Owner-only actions call `requireOwner()` and every SQL write is
  scoped by `business_id` (ownership check, tested against IDOR). `submitFeedbackAction` is public (anyone
  visiting a review page can use it) and is rate-limited per IP and per business.
- `src/app/r/[slug]`: the public review page. No client component at all: the rating buttons are `<a>` links
  to `?r=N`, and a rating at or above the business's threshold triggers a server-side `redirect()` straight
  to the Google review URL — the customer never even sees an intermediate "thank you" page for a good rating.
  A lower rating renders the private feedback `<form>` (plain POST, a server action).
- `src/app/api/qr/[slug]`: QR code as SVG linking to the public review page.
- Security: zod validation on every form (the Google URL must be `https://`), parameterised SQL, httpOnly +
  SameSite=Lax session cookie (Secure in production), login/signup rate limits, same error for unknown user
  and wrong password, CSP and other headers in `next.config.ts`.

## Deploy

Needs a Node host with a persistent disk (SQLite is a file): a small VPS, Railway or Fly with a volume. It
will NOT work on Vercel's serverless filesystem as-is; to use Vercel, swap `src/lib/db.ts` for
Postgres/Turso (only `db.ts` and `repo.ts` touch the database).

1. Set env vars from `.env.example` (`SESSION_SECRET` is mandatory in production: the app refuses to start
   sessions without it).
2. `npm run build && npm start` behind HTTPS (Caddy/nginx). Set `NEXT_PUBLIC_APP_URL` to the public URL: it
   is what the QR code encodes.
3. Back up `DATABASE_PATH` (it is one file; use `sqlite3 .backup` or copy while idle).
4. Make sure your reverse proxy overwrites `X-Forwarded-For`, otherwise the rate limiter can be bypassed.

## Known limits

- Upgrading to Pro is manual for now: `UPDATE businesses SET plan='pro' WHERE slug='...'`. Stripe env vars
  exist but no checkout is wired (a "not configured" message is shown).
- No password reset or e-mail verification (needs an e-mail provider). Sessions last 7 days.
- Rate limiter is in memory (one server process).
- The Google review URL is validated as a generic `https://` link, not verified to actually be a Google
  review page (the dashboard shows a gentle warning, not a hard block, if the domain doesn't look like
  google.com/g.page/goo.gl, since owners may use a shortener).
- No e-mail/WhatsApp notification when new private feedback arrives; the owner must check the dashboard.
- Dashboard is French only; the public review page is French/Arabic.
