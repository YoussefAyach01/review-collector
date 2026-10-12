import Link from 'next/link';
import {
  deleteFeedbackAction,
  logoutAction,
  markFeedbackReadAction,
  saveSettingsAction,
} from '@/app/actions';
import { getDb } from '@/lib/db';
import { looksLikeGoogleUrl } from '@/lib/google-url';
import { ERRORS, MESSAGES, pick } from '@/lib/messages';
import { ACCENTS } from '@/lib/palette';
import { listFeedback } from '@/lib/repo';
import { requireOwner } from '@/lib/session';

export const metadata = { title: 'Tableau de bord' };
export const dynamic = 'force-dynamic';

const STARS = ['★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★'];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { business } = await requireOwner();
  const { msg, error } = await searchParams;
  const db = getDb();
  const feedback = listFeedback(db, business.id);
  const reviewPath = `/r/${business.slug}`;
  const flash = pick(MESSAGES, msg);
  const problem = pick(ERRORS, error);
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
  const googleUrlLooksRight = business.google_review_url
    ? looksLikeGoogleUrl(business.google_review_url)
    : true;

  return (
    <div style={{ ['--accent' as string]: business.accent }}>
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="font-display text-2xl font-bold">{business.name}</p>
          <p className="text-sm text-muted">
            Offre {business.plan === 'pro' ? 'Pro' : 'Gratuite'} · {feedback.length} retour
            {feedback.length === 1 ? '' : 's'} privé{feedback.length === 1 ? '' : 's'}
          </p>
        </div>
        <form action={logoutAction}>
          <button className="btn" type="submit">
            Se déconnecter
          </button>
        </form>
      </header>

      <main className="mx-auto grid max-w-4xl gap-6 px-4 pb-16">
        {flash && (
          <p role="status" className="rounded-lg border border-green-800 bg-green-50 p-3 text-green-900">
            {flash}
          </p>
        )}
        {problem && (
          <p role="alert" className="rounded-lg border border-red-700 bg-red-50 p-3 text-red-900">
            {problem}
          </p>
        )}

        <section className="card grid gap-4 sm:grid-cols-[auto_1fr]" aria-labelledby="share">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qr/${business.slug}`}
            alt={`QR code de la page d’avis de ${business.name}`}
            width={160}
            height={160}
            className="size-40 rounded-lg border border-line"
          />
          <div>
            <h2 id="share" className="font-display text-2xl font-bold">
              Votre page d’avis
            </h2>
            <p className="mt-1 break-all">
              <Link className="underline" style={{ color: 'var(--accent)' }} href={reviewPath}>
                {reviewPath}
              </Link>
            </p>
            <p className="mt-3 flex flex-wrap gap-2">
              <Link className="btn btn-solid" href={reviewPath}>
                Voir ma page
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="feedback-h" className="grid gap-4">
          <h2 id="feedback-h" className="font-display text-2xl font-bold">
            Retours privés
          </h2>
          {feedback.length === 0 ? (
            <p className="card text-muted">
              Aucun retour pour l’instant. Les clients avec une note basse écrivent ici, en privé, au lieu de
              laisser un avis public.
            </p>
          ) : (
            <ul className="grid gap-3">
              {feedback.map((f) => (
                <li
                  key={f.id}
                  className={`card ${f.is_read ? '' : 'border-l-4'}`}
                  style={f.is_read ? undefined : { borderLeftColor: 'var(--accent)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p
                        aria-label={`Note : ${f.rating} sur 5`}
                        className="font-bold"
                        style={{ color: 'var(--accent)' }}
                      >
                        {STARS[f.rating - 1]}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {new Date(f.created_at).toLocaleString('fr-FR')}
                        {f.name && ` · ${f.name}`}
                        {f.phone && ` · ${f.phone}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!f.is_read && (
                        <form action={markFeedbackReadAction}>
                          <input type="hidden" name="id" value={f.id} />
                          <button className="btn" type="submit">
                            Marquer lu
                          </button>
                        </form>
                      )}
                      <form action={deleteFeedbackAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <button className="btn btn-danger" type="submit" aria-label="Supprimer ce retour">
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </div>
                  {f.message && <p className="mt-3 whitespace-pre-wrap">{f.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="reglages" className="card" aria-labelledby="settings-h">
          <h2 id="settings-h" className="font-display text-2xl font-bold">
            Réglages
          </h2>
          <form action={saveSettingsAction} className="mt-3 grid gap-4">
            <div>
              <label className="label" htmlFor="s-name">
                Nom du commerce
              </label>
              <input
                className="field"
                id="s-name"
                name="name"
                required
                maxLength={80}
                defaultValue={business.name}
              />
            </div>
            <div>
              <label className="label" htmlFor="s-url">
                Lien de votre avis Google
              </label>
              <input
                className="field"
                id="s-url"
                name="googleReviewUrl"
                type="url"
                required
                maxLength={500}
                defaultValue={business.google_review_url}
              />
              {!googleUrlLooksRight && (
                <p className="mt-1 text-sm text-muted">
                  Ce lien ne ressemble pas à un lien Google habituel (google.com, g.page, goo.gl). Il
                  fonctionnera quand même s’il redirige bien vers votre fiche d’avis.
                </p>
              )}
            </div>
            <fieldset>
              <legend className="label">Note minimale envoyée vers Google</legend>
              <div className="flex flex-wrap gap-3">
                {[4, 5].map((n) => (
                  <label
                    key={n}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3"
                  >
                    <input
                      type="radio"
                      name="threshold"
                      value={n}
                      defaultChecked={n === business.threshold}
                    />
                    {n} étoiles et plus
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label">Couleur de la page</legend>
              <div className="flex flex-wrap gap-3">
                {ACCENTS.map((a) => (
                  <label
                    key={a.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3"
                  >
                    <input
                      type="radio"
                      name="accent"
                      value={a.hex}
                      defaultChecked={a.hex === business.accent}
                    />
                    <span aria-hidden="true" className="size-5 rounded-full" style={{ background: a.hex }} />
                    {a.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="btn btn-solid justify-self-start" type="submit">
              Enregistrer les réglages
            </button>
          </form>
        </section>

        <section className="card" aria-labelledby="plan-h">
          <h2 id="plan-h" className="font-display text-2xl font-bold">
            Offre
          </h2>
          {business.plan === 'pro' ? (
            <p className="mt-2">Vous êtes sur l’offre Pro.</p>
          ) : stripeReady ? (
            <p className="mt-2 text-muted">
              Le paiement en ligne est configuré côté serveur mais n’est pas encore relié à ce bouton.
            </p>
          ) : (
            <p className="mt-2 text-muted">
              Offre gratuite : toutes les fonctionnalités. Le paiement en ligne n’est pas configuré sur ce
              serveur. Pour passer à Pro (79 MAD par mois), contactez l’assistance.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
