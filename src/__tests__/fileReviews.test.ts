// Réponse du client aux fichiers du projet (utils/fileReviews.ts).
import {
  fileReviewStatus,
  readFileReviews,
  replaceInList,
  withClientAnswer,
  withReplacement,
} from '@/utils/fileReviews';

describe('fileReviews — lecture', () => {
  test('champ absent du backend : fonction masquée', () => {
    expect(readFileReviews(undefined)).toBeUndefined();
  });

  test('vide, texte JSON ou objet', () => {
    expect(readFileReviews(null)).toEqual({});
    expect(readFileReviews('{"10":{"status":"approved"}}')).toEqual({ '10': { status: 'approved' } });
    expect(readFileReviews('pas du json')).toEqual({});
    expect(readFileReviews(['x'])).toEqual({});
  });

  test('sans réponse : en attente du client', () => {
    expect(fileReviewStatus({}, 10)).toBe('pending');
    expect(fileReviewStatus({ '10': { status: 'rejected', comment: 'x' } }, 10)).toBe('rejected');
    expect(fileReviewStatus(undefined, '10')).toBe('pending');
  });
});

describe('fileReviews — réponses', () => {
  test('valider efface le motif, refuser le garde (nettoyé)', () => {
    const refused = withClientAnswer({}, 10, 'rejected', '  Logo trop petit ');
    expect(refused).toEqual({ '10': { status: 'rejected', comment: 'Logo trop petit' } });
    expect(withClientAnswer(refused, 10, 'approved', null)).toEqual({ '10': { status: 'approved', comment: null } });
  });

  test('les autres fichiers ne bougent pas', () => {
    const base = { '11': { status: 'approved' as const } };
    expect(withClientAnswer(base, 10, 'approved', null)['11']).toBe(base['11']);
  });

  test('nouvelle version : l’ancienne réponse part, l’historique suit', () => {
    const next = withReplacement({ '10': { status: 'rejected', comment: 'Couleur' }, '11': { status: 'approved' } }, 10, 42, 'maquette-v1.pdf', '2026-10-22T18:00:00Z');
    expect(next).toEqual({
      '11': { status: 'approved' },
      '42': { status: 'pending', at: '2026-10-22T18:00:00Z', replaces: 'maquette-v1.pdf', previousComment: 'Couleur' },
    });
  });

  test('la nouvelle version prend la place de l’ancienne dans la liste', () => {
    const list = [{ id: '1', name: 'a' }, { id: '10', name: 'v1' }, { id: '3', name: 'c' }];
    expect(replaceInList(list, 10, { id: '42', name: 'v2' }).map((f) => f.id)).toEqual(['1', '42', '3']);
  });
});
