/** Parses and validates the business's Google review link. We accept any https URL (not just
 * google.com/g.page/maps.app.goo.gl) since owners may use a shortener, but we flag non-Google domains
 * on the dashboard as a gentle warning rather than a hard error. */
export function parseGoogleReviewUrl(input: string): { ok: true; url: string } | { ok: false } {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return { ok: false };
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false };
  }
  if (u.protocol !== 'https:') return { ok: false };
  return { ok: true, url: u.toString() };
}

const GOOGLE_HOSTS = ['google.com', 'g.page', 'goo.gl', 'maps.app.goo.gl'];

export function looksLikeGoogleUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return GOOGLE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
