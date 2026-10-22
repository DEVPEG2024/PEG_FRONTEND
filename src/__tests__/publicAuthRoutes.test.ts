/**
 * Incident du 22/10/2026 : « Missing or invalid credentials » à la connexion.
 * Une ancienne session restée dans le stockage partait avec la demande de
 * connexion ; Strapi, qui ne la reconnaissait pas, refusait la connexion
 * elle-même. Les routes publiques partent désormais toujours sans jeton.
 */
import { isPublicAuthRequest } from '@/services/publicAuthRoutes';
import * as fs from 'fs';
import * as path from 'path';

const API = 'https://api.mypeg.fr/api';

describe('routes publiques de connexion : jamais de jeton', () => {
  it.each([
    `${API}/auth/local/`,
    `${API}/auth/local`,
    `${API}/auth/register/`,
    `${API}/auth/local/register`,
    `${API}/auth/forgot-password`,
    `${API}/auth/reset-password`,
    `${API}/auth/client-register`,
    `${API}/auth/generator-register`,
    `${API}/auth/verify-email-code`,
    `${API}/auth/resend-email-code`,
    '/auth/local/',
  ])('« %s » part sans jeton', (url) => {
    expect(isPublicAuthRequest(url)).toBe(true);
  });

  it.each([
    // Routes /auth/… qui exigent la session de l'appelant
    `${API}/auth/update-own-profile`,
    `${API}/auth/update-own-company`,
    `${API}/auth/dashboard-photo`,
    `${API}/auth/admin-create-user`,
    `${API}/auth/admin-update-user/12`,
    // Le reste de l'application
    `${API}/users/me`,
    `${API}/graphql`,
    `${API}/village/summary`,
    `${API}/sign-out`,
    '',
    undefined,
  ])('« %s » garde la session', (url) => {
    expect(isPublicAuthRequest(url)).toBe(false);
  });

  it("l'intercepteur des appels à Strapi s'en sert avant d'ajouter le jeton", () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../services/BaseService.ts'),
      'utf8'
    );
    const skip = src.indexOf('isPublicAuthRequest(config.url)');
    const attach = src.indexOf('config.headers[');
    expect(skip).toBeGreaterThan(0);
    expect(skip).toBeLessThan(attach);
  });
});
