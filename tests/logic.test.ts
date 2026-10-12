import { describe, expect, it } from 'vitest';
import { parseGoogleReviewUrl, looksLikeGoogleUrl } from '../src/lib/google-url.ts';
import { slugify, uniqueSlug } from '../src/lib/slug.ts';
import {
  createSessionToken,
  getSessionSecret,
  hashPassword,
  verifySessionToken,
  verifyPassword,
} from '../src/lib/auth.ts';
import { rateLimit, resetRateLimits } from '../src/lib/rate-limit.ts';
import { ACCENTS } from '../src/lib/palette.ts';

describe('Google review URL', () => {
  it.each([
    'https://g.page/r/abc123/review',
    'https://search.google.com/local/writereview?placeid=xyz',
    'https://maps.app.goo.gl/abc123',
  ])('accepts %s', (url) => {
    const r = parseGoogleReviewUrl(url);
    expect(r.ok).toBe(true);
  });

  it.each(['', 'not a url', 'ftp://g.page/r/abc', 'http://g.page/r/abc', 'a'.repeat(501)])(
    'rejects %j',
    (url) => expect(parseGoogleReviewUrl(url).ok).toBe(false),
  );

  it('flags non-Google hosts without rejecting them (the business picks their own link)', () => {
    expect(looksLikeGoogleUrl('https://g.page/r/abc')).toBe(true);
    expect(looksLikeGoogleUrl('https://maps.app.goo.gl/abc')).toBe(true);
    expect(looksLikeGoogleUrl('https://example.com/reviews')).toBe(false);
  });
});

describe('slugs', () => {
  it('removes accents and symbols', () => expect(slugify('Café Dar Zitoun !')).toBe('cafe-dar-zitoun'));
  it('falls back for Arabic-only or reserved names', () => {
    expect(slugify('دار الزيتون')).toBe('commerce');
    expect(slugify('Admin')).toBe('commerce');
  });
  it('appends a counter until free', () => {
    const taken = new Set(['dar', 'dar-2']);
    expect(uniqueSlug('dar', (s) => taken.has(s))).toBe('dar-3');
  });
});

describe('auth', () => {
  it('verifies the right password only', () => {
    const h = hashPassword('correct horse battery');
    expect(verifyPassword('correct horse battery', h)).toBe(true);
    expect(verifyPassword('wrong', h)).toBe(false);
    expect(verifyPassword('x', 'garbage')).toBe(false);
  });

  const secret = 's'.repeat(32);
  it('round-trips a session token', () =>
    expect(verifySessionToken(createSessionToken(7, secret), secret)).toBe(7));
  it('rejects a token signed with another secret', () =>
    expect(verifySessionToken(createSessionToken(7, secret), 't'.repeat(32))).toBeNull());
  it('rejects a tampered payload', () => {
    const [, sig] = createSessionToken(7, secret).split('.');
    const forged = Buffer.from(JSON.stringify({ uid: 1, exp: Date.now() + 1e9 })).toString('base64url');
    expect(verifySessionToken(`${forged}.${sig}`, secret)).toBeNull();
  });
  it('rejects an expired token', () => {
    const token = createSessionToken(7, secret, 1000);
    expect(verifySessionToken(token, secret, 1000 + 8 * 24 * 3600 * 1000)).toBeNull();
  });
  it('rejects empty and malformed tokens', () => {
    for (const t of [undefined, '', 'abc', 'a.b.c', '.']) expect(verifySessionToken(t, secret)).toBeNull();
  });
  it('refuses a missing secret in production but not in dev', () => {
    expect(() => getSessionSecret({ NODE_ENV: 'production' })).toThrow();
    expect(() => getSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: 'short' })).toThrow();
    expect(getSessionSecret({ NODE_ENV: 'development' })).toBeTruthy();
  });
});

describe('rate limit', () => {
  it('blocks after max hits and recovers after the window', () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) expect(rateLimit('k', 3, 1000, 0).ok).toBe(true);
    expect(rateLimit('k', 3, 1000, 10).ok).toBe(false);
    expect(rateLimit('other', 3, 1000, 10).ok).toBe(true);
    expect(rateLimit('k', 3, 1000, 1001).ok).toBe(true);
  });
});

describe('accent palette', () => {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
  };
  it.each(ACCENTS.map((a) => a.hex))('%s has 4.5:1 contrast with white', (hex) =>
    expect(1.05 / (lum(hex) + 0.05)).toBeGreaterThanOrEqual(4.5),
  );
});
