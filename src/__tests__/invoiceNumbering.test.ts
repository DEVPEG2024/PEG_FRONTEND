/**
 * Tests unitaires — génération du prochain numéro de facture (FAC-XXXX).
 *
 * Séquence CRITIQUE : partagée PEG/NOVA. Un bug ici = collision de numéros
 * de facture. On vérifie le calcul du max, le padding, l'ignorance des noms
 * hors-format, et surtout que la fonction LÈVE une erreur au lieu de retomber
 * silencieusement sur FAC-0001 quand la requête échoue.
 *
 * ApiService (couche réseau) est mocké : on teste la logique pure de la
 * fonction, pas GraphQL.
 */

jest.mock('@/services/ApiService', () => ({
  __esModule: true,
  default: { fetchData: jest.fn() },
}));

import ApiService from '@/services/ApiService';
import { apiGetNextInvoiceNumber } from '@/services/InvoicesServices';

const mockFetch = (ApiService as unknown as { fetchData: jest.Mock }).fetchData;

// Construit une réponse GraphQL valide à partir d'une liste de noms.
const okResponse = (names: string[]) => ({
  data: { data: { invoices_connection: { nodes: names.map((name) => ({ name })) } } },
});

beforeEach(() => {
  mockFetch.mockReset();
});

describe('apiGetNextInvoiceNumber — calcul du numéro', () => {
  test('aucune facture existante → FAC-0001', async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await expect(apiGetNextInvoiceNumber()).resolves.toBe('FAC-0001');
  });

  test('retourne max + 1, sur 4 chiffres', async () => {
    mockFetch.mockResolvedValue(okResponse(['FAC-0007', 'FAC-0003', 'FAC-0005']));
    await expect(apiGetNextInvoiceNumber()).resolves.toBe('FAC-0008');
  });

  test('ne dépend pas de l\'ordre des nœuds', async () => {
    mockFetch.mockResolvedValue(okResponse(['FAC-0002', 'FAC-0042', 'FAC-0010']));
    await expect(apiGetNextInvoiceNumber()).resolves.toBe('FAC-0043');
  });

  test('ignore les noms hors format FAC-XXXX (PDF uploadés, etc.)', async () => {
    mockFetch.mockResolvedValue(
      okResponse(['FAC-0004', 'facture-scan.pdf', 'FAC-abc', 'FAC-0004-bis', 'DEVIS-0099'])
    );
    // seul FAC-0004 est valide → suivant = FAC-0005
    await expect(apiGetNextInvoiceNumber()).resolves.toBe('FAC-0005');
  });

  test('ne tronque pas au-delà de 4 chiffres', async () => {
    mockFetch.mockResolvedValue(okResponse(['FAC-9999']));
    await expect(apiGetNextInvoiceNumber()).resolves.toBe('FAC-10000');
  });

  test('gère les numéros avec zéros non significatifs', async () => {
    mockFetch.mockResolvedValue(okResponse(['FAC-0099', 'FAC-0100']));
    await expect(apiGetNextInvoiceNumber()).resolves.toBe('FAC-0101');
  });

  test('nodes absent (null) → traité comme liste vide', async () => {
    mockFetch.mockResolvedValue({
      data: { data: { invoices_connection: { nodes: null } } },
    });
    await expect(apiGetNextInvoiceNumber()).resolves.toBe('FAC-0001');
  });
});

describe('apiGetNextInvoiceNumber — garde-fous (pas de reset silencieux)', () => {
  test('erreurs GraphQL → lève une erreur (jamais FAC-0001 silencieux)', async () => {
    mockFetch.mockResolvedValue({
      data: { errors: [{ message: 'boom' }] },
    });
    await expect(apiGetNextInvoiceNumber()).rejects.toThrow(/GraphQL/i);
  });

  test('réponse sans invoices_connection → lève une erreur', async () => {
    mockFetch.mockResolvedValue({ data: { data: {} } });
    await expect(apiGetNextInvoiceNumber()).rejects.toThrow(/invalide/i);
  });
});
