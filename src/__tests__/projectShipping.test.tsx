/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ProjectShippingBar from '@/views/app/common/projects/details/components/shipping/ProjectShippingBar';
import ProjectHeaderMobile from '@/views/app/common/projects/details/components/ProjectHeaderMobile';
import { resetProjectShippingCache } from '@/views/app/common/projects/details/components/shipping/useProjectShipping';
import { shippingDateBounds } from '@/views/app/common/projects/details/components/shipping/ShipProjectDialog';
import type {
  GetProjectShippingResponse,
  ProjectShipping,
  ShippingCarrierOption,
} from '@/@types/shipping';

// Barre « Expédition » de l'en-tête projet : seule la route REST dédiée est simulée
// (ShippingServices). Le serveur décide de tout (résumé, lien, droits) ; la barre
// affiche, ouvre le dialogue et envoie le bon corps.

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const toast = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};
jest.mock('react-toastify', () => ({
  toast: {
    success: (m: string) => toast.success(m),
    error: (m: string) => toast.error(m),
    info: (m: string) => toast.info(m),
    warning: (m: string) => toast.warning(m),
  },
}));
const getShipping = jest.fn();
const markShipped = jest.fn();
const cancelShipping = jest.fn();
jest.mock('@/services/ShippingServices', () => ({
  apiGetProjectShipping: (id: string) => getShipping(id),
  apiMarkProjectShipped: (id: string, data: unknown) => markShipped(id, data),
  apiCancelProjectShipping: (id: string) => cancelShipping(id),
}));

const project = {
  documentId: 'p0jet4bcd1234efgh5678ijk',
  name: 'Casquettes Club',
};
const NOT_SHIPPED: ProjectShipping = {
  shipped: false,
  shippedAt: null,
  carrier: null,
  carrierLabel: null,
  trackingNumber: null,
  trackingUrl: null,
  pickup: false,
  summary: null,
};
const COLISSIMO: ProjectShipping = {
  shipped: true,
  shippedAt: '2026-10-02T08:00:00.000Z',
  carrier: 'colissimo',
  carrierLabel: 'Colissimo',
  trackingNumber: '6A123',
  trackingUrl: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A123',
  pickup: false,
  summary: 'Expédié le 2 oct. · Colissimo',
};
const CARRIERS: ShippingCarrierOption[] = [
  { value: 'colissimo', label: 'Colissimo', tracking: true },
  { value: 'peg_delivery', label: 'Livraison PEG', tracking: false },
  { value: 'pickup', label: 'Retrait sur place', tracking: false },
];
const reply = (data: Partial<GetProjectShippingResponse>) =>
  Promise.resolve({ data: { result: true, ...data } });
const httpError = (status: number, message?: string) =>
  Promise.reject(
    Object.assign(new Error(String(status)), {
      response: { status, data: { result: false, message } },
    })
  );

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  [
    getShipping,
    markShipped,
    cancelShipping,
    toast.success,
    toast.error,
    toast.info,
    toast.warning,
  ].forEach((m) => m.mockReset());
  resetProjectShippingCache();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

/** Jour de Paris (le serveur compare des jours calendaires de Paris). */
const parisToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
const render = async (variant?: 'desktop' | 'mobile') => {
  await act(async () => {
    root.render(<ProjectShippingBar project={project} variant={variant} />);
  });
  await flush();
};
const button = (label: string) =>
  [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === label
  ) as HTMLButtonElement | undefined;
const click = (el: HTMLElement) =>
  act(() => {
    el.click();
  });
const setValue = (el: HTMLInputElement | HTMLSelectElement, value: string) =>
  act(() => {
    const proto =
      el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
    el.dispatchEvent(
      new Event(el instanceof HTMLSelectElement ? 'change' : 'input', {
        bubbles: true,
      })
    );
  });
const submitDialog = async () => {
  const form = document.querySelector(
    '[role="dialog"] form'
  ) as HTMLFormElement;
  await act(async () => {
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
  });
  await flush();
};

