/**
 * Tests unitaires — unwrapData (passerelle de gestion des réponses GraphQL).
 *
 * Tous les services de liste passent par cette fonction. Elle doit :
 *  - renvoyer les données quand tout va bien,
 *  - tolérer une réponse PARTIELLE (données + erreurs) en journalisant, sans
 *    casser (comportement Strapi v5 fréquent : champ manquant côté prod),
 *  - LEVER une erreur quand il n'y a que des erreurs et aucune donnée,
 *  - ne jamais avaler une erreur sèche silencieusement.
 */

import { unwrapData } from '@/utils/serviceHelper';

// Simule un AxiosResponse : seul .data est utilisé par unwrapData.
const axiosLike = (payload: any) => Promise.resolve({ data: payload } as any);

describe('unwrapData — cas nominal', () => {
  test('renvoie response.data.data quand il n\'y a pas d\'erreur', async () => {
    const data = { products: [{ id: 1 }] };
    await expect(unwrapData(axiosLike({ data }))).resolves.toEqual(data);
  });

  test('renvoie les données même si le tableau errors est vide', async () => {
    const data = { ok: true };
    await expect(unwrapData(axiosLike({ data, errors: [] }))).resolves.toEqual(data);
  });
});

describe('unwrapData — réponse partielle (données + erreurs)', () => {
  test('renvoie les données et journalise un avertissement', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const data = { partial: 1 };
    const res = await unwrapData(
      axiosLike({ data, errors: [{ message: 'champ manquant' }] })
    );
    expect(res).toEqual(data);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('unwrapData — erreur sèche (aucune donnée)', () => {
  test('lève avec le message de la première erreur', async () => {
    await expect(
      unwrapData(axiosLike({ data: null, errors: [{ message: 'Accès refusé' }] }))
    ).rejects.toThrow('Accès refusé');
  });

  test('lève un message par défaut si l\'erreur n\'a pas de message', async () => {
    await expect(
      unwrapData(axiosLike({ data: null, errors: [{}] }))
    ).rejects.toThrow('GraphQL error');
  });

  test('ne lève PAS quand data est présent malgré des erreurs', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      unwrapData(axiosLike({ data: { x: 1 }, errors: [{ message: 'x' }] }))
    ).resolves.toEqual({ x: 1 });
    warn.mockRestore();
  });
});
