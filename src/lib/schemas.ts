import { z } from 'zod';
import { isAccent } from './palette.ts';
import { parseGoogleReviewUrl } from './google-url.ts';

const text = (max: number) => z.string().trim().max(max);

export const googleUrlField = z.string().transform((v, ctx) => {
  const parsed = parseGoogleReviewUrl(v);
  if (!parsed.ok) ctx.addIssue({ code: 'custom', message: 'invalid_google_url' });
  return parsed.ok ? parsed.url : '';
});

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  password: z.string().min(10, 'password_short').max(200),
  businessName: text(80).min(2),
  googleReviewUrl: googleUrlField,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(200),
  password: z.string().min(1).max(200),
});

export const settingsSchema = z.object({
  name: text(80).min(2),
  googleReviewUrl: googleUrlField,
  threshold: z.coerce
    .number()
    .int()
    .refine((n) => n === 4 || n === 5, 'invalid_threshold'),
  accent: z.string().refine(isAccent, 'invalid_accent'),
});

export const feedbackSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .refine((n) => n >= 1 && n <= 5, 'invalid_rating'),
  name: text(60).default(''),
  phone: text(30).default(''),
  message: text(1000).default(''),
});

export const idSchema = z.coerce.number().int().positive();