describe('Barre « Expédition » — lecture', () => {
  it('route absente (404, Strapi pas encore déployé) → rien', async () => {
    getShipping.mockImplementation(() => httpError(404));
    await render();
    expect(getShipping).toHaveBeenCalledWith(project.documentId);
    expect(container.innerHTML).toBe('');
  });

  it('autre producteur (403) → rien', async () => {
    getShipping.mockImplementation(() =>
      httpError(403, "Réservé à l'équipe PEG et au producteur du projet")
    );
    await render();
    expect(container.innerHTML).toBe('');
  });

  it('client, projet expédié → « Expédié le 2 oct. · Colissimo · Suivre le colis »', async () => {
    getShipping.mockReturnValue(reply({ shipping: COLISSIMO, canEdit: false }));
    await render();
    expect(container.textContent).toContain('Expédié le 2 oct. · Colissimo');
    const link = [...container.querySelectorAll('a')].find(
      (a) => a.textContent === 'Suivre le colis'
    ) as HTMLAnchorElement;
    expect(link.href).toBe(
      'https://www.laposte.fr/outils/suivre-vos-envois?code=6A123'
    );
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(button('Marquer comme expédié')).toBeUndefined();
    expect(button('Modifier')).toBeUndefined();
  });

  it('livraison PEG / sans numéro → pas de lien de suivi', async () => {
    getShipping.mockReturnValue(
      reply({
        shipping: {
          ...COLISSIMO,
          carrier: 'peg_delivery',
          carrierLabel: 'Livraison PEG',
          trackingNumber: null,
          trackingUrl: null,
          summary: 'Expédié le 2 oct. · Livraison PEG',
        },
        canEdit: false,
      })
    );
    await render();
    expect(container.textContent).toContain(
      'Expédié le 2 oct. · Livraison PEG'
    );
    expect(container.querySelector('a')).toBeNull();
  });

  it('un lien non https venu du serveur n’est jamais rendu', async () => {
    getShipping.mockReturnValue(
      reply({
        shipping: { ...COLISSIMO, trackingUrl: 'javascript:alert(1)' },
        canEdit: false,
      })
    );
    await render();
    expect(container.querySelector('a')).toBeNull();
  });

  it('client, projet non expédié → rien', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: NOT_SHIPPED, canEdit: false })
    );
    await render();
    expect(container.innerHTML).toBe('');
  });
});

