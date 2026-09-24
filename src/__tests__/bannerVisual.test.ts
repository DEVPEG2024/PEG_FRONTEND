// Bannières : image choisie par appareil (utils/bannerVisual.ts) et repli
// quand le backend ne connaît pas encore `mobileImage` (BannerServices.ts).
import {
  pickDesktopImage,
  pickPhoneImage,
  BannerVisual,
  MOBILE_BANNER_WIDTH,
  MOBILE_BANNER_HEIGHT,
} from '@/utils/bannerVisual';

const img = (url: string) => ({ url });

describe('pickDesktopImage', () => {
  test('bannière propre du client en premier', () => {
    const chain: BannerVisual[] = [{ image: img('own') }, { image: img('category') }];
    expect(pickDesktopImage(chain)?.url).toBe('own');
  });

  test("bannière propre sans image d'ordinateur → la suivante", () => {
    const chain: BannerVisual[] = [{ mobileImage: img('own-phone') }, { image: img('new-customer') }];
    expect(pickDesktopImage(chain)?.url).toBe('new-customer');
  });

  test('aucune image → null (visuel épuré)', () => {
    expect(pickDesktopImage([undefined, null, {}])).toBeNull();
  });
});

describe('pickPhoneImage', () => {
  test('version téléphone utilisée quand elle existe', () => {
    expect(pickPhoneImage([{ image: img('own'), mobileImage: img('own-phone') }])).toEqual({
      image: { url: 'own-phone' },
      dedicated: true,
    });
  });

  test("sans version téléphone : l'image d'ordinateur de la MÊME bannière", () => {
    // La bannière propre du client prime sur une version téléphone générique.
    const chain: BannerVisual[] = [{ image: img('own') }, { mobileImage: img('new-customer-phone') }];
    expect(pickPhoneImage(chain)).toEqual({ image: { url: 'own' }, dedicated: false });
  });

  test('bannière sans aucune image ignorée', () => {
    const chain: BannerVisual[] = [{}, { image: img('category'), mobileImage: img('category-phone') }];
    expect(pickPhoneImage(chain)?.image.url).toBe('category-phone');
  });

  test('rien → null', () => {
    expect(pickPhoneImage([])).toBeNull();
  });
});

test('format conseillé : trois fois plus haut qu’une bannière client 2836 × 442 à largeur égale', () => {
  const desktopHeight = (MOBILE_BANNER_WIDTH * 442) / 2836;
  expect(MOBILE_BANNER_HEIGHT / desktopHeight).toBeCloseTo(3, 1);
});

describe('fetchBannerGraphQL — backend sans mobileImage', () => {
  const unknownField = {
    response: {
      status: 400,
      data: { errors: [{ message: 'Cannot query field "mobileImage" on type "Banner".' }] },
    },
  };

  const load = () => {
    const fetchData = jest.fn();
    let services!: typeof import('@/services/BannerServices');
    jest.isolateModules(() => {
      jest.doMock('@/services/ApiService', () => ({ __esModule: true, default: { fetchData } }));
      services = require('@/services/BannerServices');
    });
    return { fetchData, services };
  };

  test('400 « champ inconnu » → rejoue sans le champ, puis ne le redemande plus', async () => {
    const { fetchData, services } = load();
    fetchData
      .mockRejectedValueOnce(unknownField)
      .mockResolvedValue({ data: { data: { banners_connection: { nodes: [], pageInfo: {} } } } });

    await services.apiGetBanners();
    expect(fetchData).toHaveBeenCalledTimes(2);
    expect(fetchData.mock.calls[0][0].data.query).toContain('mobileImage');
    expect(fetchData.mock.calls[1][0].data.query).not.toContain('mobileImage');
    expect(services.isBannerMobileSupported()).toBe(false);

    await services.apiGetBanners();
    expect(fetchData).toHaveBeenCalledTimes(3);
    expect(fetchData.mock.calls[2][0].data.query).not.toContain('mobileImage');
  });

  test('écriture : mobileImage retiré des données quand le serveur ne le connaît pas', async () => {
    const { fetchData, services } = load();
    fetchData
      .mockRejectedValueOnce({
        response: { data: { errors: [{ message: 'Field "mobileImage" is not defined by type "BannerInput".' }] } },
      })
      .mockResolvedValue({ data: { data: { updateBanner: { documentId: 'b1' } } } });

    await services.apiUpdateBanner({ documentId: 'b1', mobileImage: null, active: true } as never);
    const retried = fetchData.mock.calls[1][0].data;
    expect(retried.variables.data).toEqual({ active: true });
    expect(retried.query).not.toContain('mobileImage');
  });

  test('autre erreur réseau : propagée, sans conclure que le champ manque', async () => {
    const { fetchData, services } = load();
    fetchData.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(services.apiGetBanners()).rejects.toBeTruthy();
    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(services.isBannerMobileSupported()).toBe(true);
  });

  test('backend à jour : une seule requête, champ demandé', async () => {
    const { fetchData, services } = load();
    fetchData.mockResolvedValue({ data: { data: { banners_connection: { nodes: [], pageInfo: {} } } } });
    await services.apiGetBanners();
    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(fetchData.mock.calls[0][0].data.query).toContain('mobileImage');
    expect(services.isBannerMobileSupported()).toBe(true);
  });
});
