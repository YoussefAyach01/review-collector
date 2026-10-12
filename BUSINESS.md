# review-collector (Avis Facile): business one-pager

## Buyer and problem

Any local business that depends on Google reviews to be found and trusted: restaurants, salons, clinics,
garages, riads/guesthouses. A single public 1-star review (often from a solvable misunderstanding) can sit
at the top of their Google listing for years. They want happy customers to actually leave a review (most
never bother) and unhappy ones to tell them privately first, so they get a chance to fix it before it goes
public.

## Offer and pricing

| Plan                              | MAD / month | USD / month | Includes                                                                     |
| --------------------------------- | ----------- | ----------- | ---------------------------------------------------------------------------- |
| Free                              | 0           | 0           | Review page + QR, unlimited private feedback, FR/AR                          |
| Pro                               | 79          | 8           | Priority WhatsApp support (same features for now)                            |
| Setup service (optional, one-off) | 150 - 300   | 15 - 30     | You find their Google review link, print table/counter cards and QR stickers |

Realistic goal: 20-25 paying businesses = 1,500-2,000 MAD/month. Hosting cost is roughly 40-80 MAD/month for
a small VPS, so margin is high but absolute income is modest until there is volume. This is a lower-effort,
lower-friction add-on sale: it pairs naturally with `qr-menu` and `booking-page` customers who already trust
the pitch.

## First 5 customers

1. Offer it free for the first month to every existing or prospective `qr-menu` / `booking-page` contact as
   an add-on: "while I'm there, want a review page too?"
2. Target businesses with a visibly weak Google rating (3.5-4.2 stars with recent complaints about fixable
   things like wait time): show them the problem (their own reviews) and the fix (this tool) side by side.
3. Hair salons, clinics and garages rely heavily on Google to be found; a short WhatsApp message with a demo
   link and QR code mockup for their own shop name is a strong, personalised pitch.

## Accounts needed to go live

- A VPS or PaaS with persistent disk (about 40-80 MAD/month) and a domain (about 100 MAD/year).
- Optional later: Stripe for card billing (limited availability for Moroccan businesses; cash/bank
  transfer/CMI plus the manual Pro switch is the realistic route at first), Resend or similar for
  password-reset e-mails and "you have new feedback" notifications.

## Honest limits

- This nudges genuinely happy customers toward Google and genuinely unhappy ones toward private feedback;
  it does not fabricate or filter real opinions, and selectively routing reviews this way is a known,
  widely-used (if debated) practice — it is not Google review manipulation (no fake reviews are created or
  purchased) but the owner should know Google's guidelines discourage review-gating in spirit. Frame it to
  clients as "give every customer a fast way to tell you, Google or private" rather than "hide bad reviews".
- No proof yet that business owners will reliably check the private feedback inbox without a notification
  (not built yet — see Known limits in the README).
- Competes with free/manual alternatives (a printed "leave us a review" sign, WhatsApp Business quick
  replies): the pitch is the automatic private-feedback fork, FR/AR, and no manual QR-code generation needed.
- Not tested on Safari/iOS or real Android phones; verified with real headless Chrome (desktop) at 375px and
  via the automated end-to-end flow (including the actual server-side redirect behaviour, checked without
  making a live call to Google's servers).
- Pro billing, password reset and e-mail verification are not built yet.