describe('Barre « Expédition » — admin / producteur attribué', () => {
  it('« Marquer comme expédié » → dialogue (date du jour) → POST avec le bon corps → toast bac à sable', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: NOT_SHIPPED, canEdit: true, carriers: CARRIERS })
    );
    markShipped.mockResolvedValue({
      data: {
        result: true,
        shipping: COLISSIMO,
        notified: { bell: 'sandbox', email: 'sandbox' },
      },
    });
    await render();
    click(button('Marquer comme expédié')!);

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Expédition');
    expect(dialog.textContent).toContain('Transporteur');
    expect(dialog.textContent).toContain("Date d'expédition");
    const date = dialog.querySelector('input[type="date"]') as HTMLInputElement;
    expect(date.value).toBe(parisToday());
    // Numéro demandé seulement pour un transporteur suivi.
    expect(dialog.textContent).not.toContain('Numéro de suivi (facultatif)');
    await setValue(
      dialog.querySelector('select') as HTMLSelectElement,
      'colissimo'
    );
    expect(dialog.textContent).toContain('Numéro de suivi (facultatif)');
    await setValue(
      dialog.querySelector('input[type="text"]') as HTMLInputElement,
      ' 6a 123 '
    );
    expect(button("Enregistrer l'expédition")).toBeDefined();
    expect(button('Annuler')).toBeDefined();

    await submitDialog();
    expect(markShipped).toHaveBeenCalledWith(project.documentId, {
      carrier: 'colissimo',
      trackingNumber: '6A123',
      shippedAt: parisToday(),
    });
    expect(toast.info).toHaveBeenCalledWith(
      "Expédition enregistrée (bac à sable : le client n'est pas prévenu)"
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).toContain('Expédié le 2 oct. · Colissimo');
    expect(button('Modifier')).toBeDefined();
    expect(button("Annuler l'expédition")).toBeDefined();
  });

  it('client prévenu → « Expédition enregistrée — le client est prévenu »', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: NOT_SHIPPED, canEdit: true, carriers: CARRIERS })
    );
    markShipped.mockResolvedValue({
      data: {
        result: true,
        shipping: {
          ...COLISSIMO,
          carrier: 'pickup',
          pickup: true,
          trackingUrl: null,
          summary: 'Prête à être retirée depuis le 2 oct.',
        },
        notified: { bell: 'sent', email: 'sent' },
      },
    });
    await render();
    click(button('Marquer comme expédié')!);
    await setValue(
      document.querySelector('[role="dialog"] select') as HTMLSelectElement,
      'pickup'
    );
    await submitDialog();
    expect(markShipped.mock.calls[0][1]).toEqual({
      carrier: 'pickup',
      trackingNumber: null,
      shippedAt: parisToday(),
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Expédition enregistrée — le client est prévenu'
    );
    expect(container.textContent).toContain(
      'Prête à être retirée depuis le 2 oct.'
    );
  });

  it('refus du serveur → toast d’erreur, message affiché, dialogue ouvert', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: NOT_SHIPPED, canEdit: true, carriers: CARRIERS })
    );
    markShipped.mockImplementation(() =>
      httpError(409, 'Projet annulé : expédition impossible')
    );
    await render();
    click(button('Marquer comme expédié')!);
    await setValue(
      document.querySelector('[role="dialog"] select') as HTMLSelectElement,
      'colissimo'
    );
    await submitDialog();
    expect(toast.error).toHaveBeenCalledWith(
      "Impossible d'enregistrer l'expédition"
    );
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Projet annulé : expédition impossible'
    );
  });

  it('numéro invalide → refusé avant l’envoi', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: NOT_SHIPPED, canEdit: true, carriers: CARRIERS })
    );
    await render();
    click(button('Marquer comme expédié')!);
    await setValue(
      document.querySelector('[role="dialog"] select') as HTMLSelectElement,
      'colissimo'
    );
    await setValue(
      document.querySelector(
        '[role="dialog"] input[type="text"]'
      ) as HTMLInputElement,
      '<script>'
    );
    await submitDialog();
    expect(markShipped).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Numéro de suivi invalide'
    );
  });

  it('« Modifier » ouvre le dialogue pré-rempli', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: COLISSIMO, canEdit: true, carriers: CARRIERS })
    );
    await render();
    click(button('Modifier')!);
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect((dialog.querySelector('select') as HTMLSelectElement).value).toBe(
      'colissimo'
    );
    expect(
      (dialog.querySelector('input[type="text"]') as HTMLInputElement).value
    ).toBe('6A123');
    expect(
      (dialog.querySelector('input[type="date"]') as HTMLInputElement).value
    ).toBe('2026-10-02');
    click(button('Annuler')!);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('« Annuler l’expédition » → confirmation → DELETE → « Expédition annulée »', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: COLISSIMO, canEdit: true, carriers: CARRIERS })
    );
    cancelShipping.mockResolvedValue({
      data: { result: true, shipping: NOT_SHIPPED },
    });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    await render();
    await act(async () => {
      button("Annuler l'expédition")!.click();
    });
    await flush();
    expect(confirm).toHaveBeenCalledWith(
      "Annuler l'expédition de « Casquettes Club » ? Le client ne sera pas prévenu."
    );
    expect(cancelShipping).toHaveBeenCalledWith(project.documentId);
    expect(toast.success).toHaveBeenCalledWith('Expédition annulée');
    expect(button('Marquer comme expédié')).toBeDefined();
    expect(container.textContent).not.toContain('Expédié le');
    confirm.mockRestore();
  });

  it('confirmation refusée → rien n’est envoyé', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: COLISSIMO, canEdit: true, carriers: CARRIERS })
    );
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    await render();
    click(button("Annuler l'expédition")!);
    expect(cancelShipping).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});

