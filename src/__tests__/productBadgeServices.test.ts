// Service des badges : route REST dédiée (GET /product-badges), présence de la route
// = badges déployés ; demandes d'un même tour regroupées en UNE requête ; relecture
// après un enregistrement admin ; route absente → plus aucune requête.

const fetchData = jest.fn();
jest.mock('@/services/ApiService', () => ({ __esModule: true, default: { fetchData: (...a: unknown[]) => fetchData(...a) } }));

const urlOf = (call: unknown[]) => (call[0] as { url: string }).url;
const notFound = () => Object.assign(new Error('404'), { response: { status: 404 } });

beforeEach(() => {
  jest.resetModules();
  fetchData.mockReset();
});

it('route déployée : 3 cartes → une seule requête, badges validés', async () => {
  fetchData.mockImplementation(async () => ({ data: { result: true, badges: { a: [{ kind: 'promo' }, { kind: 'pirate' }], b: null } } }));
  const s = await import('@/services/ProductBadgeServices');
  const [a, b, c] = await Promise.all([s.loadProductBadges('a'), s.loadProductBadges('b'), s.loadProductBadges('c')]);
  expect(a).toEqual([{ kind: 'promo' }]);
  expect(b).toEqual([]);
  expect(c).toEqual([]);
  expect(fetchData).toHaveBeenCalledTimes(1);
  expect(urlOf(fetchData.mock.calls[0])).toBe('/product-badges?ids=a,b,c');
  await s.loadProductBadges('a'); // en cache
  expect(fetchData).toHaveBeenCalledTimes(1);
});

it('route absente (backend pas déployé) : une seule tentative, puis plus rien', async () => {
  fetchData.mockRejectedValue(notFound());
  const s = await import('@/services/ProductBadgeServices');
  expect(await s.loadProductBadges('a')).toEqual([]);
  expect(await s.loadProductBadges('b')).toEqual([]);
  expect(await s.apiAreProductBadgesAvailable()).toBe(false);
  expect(await s.apiGetBadgeLibrary()).toEqual([]);
  expect(fetchData).toHaveBeenCalledTimes(1);
});

it('éditeur : disponibilité sondée, bibliothèque relue et validée', async () => {
  fetchData.mockImplementation(async ({ url }: { url: string }) =>
    url === '/product-badges/library'
      ? { data: { result: true, badges: [{ kind: 'custom', label: 'Club', color: '#EC4899' }, { kind: 'new' }] } }
      : { data: { result: true, badges: {} } });
  const s = await import('@/services/ProductBadgeServices');
  expect(await s.apiAreProductBadgesAvailable()).toBe(true);
  expect(await s.apiGetBadgeLibrary()).toEqual([{ kind: 'custom', label: 'Club', color: '#ec4899' }]);
});

it('après un enregistrement : invalidation → les cartes abonnées relisent', async () => {
  let promo = false;
  fetchData.mockImplementation(async () => ({ data: { result: true, badges: { a: promo ? [{ kind: 'promo' }] : [] } } }));
  const s = await import('@/services/ProductBadgeServices');
  expect(await s.loadProductBadges('a')).toEqual([]);
  const listener = jest.fn();
  const off = s.subscribeProductBadges(listener);
  promo = true;
  s.invalidateProductBadges(['a']);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(await s.loadProductBadges('a')).toEqual([{ kind: 'promo' }]);
  off();
  s.invalidateProductBadges();
  expect(listener).toHaveBeenCalledTimes(1);
});

it('erreur passagère (500, réseau) : badges vides, la route reste tentée ensuite', async () => {
  fetchData.mockRejectedValueOnce(Object.assign(new Error('500'), { response: { status: 500 } }))
    .mockResolvedValue({ data: { result: true, badges: { b: [{ kind: 'new' }] } } });
  const s = await import('@/services/ProductBadgeServices');
  await expect(s.loadProductBadges('a')).resolves.toEqual([]);
  await expect(s.loadProductBadges('b')).resolves.toEqual([{ kind: 'new' }]);
});
