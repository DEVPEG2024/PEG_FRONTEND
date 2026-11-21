import { useEffect, useState } from 'react';
import type { OfferStock } from '@/@types/offerStock';
import { apiGetConfiguratorStock } from '@/services/OfferStockServices';

/** Relecture pendant que le formulaire reste ouvert (le serveur garde le stock 15 min). */
const REFRESH_MS = 10 * 60 * 1000;

/**
 * Stock du textile d'une offre configurable (quantité commandable par coloris ×
 * taille). null = inconnu : le formulaire se comporte comme sans stock. Une
 * relecture en échec garde le dernier stock connu ; le serveur contrôle de toute
 * façon chaque prix et chaque ligne de commande.
 */
export default function useOfferStock(
  productDocumentId: string,
  enabled: boolean
): OfferStock | null {
  const [stock, setStock] = useState<OfferStock | null>(null);

  useEffect(() => {
    if (!enabled || !productDocumentId) return;
    let alive = true;
    const load = async () => {
      try {
        const { data } = await apiGetConfiguratorStock(productDocumentId);
        if (alive) setStock(data?.tracked ? data : null);
      } catch {
        // stock momentanément illisible : on garde le dernier connu
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [productDocumentId, enabled]);

  return stock;
}
