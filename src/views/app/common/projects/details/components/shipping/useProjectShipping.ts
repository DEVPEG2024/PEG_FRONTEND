import { useCallback, useEffect, useState } from 'react';
import {
  apiCancelProjectShipping,
  apiGetProjectShipping,
  apiMarkProjectShipped,
} from '@/services/ShippingServices';
import type {
  GetProjectShippingResponse,
  MarkProjectShippedRequest,
  MarkProjectShippedResponse,
  ProjectShipping,
  ShippingCarrierOption,
} from '@/@types/shipping';

/**
 * Expédition du projet affiché (barre de l'en-tête, ordinateur et téléphone).
 *
 * Toute réponse autre que 200 (route absente tant que Strapi n'est pas déployé,
 * 403 autre producteur, 404 projet d'autrui, réseau) → `available: false` : la
 * barre ne s'affiche pas, jamais d'erreur visible.
 * La dernière réponse est gardée par compte ET par projet : sur téléphone, la
 * barre quitte l'en-tête réduit et y revient à chaque changement d'onglet — sans
 * cache, elle clignoterait le temps de la relecture. Par compte : la déconnexion
 * ne recharge pas la page, un autre compte ne doit pas voir (même un instant)
 * les droits et boutons du précédent.
 *
 * Une lecture partie AVANT un enregistrement / une annulation n'écrase jamais
 * l'état posé par ce dernier (numéro de version par clé).
 */
type ShippingState = {
  shipping: ProjectShipping;
  canEdit: boolean;
  carriers: ShippingCarrierOption[];
};

const lastKnown = new Map<string, ShippingState | null>();
/** Incrémenté à chaque écriture locale (POST / DELETE) : périme les lectures en vol. */
const versions = new Map<string, number>();

const cacheKey = (userKey: string | null | undefined, documentId: string) =>
  `${userKey || 'anon'}:${documentId}`;

const fromResponse = (
  data: GetProjectShippingResponse | undefined
): ShippingState | null =>
  data?.result && data.shipping
    ? {
        shipping: data.shipping,
        canEdit: !!data.canEdit,
        carriers: Array.isArray(data.carriers) ? data.carriers : [],
      }
    : null;

export function useProjectShipping(
  documentId?: string | null,
  userKey?: string | null
) {
  const key = documentId ? cacheKey(userKey, documentId) : null;
  const [state, setState] = useState<ShippingState | null>(() =>
    key ? (lastKnown.get(key) ?? null) : null
  );

  useEffect(() => {
    if (!documentId || !key) return;
    let alive = true;
    setState(lastKnown.get(key) ?? null);
    const startedAt = versions.get(key) ?? 0;
    apiGetProjectShipping(documentId)
      .then(({ data }) => fromResponse(data))
      .catch(() => null)
      .then((next) => {
        // Enregistré ou annulé entre-temps : cette lecture est périmée.
        if ((versions.get(key) ?? 0) !== startedAt) return;
        lastKnown.set(key, next);
        if (alive) setState(next);
      });
    return () => {
      alive = false;
    };
  }, [documentId, key]);

  const apply = useCallback(
    (shipping: ProjectShipping) => {
      if (!key) return;
      versions.set(key, (versions.get(key) ?? 0) + 1);
      setState((prev) => {
        const next = prev ? { ...prev, shipping } : prev;
        lastKnown.set(key, next);
        return next;
      });
    },
    [key]
  );

  /** Enregistre l'expédition ; l'erreur (400, 403, 409…) remonte à l'appelant. */
  const save = useCallback(
    async (
      req: MarkProjectShippedRequest
    ): Promise<MarkProjectShippedResponse> => {
      const { data } = await apiMarkProjectShipped(documentId as string, req);
      apply(data.shipping);
      return data;
    },
    [documentId, apply]
  );

  const cancel = useCallback(async (): Promise<void> => {
    const { data } = await apiCancelProjectShipping(documentId as string);
    apply(data.shipping);
  }, [documentId, apply]);

  return {
    available: !!state,
    shipping: state?.shipping ?? null,
    canEdit: !!state?.canEdit,
    carriers: state?.carriers ?? [],
    save,
    cancel,
  };
}

/** Pour les tests : oublie les réponses gardées. */
export const resetProjectShippingCache = () => {
  lastKnown.clear();
  versions.clear();
};