describe('Téléphone', () => {
  it('variant="mobile" : même contenu, mise en page du téléphone', async () => {
    getShipping.mockReturnValue(reply({ shipping: COLISSIMO, canEdit: false }));
    await render('mobile');
    const bar = container.querySelector(
      '[data-testid="project-shipping"]'
    ) as HTMLElement;
    expect(bar.className).toContain('is-mobile');
    expect(bar.textContent).toContain('Expédié le 2 oct. · Colissimo');
    expect(bar.textContent).toContain('Suivre le colis');
  });

  const header = (compact: boolean) => (
    <ProjectHeaderMobile
      name="Casquettes Club"
      image={null}
      status={{ label: 'En production', color: '#6b9eff', bg: '', border: '' }}
      progress={{ percent: 40, label: 'Tâches' }}
      people={null}
      onBack={() => undefined}
      compact={compact}
      shipping={<ProjectShippingBar project={project} variant="mobile" />}
    />
  );

  it('carte héros de l’en-tête téléphone : la barre y est rendue', async () => {
    getShipping.mockReturnValue(reply({ shipping: COLISSIMO, canEdit: false }));
    await act(async () => {
      root.render(header(false));
    });
    await flush();
    expect(
      container.querySelector('.peg-pd-hero [data-testid="project-shipping"]')
    ).not.toBeNull();
  });

  it('bande réduite (autres onglets) : inchangée, pas de barre', async () => {
    getShipping.mockReturnValue(reply({ shipping: COLISSIMO, canEdit: false }));
    await act(async () => {
      root.render(header(true));
    });
    await flush();
    expect(
      container.querySelector('[data-testid="project-shipping"]')
    ).toBeNull();
    expect(getShipping).not.toHaveBeenCalled();
  });
});

