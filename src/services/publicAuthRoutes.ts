/**
 * Routes publiques de connexion et d'inscription : elles partent toujours SANS
 * jeton. Strapi refuse une requête qui porte un jeton qu'il ne reconnaît pas
 * (« Missing or invalid credentials »), même la connexion. Incident du
 * 22/10/2026 : une ancienne session restée dans le stockage partagé entre
 * onglets accompagnait la demande de connexion, et l'utilisateur ne pouvait
 * plus se reconnecter.
 *
 * Liste explicite : d'autres routes `/auth/…` exigent la session
 * (update-own-profile, update-own-company, dashboard-photo, admin-…).
 */
const PUBLIC_AUTH_ROUTE =
  /\/auth\/(local(\/register)?|register|forgot-password|reset-password|client-register|generator-register|verify-email-code|resend-email-code)\/?(\?|$)/;

export const isPublicAuthRequest = (url?: string | null): boolean =>
  !!url && PUBLIC_AUTH_ROUTE.test(url);
