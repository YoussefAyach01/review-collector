// Creates a demo business (slug "demo") so the landing page's demo link works.
// Usage: npm run seed   (login: demo@example.com / demo-password-1)
import { openDb } from '../src/lib/db.ts';
import { signUp } from '../src/lib/accounts.ts';
import { addFeedback, getBusinessBySlug } from '../src/lib/repo.ts';

const db = openDb(process.env.DATABASE_PATH ?? './data/review-collector.db');
if (getBusinessBySlug(db, 'demo')) {
  console.log('Demo already exists, nothing to do.');
} else {
  const r = signUp(db, {
    email: 'demo@example.com',
    password: 'demo-password-1',
    businessName: 'Demo',
    googleReviewUrl: 'https://g.page/r/demo-example/review',
  });
  if (!r.ok) throw new Error(`seed failed: ${r.error}`);
  const business = getBusinessBySlug(db, 'demo');
  if (!business) throw new Error('seed failed');
  db.prepare("UPDATE businesses SET name = 'Dar Zaytoun (démo)' WHERE id = ?").run(business.id);
  addFeedback(db, business.id, {
    rating: 2,
    name: 'Client anonyme',
    phone: '',
    message: 'L’attente était trop longue le samedi midi.',
  });
  console.log('Demo created: /r/demo');
}
