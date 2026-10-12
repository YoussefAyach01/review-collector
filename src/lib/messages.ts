/** Flash messages shown on dashboard/login/signup, keyed by the ?msg= / ?error= codes the actions redirect with. */
export const MESSAGES: Record<string, string> = {
  welcome: 'Bienvenue ! Partagez votre lien ou QR code pour commencer à recevoir des avis.',
  settings_saved: 'Réglages enregistrés.',
  feedback_deleted: 'Retour supprimé.',
};

export const ERRORS: Record<string, string> = {
  rate: 'Trop de tentatives. Réessayez dans quelques minutes.',
  email_taken: 'Un compte existe déjà avec cet e-mail. Connectez-vous plutôt.',
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  invalid_email: 'Entrez une adresse e-mail valide.',
  invalid_password: 'Le mot de passe doit contenir au moins 10 caractères.',
  invalid_businessName: 'Entrez le nom de votre commerce (2 caractères minimum).',
  invalid_googleReviewUrl: 'Lien d’avis Google invalide. Il doit commencer par https://.',
  invalid_settings: 'Réglages invalides : vérifiez le nom, le lien Google et la couleur.',
};

export const pick = (map: Record<string, string>, code: string | undefined): string | undefined =>
  code ? map[code] : undefined;
