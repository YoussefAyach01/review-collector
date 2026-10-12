import Link from 'next/link';

const STEPS = [
  [
    'Collez votre lien d’avis Google',
    'On le trouve dans votre fiche Google Business en un clic "Demander des avis".',
  ],
  ['Partagez le lien ou le QR code', 'Sur le ticket de caisse, en vitrine, ou envoyé par WhatsApp.'],
  [
    'Les avis positifs vont sur Google',
    'Les clients mécontents vous écrivent en privé à la place : pas de mauvaise surprise publique.',
  ],
] as const;

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-display text-2xl font-bold">Avis Facile</span>
        <nav aria-label="Compte" className="flex items-center gap-3">
          <Link href="/login" className="min-h-11 px-2 py-2 font-semibold underline">
            Connexion
          </Link>
          <Link href="/signup" className="btn btn-solid">
            Commencer gratuitement
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div>
            <p className="text-sm font-bold tracking-widest text-brand uppercase">
              Avis Google pour commerces locaux
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight font-bold sm:text-5xl">
              Les clients contents sur Google. Les autres, en privé avec vous.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Un simple lien ou QR code : le client note son expérience, et en fonction de la note est soit
              envoyé vers votre page Google pour laisser un avis, soit invité à vous écrire directement un
              message privé pour vous permettre de corriger le problème avant qu’il ne devienne public.
            </p>
            <p className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-solid">
                Créer ma page d’avis
              </Link>
              <Link href="/r/demo" className="btn">
                Voir une page de démonstration
              </Link>
            </p>
          </div>

          {/* The thing the customer sees, drawn in CSS so the page needs no images */}
          <div
            aria-hidden="true"
            className="mx-auto w-full max-w-64 rounded-[2rem] border-4 border-ink bg-white p-5 shadow-xl"
          >
            <p className="font-display text-center font-bold">Dar Zaytoun</p>
            <p className="mt-1 text-center text-sm text-muted">Comment était votre visite ?</p>
            <div className="mt-4 flex justify-between text-3xl">
              <span>😞</span>
              <span>🙁</span>
              <span>😐</span>
              <span>🙂</span>
              <span className="rounded-full bg-brand/10 p-1">😄</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10" aria-labelledby="how">
          <h2 id="how" className="font-display text-3xl font-bold">
            Comment ça marche
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="card">
                <span className="text-sm font-bold text-brand">Étape {i + 1}</span>
                <h3 className="mt-1 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10" aria-labelledby="pricing">
          <h2 id="pricing" className="font-display text-3xl font-bold">
            Tarifs
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="text-xl font-bold">Gratuit</h3>
              <p className="mt-1 text-3xl font-bold">0 MAD</p>
              <ul className="mt-3 list-disc ps-5 text-muted">
                <li>Page et QR code d’avis</li>
                <li>Retours privés illimités</li>
                <li>FR/AR</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="text-xl font-bold">Pro</h3>
              <p className="mt-1 text-3xl font-bold">
                79 MAD <span className="text-base font-normal text-muted">/ mois</span>
              </p>
              <ul className="mt-3 list-disc ps-5 text-muted">
                <li>Tout ce qui est dans Gratuit</li>
                <li>Assistance par WhatsApp</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted">Avis Facile · fait au Maroc</footer>
    </>
  );
}
