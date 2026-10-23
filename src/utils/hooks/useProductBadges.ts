import { useEffect, useState } from 'react';
import {
  cachedProductBadges,
  loadProductBadges,
  subscribeProductBadges,
} from '@/services/ProductBadgeServices';
import type { ProductBadge } from '@/utils/productBadges';

/**
 * Badges enregistrés d'un produit. Les cartes d'une même page sont servies par une
 * seule requête (regroupement du service) ; un enregistrement admin les relit.
 * Sans documentId, ou si le serveur ne connaît pas encore le champ : [].
 */
export default function useProductBadges(documentId?: string | null): ProductBadge[] {
  const [badges, setBadges] = useState<ProductBadge[]>(() =>
    documentId ? cachedProductBadges(documentId) ?? [] : []
  );
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeProductBadges(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    if (!documentId) {
      setBadges([]);
      return;
    }
    let alive = true;
    loadProductBadges(documentId).then((b) => {
      if (alive) setBadges(b);
    });
    return () => {
      alive = false;
    };
  }, [documentId, version]);

  return badges;
}
