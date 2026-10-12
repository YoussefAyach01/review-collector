import type { DB } from './db.ts';
import { slugify, uniqueSlug } from './slug.ts';

export interface User {
  id: number;
  email: string;
  password_hash: string;
}

export interface Business {
  id: number;
  owner_id: number;
  slug: string;
  name: string;
  google_review_url: string;
  threshold: 4 | 5;
  accent: string;
  plan: 'free' | 'pro';
}

export interface Feedback {
  id: number;
  business_id: number;
  rating: number;
  name: string;
  phone: string;
  message: string;
  is_read: number;
  created_at: string;
}

export type Result<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; error: string };

// node:sqlite returns loosely typed rows; the SELECTs below always return exactly these columns.
const one = <T>(row: unknown): T | undefined => (row ?? undefined) as T | undefined;
const many = <T>(rows: unknown): T[] => rows as T[];

export function createOwner(
  db: DB,
  input: { email: string; passwordHash: string; businessName: string; googleReviewUrl: string },
): Result<{ userId: number; businessId: number; slug: string }> {
  if (findUserByEmail(db, input.email)) return { ok: false, error: 'email_taken' };
  db.exec('BEGIN');
  try {
    const user = db
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(input.email.trim().toLowerCase(), input.passwordHash);
    const userId = Number(user.lastInsertRowid);
    const slug = uniqueSlug(slugify(input.businessName), (s) => !!getBusinessBySlug(db, s));
    const r = db
      .prepare('INSERT INTO businesses (owner_id, slug, name, google_review_url) VALUES (?, ?, ?, ?)')
      .run(userId, slug, input.businessName, input.googleReviewUrl);
    db.exec('COMMIT');
    return { ok: true, value: { userId, businessId: Number(r.lastInsertRowid), slug } };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function findUserByEmail(db: DB, email: string): User | undefined {
  return one<User>(
    db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email.trim()),
  );
}

export function findUserById(db: DB, id: number): User | undefined {
  return one<User>(db.prepare('SELECT id, email, password_hash FROM users WHERE id = ?').get(id));
}

export function getBusinessByOwner(db: DB, ownerId: number): Business | undefined {
  return one<Business>(db.prepare('SELECT * FROM businesses WHERE owner_id = ?').get(ownerId));
}

export function getBusinessBySlug(db: DB, slug: string): Business | undefined {
  return one<Business>(db.prepare('SELECT * FROM businesses WHERE slug = ?').get(slug));
}

export function updateBusiness(
  db: DB,
  businessId: number,
  data: { name: string; googleReviewUrl: string; threshold: 4 | 5; accent: string },
): void {
  db.prepare(
    'UPDATE businesses SET name = ?, google_review_url = ?, threshold = ?, accent = ? WHERE id = ?',
  ).run(data.name, data.googleReviewUrl, data.threshold, data.accent, businessId);
}

/** Scoped by business_id: one owner can never read or mutate another's feedback (IDOR). */
export function addFeedback(
  db: DB,
  businessId: number,
  data: { rating: number; name: string; phone: string; message: string },
): number {
  const r = db
    .prepare('INSERT INTO feedback (business_id, rating, name, phone, message) VALUES (?, ?, ?, ?, ?)')
    .run(businessId, data.rating, data.name, data.phone, data.message);
  return Number(r.lastInsertRowid);
}

export function listFeedback(db: DB, businessId: number): Feedback[] {
  return many<Feedback>(
    db
      .prepare('SELECT * FROM feedback WHERE business_id = ? ORDER BY created_at DESC, id DESC')
      .all(businessId),
  );
}

export function countUnreadFeedback(db: DB, businessId: number): number {
  const row = one<{ n: number }>(
    db.prepare('SELECT COUNT(*) AS n FROM feedback WHERE business_id = ? AND is_read = 0').get(businessId),
  );
  return row?.n ?? 0;
}

export function markFeedbackRead(db: DB, businessId: number, feedbackId: number): boolean {
  return (
    Number(
      db
        .prepare('UPDATE feedback SET is_read = 1 WHERE id = ? AND business_id = ?')
        .run(feedbackId, businessId).changes,
    ) > 0
  );
}

export function deleteFeedback(db: DB, businessId: number, feedbackId: number): boolean {
  return (
    Number(
      db.prepare('DELETE FROM feedback WHERE id = ? AND business_id = ?').run(feedbackId, businessId).changes,
    ) > 0
  );
}
