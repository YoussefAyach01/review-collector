'use server';

import { redirect } from 'next/navigation';
import { logIn, signUp } from '@/lib/accounts';
import { getDb } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import * as repo from '@/lib/repo';
import { feedbackSchema, idSchema, settingsSchema } from '@/lib/schemas';
import { clearSession, clientIp, requireOwner, setSession } from '@/lib/session';

const str = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};

const HOUR = 3_600_000;

export async function signupAction(fd: FormData): Promise<void> {
  const ip = await clientIp();
  if (!rateLimit(`signup:${ip}`, 5, HOUR).ok) redirect('/signup?error=rate');
  const result = signUp(getDb(), {
    email: str(fd, 'email'),
    password: str(fd, 'password'),
    businessName: str(fd, 'businessName'),
    googleReviewUrl: str(fd, 'googleReviewUrl'),
  });
  if (!result.ok) {
    const code = result.error === 'invalid_input' ? `invalid_${result.field ?? ''}` : result.error;
    redirect(`/signup?error=${encodeURIComponent(code)}`);
  }
  await setSession(result.userId);
  redirect('/dashboard?msg=welcome');
}

export async function loginAction(fd: FormData): Promise<void> {
  const ip = await clientIp();
  const email = str(fd, 'email').trim().toLowerCase().slice(0, 200);
  if (!rateLimit(`login-ip:${ip}`, 20, 15 * 60_000).ok || !rateLimit(`login:${email}`, 5, 15 * 60_000).ok) {
    redirect('/login?error=rate');
  }
  const result = logIn(getDb(), { email, password: str(fd, 'password') });
  if (!result.ok) redirect('/login?error=invalid_credentials');
  await setSession(result.userId);
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/');
}

export async function saveSettingsAction(fd: FormData): Promise<void> {
  const { business } = await requireOwner();
  const parsed = settingsSchema.safeParse({
    name: str(fd, 'name'),
    googleReviewUrl: str(fd, 'googleReviewUrl'),
    threshold: str(fd, 'threshold'),
    accent: str(fd, 'accent'),
  });
  if (!parsed.success) redirect('/dashboard?error=invalid_settings#reglages');
  repo.updateBusiness(getDb(), business.id, parsed.data);
  redirect('/dashboard?msg=settings_saved');
}

export async function markFeedbackReadAction(fd: FormData): Promise<void> {
  const { business } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  if (id.success) repo.markFeedbackRead(getDb(), business.id, id.data);
  redirect('/dashboard');
}

export async function deleteFeedbackAction(fd: FormData): Promise<void> {
  const { business } = await requireOwner();
  const id = idSchema.safeParse(fd.get('id'));
  if (id.success) repo.deleteFeedback(getDb(), business.id, id.data);
  redirect('/dashboard?msg=feedback_deleted');
}

/** Public: anyone visiting a review page can submit low-rating feedback. Rate-limited per IP and per shop. */
export async function submitFeedbackAction(fd: FormData): Promise<void> {
  const slug = str(fd, 'slug');
  const db = getDb();
  const business = repo.getBusinessBySlug(db, slug);
  if (!business) redirect('/');

  const ip = await clientIp();
  if (
    !rateLimit(`feedback-ip:${ip}`, 10, HOUR).ok ||
    !rateLimit(`feedback-biz:${business.slug}`, 100, HOUR).ok
  ) {
    redirect(`/r/${encodeURIComponent(slug)}?error=rate`);
  }

  const parsed = feedbackSchema.safeParse({
    rating: str(fd, 'rating'),
    name: str(fd, 'name'),
    phone: str(fd, 'phone'),
    message: str(fd, 'message'),
  });
  if (!parsed.success) redirect(`/r/${encodeURIComponent(slug)}?error=invalid_feedback`);
  if (parsed.data.rating >= business.threshold) redirect(`/r/${encodeURIComponent(slug)}`);

  repo.addFeedback(db, business.id, parsed.data);
  redirect(`/r/${encodeURIComponent(slug)}?sent=1`);
}
