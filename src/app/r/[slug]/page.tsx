import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { submitFeedbackAction } from '@/app/actions';
import { getDb } from '@/lib/db';
import { isAccent } from '@/lib/palette';
import { getBusinessBySlug } from '@/lib/repo';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ r?: string; lang?: string; sent?: string; error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = getBusinessBySlug(getDb(), slug);
  return b ? { title: `${b.name} · Votre avis`, robots: { index: false } } : {};
}

const SMILEYS = ['😞', '🙁', '😐', '🙂', '😄'] as const;

const UI = {
  fr: {
    title: 'Comment était votre visite ?',
    subtitle: (name: string) => `Donnez votre avis sur ${name}, ça prend 10 secondes.`,
    ratingLabel: (n: number) =>
      ['Très insatisfait', 'Insatisfait', 'Moyen', 'Satisfait', 'Très satisfait'][n - 1],
    thanks: 'Merci pour votre retour ! Votre message a bien été envoyé au commerce, en privé.',
    rate: 'Trop de messages envoyés. Réessayez plus tard.',
    invalid: 'Merci de choisir une note et d’écrire un message.',
    formTitle: 'Dites-nous ce qui n’a pas été',
    formIntro:
      'Votre avis ne sera pas publié sur Google : il est envoyé uniquement au commerce pour qu’il puisse s’améliorer.',
    name: 'Votre nom (facultatif)',
    phone: 'Votre téléphone (facultatif, pour être recontacté)',
    message: 'Votre message',
    send: 'Envoyer en privé',
    back: 'Choisir une autre note',
    lang: 'العربية',
    langLabel: 'Afficher en arabe',
  },
  ar: {
    title: 'كيف كانت زيارتكم؟',
    subtitle: (name: string) => `أعطونا رأيكم في ${name}، الأمر يستغرق 10 ثوان.`,
    ratingLabel: (n: number) => ['غير راضٍ جداً', 'غير راضٍ', 'متوسط', 'راضٍ', 'راضٍ جداً'][n - 1],
    thanks: 'شكراً على ملاحظتكم! تم إرسال رسالتكم للمحل بشكل خاص.',
    rate: 'تم إرسال عدة رسائل. حاولوا مرة أخرى لاحقاً.',
    invalid: 'يرجى اختيار تقييم وكتابة رسالة.',
    formTitle: 'أخبرونا بما لم يكن جيداً',
    formIntro: 'لن يُنشر رأيكم على Google: يُرسل فقط للمحل التجاري لتحسين خدماته.',
    name: 'اسمكم (اختياري)',
    phone: 'هاتفكم (اختياري، للتواصل معكم)',
    message: 'رسالتكم',
    send: 'إرسال بشكل خاص',
    back: 'اختيار تقييم آخر',
    lang: 'Français',
    langLabel: 'العرض بالفرنسية',
  },
} as const;

export default async function ReviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { r, lang: langParam, sent, error } = await searchParams;
  const db = getDb();
  const business = getBusinessBySlug(db, slug);
  if (!business) notFound();

  const lang = langParam === 'ar' ? 'ar' : 'fr';
  const ui = UI[lang];
  const otherLangHref = `?lang=${lang === 'ar' ? 'fr' : 'ar'}${r ? `&r=${r}` : ''}`;
  const accent = isAccent(business.accent) ? business.accent : '#0f766e';

  const rating = r ? Number(r) : undefined;
  const validRating = rating && rating >= 1 && rating <= 5 ? rating : undefined;

  // A good rating sends the customer straight to Google: no extra click, no page in between.
  if (validRating && validRating >= business.threshold && !sent) {
    redirect(business.google_review_url || '/');
  }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} style={{ ['--accent' as string]: accent }}>
      <div className="mx-auto max-w-md px-4 py-10">
        <header className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">{business.name}</h1>
          <a href={otherLangHref} aria-label={ui.langLabel} className="btn">
            {ui.lang}
          </a>
        </header>

        {sent === '1' ? (
          <p role="status" className="card mt-6 border-green-800 bg-green-50 text-green-900">
            {ui.thanks}
          </p>
        ) : validRating === undefined ? (
          <>
            <p className="mt-2 text-muted">{ui.subtitle(business.name)}</p>
            <div className="card mt-6">
              <p className="label">{ui.title}</p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {SMILEYS.map((emoji, i) => {
                  const n = i + 1;
                  return (
                    <a
                      key={n}
                      href={`?r=${n}${lang === 'ar' ? '&lang=ar' : ''}`}
                      aria-label={ui.ratingLabel(n)}
                      className="btn flex min-h-16 flex-col items-center justify-center !p-1 text-2xl"
                    >
                      <span aria-hidden="true">{emoji}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="card mt-6">
            {error === 'rate' && (
              <p role="alert" className="mb-4 rounded-lg border border-red-700 bg-red-50 p-3 text-red-900">
                {ui.rate}
              </p>
            )}
            {error === 'invalid_feedback' && (
              <p role="alert" className="mb-4 rounded-lg border border-red-700 bg-red-50 p-3 text-red-900">
                {ui.invalid}
              </p>
            )}
            <h2 className="font-display text-xl font-bold">{ui.formTitle}</h2>
            <p className="mt-1 text-sm text-muted">{ui.formIntro}</p>
            <form action={submitFeedbackAction} className="mt-4 grid gap-3">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="rating" value={validRating} />
              <div>
                <label className="label" htmlFor="fb-name">
                  {ui.name}
                </label>
                <input className="field" id="fb-name" name="name" maxLength={60} />
              </div>
              <div>
                <label className="label" htmlFor="fb-phone">
                  {ui.phone}
                </label>
                <input className="field" id="fb-phone" name="phone" inputMode="tel" maxLength={30} />
              </div>
              <div>
                <label className="label" htmlFor="fb-message">
                  {ui.message}
                </label>
                <textarea
                  className="field"
                  id="fb-message"
                  name="message"
                  required
                  rows={4}
                  maxLength={1000}
                />
              </div>
              <button className="btn btn-solid" type="submit">
                {ui.send}
              </button>
              <a href={`?${lang === 'ar' ? 'lang=ar' : ''}`} className="text-center text-sm underline">
                {ui.back}
              </a>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
