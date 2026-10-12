// End-to-end check of the real product flow in a real browser (system Chrome via playwright-core).
// Requires `npm run build` first. Starts its own server on port 3511 with a throwaway database.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const PORT = 3511;
const BASE = `http://localhost:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'review-collector-e2e-'));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
  env: {
    ...process.env,
    DATABASE_PATH: join(dir, 'e2e.db'),
    SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret-1234',
    NEXT_PUBLIC_APP_URL: BASE,
  },
  stdio: 'pipe',
});
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${detail}`}`);
  if (!ok) failures++;
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start:\n${serverLog}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();

  // Landing
  await page.goto(BASE);
  check('landing shows the headline', (await page.locator('h1').innerText()).includes('Google'));

  // Sign up
  await page.goto(`${BASE}/signup`);
  await page.fill('#businessName', 'Épicerie Test');
  await page.fill('#googleReviewUrl', 'https://g.page/r/epicerie-test/review');
  await page.fill('#email', 'owner@example.com');
  await page.fill('#password', 'a-long-password-1');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard**');
  check(
    'signup lands on the dashboard with a welcome message',
    (await page.locator('[role=status]').innerText()).includes('Bienvenue'),
  );

  // Duplicate signup is refused with a readable error
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto(`${BASE}/signup`);
  await p2.fill('#businessName', 'Autre');
  await p2.fill('#googleReviewUrl', 'https://g.page/r/autre/review');
  await p2.fill('#email', 'OWNER@example.com');
  await p2.fill('#password', 'a-long-password-1');
  await p2.click('button[type=submit]');
  await p2.waitForURL('**/signup?error=email_taken');
  check(
    'duplicate e-mail is rejected',
    (await p2.locator('main [role=alert]').innerText()).includes('existe déjà'),
  );

  // Bad login gives one generic message
  await p2.goto(`${BASE}/login`);
  await p2.fill('#email', 'owner@example.com');
  await p2.fill('#password', 'wrong-password-123');
  await p2.click('button[type=submit]');
  await p2.waitForURL('**/login?error=invalid_credentials');
  check(
    'wrong password shows a generic error',
    (await p2.locator('main [role=alert]').innerText()).includes('incorrect'),
  );

  // Dashboard requires a session
  await p2.goto(`${BASE}/dashboard`);
  check('anonymous visitors are redirected from /dashboard to /login', p2.url().endsWith('/login'));
  await other.close();

  // Public review page: a high rating redirects straight to the Google link
  const review = await ctx.newPage();
  await review.goto(`${BASE}/r/epicerie-test`);
  check('review page shows the business name', (await review.locator('h1').innerText()) === 'Épicerie Test');
  check(
    'review page has no horizontal scroll at 375px',
    await review.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  );
  // Checked via a raw fetch with redirect:'manual' so the test never actually calls out to Google's servers.
  const highRating = await fetch(`${BASE}/r/epicerie-test?r=5`, { redirect: 'manual' });
  check(
    'a 5-star rating redirects straight to the Google review link',
    [301, 302, 307, 308].includes(highRating.status) &&
      highRating.headers.get('location') === 'https://g.page/r/epicerie-test/review',
    `status=${highRating.status} location=${highRating.headers.get('location')}`,
  );

  // A low rating shows the private feedback form instead
  await review.goto(`${BASE}/r/epicerie-test?r=2`);
  check('a low rating stays on the page', review.url().includes('/r/epicerie-test'));
  await review.fill('#fb-name', 'Client Test');
  await review.fill('#fb-message', 'Le service était trop lent.');
  await review.getByRole('button', { name: 'Envoyer en privé' }).click();
  await review.waitForURL('**/r/epicerie-test?sent=1');
  check(
    'submitting feedback shows a thank-you message, not a public review',
    (await review.locator('[role=status]').innerText()).includes('Merci'),
  );

  // Owner sees the private feedback, a stranger cannot
  await page.goto(`${BASE}/dashboard`);
  check(
    'owner dashboard lists the private feedback',
    (await page.locator('main').innerText()).includes('Le service était trop lent'),
  );

  // Invalid Google URL is rejected on settings (ftp:// passes the browser's native url validation
  // but fails our server-side https-only check, so this actually reaches the server action)
  await page.fill('#s-url', 'ftp://example.com/not-https');
  await page.getByRole('button', { name: 'Enregistrer les réglages' }).click();
  await page.waitForURL('**/dashboard?error=invalid_settings#reglages');
  check(
    'invalid settings are rejected',
    (await page.locator('main [role=alert]').innerText()).includes('invalides'),
  );

  // Arabic version
  await review.goto(`${BASE}/r/epicerie-test?lang=ar`);
  check(
    'Arabic review page is RTL',
    (await review.locator('div[dir=rtl]').count()) === 1 &&
      (await review.locator('body').innerText()).includes('كيف كانت زيارتكم'),
  );

  // QR endpoint
  const qr = await fetch(`${BASE}/api/qr/epicerie-test`);
  check(
    'QR endpoint returns SVG',
    qr.status === 200 &&
      (qr.headers.get('content-type') ?? '').includes('image/svg+xml') &&
      (await qr.text()).startsWith('<svg'),
  );
  check('QR endpoint 404s for an unknown slug', (await fetch(`${BASE}/api/qr/nope`)).status === 404);
  check('unknown slug is a 404', (await fetch(`${BASE}/r/nope`)).status === 404);

  // Security headers
  const head = await fetch(BASE);
  check(
    'security headers are set',
    head.headers.get('x-content-type-options') === 'nosniff' &&
      !!head.headers.get('content-security-policy') &&
      !head.headers.get('x-powered-by'),
  );
} catch (e) {
  failures++;
  console.error('FAIL  unexpected error:', e);
} finally {
  await browser?.close();
  server.kill();
  await new Promise((r) => setTimeout(r, 500));
  rmSync(dir, { recursive: true, force: true });
}
console.log(failures === 0 ? '\nAll e2e checks passed.' : `\n${failures} e2e check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