describe('Constats de relecture (non-régression)', () => {
  const deferred = <T,>() => {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  };

  it('bornes de la date = jours de Paris, de J−90 à demain (comme le serveur)', () => {
    // 4 oct., 00 h 30 à Paris : « demain » = 5 oct. même si l'UTC est encore le 3.
    const b = shippingDateBounds(new Date('2026-10-03T22:30:00.000Z'));
    expect(b).toEqual({
      today: '2026-10-04',
      max: '2026-10-05',
      min: '2026-07-06',
      initial: '2026-10-04',
    });
  });

  it('« Modifier » une expédition de plus de 90 jours : sa date reste sélectionnable', () => {
    const b = shippingDateBounds(
      new Date('2026-10-03T14:00:00.000Z'),
      '2026-06-10T09:15:00.000Z'
    );
    expect(b.initial).toBe('2026-06-10');
    expect(b.min).toBe('2026-06-10');
    expect(b.max).toBe('2026-10-04');
  });

  it('dialogue « Modifier » : la date d’origine ne sort jamais des bornes du champ', async () => {
    getShipping.mockReturnValue(
      reply({
        shipping: { ...COLISSIMO, shippedAt: '2020-01-15T10:00:00.000Z' },
        canEdit: true,
        carriers: CARRIERS,
      })
    );
    await render();
    click(button('Modifier')!);
    const date = document.querySelector(
      '[role="dialog"] input[type="date"]'
    ) as HTMLInputElement;
    expect(date.value).toBe('2020-01-15');
    expect(date.min <= date.value && date.value <= date.max).toBe(true);
  });

  it('cloche et e-mail en échec → toast d’avertissement', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: NOT_SHIPPED, canEdit: true, carriers: CARRIERS })
    );
    markShipped.mockResolvedValue({
      data: {
        result: true,
        shipping: COLISSIMO,
        notified: { bell: 'failed', email: 'failed' },
      },
    });
    await render();
    click(button('Marquer comme expédié')!);
    await setValue(
      document.querySelector('[role="dialog"] select') as HTMLSelectElement,
      'colissimo'
    );
    await submitDialog();
    expect(toast.warning).toHaveBeenCalledWith(
      "Expédition enregistrée, mais le client n'a pas pu être prévenu"
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('« Prévenir à nouveau le client » : seulement en modification, envoie notify: true', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: NOT_SHIPPED, canEdit: true, carriers: CARRIERS })
    );
    await render();
    click(button('Marquer comme expédié')!);
    expect(document.body.textContent).not.toContain(
      'Prévenir à nouveau le client'
    );
    click(button('Annuler')!);
    act(() => root.unmount());

    resetProjectShippingCache();
    getShipping.mockReturnValue(
      reply({ shipping: COLISSIMO, canEdit: true, carriers: CARRIERS })
    );
    markShipped.mockResolvedValue({
      data: {
        result: true,
        shipping: COLISSIMO,
        notified: { bell: 'sent', email: 'sent' },
      },
    });
    root = createRoot(container);
    await render();
    click(button('Modifier')!);
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Prévenir à nouveau le client');
    // Non cochée → corps inchangé (pas de clé notify).
    await submitDialog();
    expect(markShipped.mock.calls[0][1]).toEqual({
      carrier: 'colissimo',
      trackingNumber: '6A123',
      shippedAt: '2026-10-02',
    });
    click(button('Modifier')!);
    const box = document.querySelector(
      '[role="dialog"] input[type="checkbox"]'
    ) as HTMLInputElement;
    await act(async () => {
      box.click();
    });
    await submitDialog();
    expect(markShipped.mock.calls[1][1]).toEqual({
      carrier: 'colissimo',
      trackingNumber: '6A123',
      shippedAt: '2026-10-02',
      notify: true,
    });
    expect(toast.success).toHaveBeenLastCalledWith(
      'Expédition enregistrée — le client est prévenu'
    );
  });

  it('une lecture partie avant « Annuler l’expédition » ne rétablit pas l’ancien état', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: COLISSIMO, canEdit: true, carriers: CARRIERS })
    );
    await render();
    act(() => root.unmount());

    // Retour sur l'onglet (téléphone) : affichage depuis le cache, relecture en vol.
    const late = deferred<{ data: GetProjectShippingResponse }>();
    getShipping.mockReturnValue(late.promise);
    cancelShipping.mockResolvedValue({
      data: { result: true, shipping: NOT_SHIPPED },
    });
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    root = createRoot(container);
    await act(async () => {
      root.render(<ProjectShippingBar project={project} />);
    });
    await act(async () => {
      button("Annuler l'expédition")!.click();
    });
    await flush();
    expect(button('Marquer comme expédié')).toBeDefined();

    // La relecture (partie avant l'annulation) répond en dernier.
    await act(async () => {
      late.resolve({
        data: {
          result: true,
          shipping: COLISSIMO,
          canEdit: true,
          carriers: CARRIERS,
        },
      });
    });
    await flush();
    expect(container.textContent).not.toContain('Expédié le');
    expect(button('Marquer comme expédié')).toBeDefined();
    confirm.mockRestore();
  });

  it('la réponse gardée en mémoire est propre au compte connecté', async () => {
    getShipping.mockReturnValue(
      reply({ shipping: COLISSIMO, canEdit: true, carriers: CARRIERS })
    );
    await act(async () => {
      root.render(<ProjectShippingBar project={project} userKey="admin0001" />);
    });
    await flush();
    expect(button('Modifier')).toBeDefined();
    act(() => root.unmount());

    // Déconnexion sans rechargement, puis un client ouvre le même projet :
    // tant que sa lecture n'a pas répondu, aucun bouton de l'admin.
    const pending = deferred<{ data: GetProjectShippingResponse }>();
    getShipping.mockReturnValue(pending.promise);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <ProjectShippingBar project={project} userKey="client0002" />
      );
    });
    expect(button('Modifier')).toBeUndefined();
    expect(button("Annuler l'expédition")).toBeUndefined();
    await act(async () => {
      pending.resolve({
        data: { result: true, shipping: COLISSIMO, canEdit: false },
      });
    });
    await flush();
    expect(container.textContent).toContain('Expédié le 2 oct. · Colissimo');
    expect(button('Modifier')).toBeUndefined();
  });
});
