import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type DB } from '../src/lib/db.ts';
import { logIn, signUp } from '../src/lib/accounts.ts';
import * as repo from '../src/lib/repo.ts';

let db: DB;
beforeEach(() => {
  db = openDb(':memory:');
});

const signup = (email: string, name = 'Dar Zaytoun') =>
  signUp(db, {
    email,
    password: 'a-long-password',
    businessName: name,
    googleReviewUrl: 'https://g.page/r/abc/review',
  });

function owner(email: string, name?: string) {
  const r = signup(email, name);
  if (!r.ok) throw new Error(r.error);
  const business = repo.getBusinessByOwner(db, r.userId);
  if (!business) throw new Error('no business');
  return business;
}

describe('signup and login', () => {
  it('creates a user with a business, a slug and the given Google review URL', () => {
    const r = owner('A@Example.com', 'Café Dar Zitoun');
    expect(r.slug).toBe('cafe-dar-zitoun');
    expect(r.google_review_url).toBe('https://g.page/r/abc/review');
    expect(r.plan).toBe('free');
    expect(r.threshold).toBe(4);
  });

  it('gives a second business with the same name a different slug', () => {
    owner('a@x.com');
    expect(owner('b@x.com').slug).toBe('dar-zaytoun-2');
  });

  it('rejects a duplicate email, case-insensitively', () => {
    owner('a@x.com');
    expect(signup('A@X.com')).toEqual({ ok: false, error: 'email_taken' });
  });

  it.each([
    [
      {
        email: 'nope',
        password: 'a-long-password',
        businessName: 'X Y',
        googleReviewUrl: 'https://g.page/r/abc',
      },
      'email',
    ],
    [
      {
        email: 'a@x.com',
        password: 'short',
        businessName: 'X Y',
        googleReviewUrl: 'https://g.page/r/abc',
      },
      'password',
    ],
    [
      { email: 'a@x.com', password: 'a-long-password', businessName: 'X Y', googleReviewUrl: 'not a url' },
      'googleReviewUrl',
    ],
    [
      {
        email: 'a@x.com',
        password: 'a-long-password',
        businessName: '',
        googleReviewUrl: 'https://g.page/r/abc',
      },
      'businessName',
    ],
  ])('rejects invalid signup %#', (input, field) => {
    expect(signUp(db, input)).toEqual({ ok: false, error: 'invalid_input', field });
  });

  it('logs in with the right password and uses one error for unknown user and wrong password', () => {
    owner('a@x.com');
    expect(logIn(db, { email: 'A@x.com', password: 'a-long-password' }).ok).toBe(true);
    const wrong = logIn(db, { email: 'a@x.com', password: 'nope-nope-nope' });
    const unknown = logIn(db, { email: 'ghost@x.com', password: 'a-long-password' });
    expect(wrong).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(unknown).toEqual(wrong);
  });

  it('never stores the plaintext password', () => {
    owner('a@x.com');
    const u = repo.findUserByEmail(db, 'a@x.com');
    expect(u?.password_hash.startsWith('scrypt$')).toBe(true);
    expect(u?.password_hash).not.toContain('a-long-password');
  });
});

describe('settings', () => {
  it('updates name, review url, threshold and accent', () => {
    const b = owner('a@x.com');
    repo.updateBusiness(db, b.id, {
      name: 'New Name',
      googleReviewUrl: 'https://maps.app.goo.gl/xyz',
      threshold: 5,
      accent: '#166534',
    });
    const updated = repo.getBusinessBySlug(db, b.slug);
    expect(updated).toMatchObject({
      name: 'New Name',
      google_review_url: 'https://maps.app.goo.gl/xyz',
      threshold: 5,
      accent: '#166534',
    });
  });
});

describe('feedback', () => {
  it('stores and lists feedback newest first', () => {
    const b = owner('a@x.com');
    repo.addFeedback(db, b.id, { rating: 2, name: 'Fatima', phone: '0612345678', message: 'Trop lent' });
    repo.addFeedback(db, b.id, { rating: 1, name: '', phone: '', message: 'Mauvais accueil' });
    const list = repo.listFeedback(db, b.id);
    expect(list).toHaveLength(2);
    expect(list.map((f) => f.message)).toEqual(['Mauvais accueil', 'Trop lent']);
    expect(list.every((f) => f.is_read === 0)).toBe(true);
  });

  it('marks feedback read and counts unread', () => {
    const b = owner('a@x.com');
    const list0 = () => repo.listFeedback(db, b.id);
    repo.addFeedback(db, b.id, { rating: 2, name: '', phone: '', message: 'x' });
    expect(repo.countUnreadFeedback(db, b.id)).toBe(1);
    const id = list0()[0]?.id;
    if (id === undefined) throw new Error('missing feedback');
    repo.markFeedbackRead(db, b.id, id);
    expect(repo.countUnreadFeedback(db, b.id)).toBe(0);
  });

  it('deletes feedback', () => {
    const b = owner('a@x.com');
    repo.addFeedback(db, b.id, { rating: 2, name: '', phone: '', message: 'x' });
    const id = repo.listFeedback(db, b.id)[0]?.id;
    if (id === undefined) throw new Error('missing feedback');
    expect(repo.deleteFeedback(db, b.id, id)).toBe(true);
    expect(repo.listFeedback(db, b.id)).toHaveLength(0);
  });
});

describe('ownership (IDOR)', () => {
  it("one owner cannot read, mark-read or delete another owner's feedback", () => {
    const mine = owner('a@x.com', 'Mine');
    const theirs = owner('b@x.com', 'Theirs');
    repo.addFeedback(db, theirs.id, { rating: 1, name: '', phone: '', message: 'Secret' });
    const theirFeedbackId = repo.listFeedback(db, theirs.id)[0]?.id;
    if (theirFeedbackId === undefined) throw new Error('setup');

    expect(repo.markFeedbackRead(db, mine.id, theirFeedbackId)).toBe(false);
    expect(repo.deleteFeedback(db, mine.id, theirFeedbackId)).toBe(false);
    expect(repo.listFeedback(db, mine.id)).toHaveLength(0);
    const still = repo.listFeedback(db, theirs.id);
    expect(still).toHaveLength(1);
    expect(still[0]?.is_read).toBe(0);
  });

  it('is safe against SQL injection in text fields', () => {
    const b = owner('a@x.com');
    repo.addFeedback(db, b.id, {
      rating: 1,
      name: "x'); DROP TABLE feedback;--",
      phone: '',
      message: "'; DELETE FROM users;--",
    });
    expect(repo.findUserByEmail(db, 'a@x.com')).toBeTruthy();
    expect(repo.listFeedback(db, b.id)).toHaveLength(1);
  });
});
