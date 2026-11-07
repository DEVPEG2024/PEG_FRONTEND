/**
 * Erreurs de mot de passe (changement dans le compte, « mot de passe oublié ») :
 * ce que le serveur répond → une phrase pour le client. Strapi place son message
 * dans `error.message`, en anglais pour ses routes natives ; une erreur inconnue
 * donne le texte de repli, jamais « AxiosError: Request failed… ».
 */
const TRANSLATIONS: [RegExp, string][] = [
  [/current password is invalid/i, 'Mot de passe actuel incorrect. Oublié ? Déconnectez-vous, puis « Mot de passe oublié » sur la page de connexion.'],
  [/must be different/i, 'Le nouveau mot de passe doit être différent de l’actuel.'],
  [/do not match|ne correspondent pas/i, 'Les mots de passe ne correspondent pas.'],
  [/at least \d+ characters/i, 'Mot de passe trop court (6 caractères minimum).'],
  [/73 bytes/i, 'Mot de passe trop long (72 caractères maximum).'],
  [/email does not exist/i, 'Aucun compte n’existe avec cette adresse e-mail.'],
  [/code invalide/i, 'Ce lien a expiré ou a déjà servi. Refaites une demande depuis « Mot de passe oublié ».'],
  [/trop de requêtes|too many requests/i, 'Trop de tentatives. Réessayez dans une minute.'],
];

export const passwordErrorMessage = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: { error?: { message?: unknown } | string; message?: unknown } } })?.response?.data;
  const raw = typeof data?.error === 'string' ? data.error : data?.error?.message ?? data?.message;
  const text = typeof raw === 'string' ? raw : '';
  return TRANSLATIONS.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
};
