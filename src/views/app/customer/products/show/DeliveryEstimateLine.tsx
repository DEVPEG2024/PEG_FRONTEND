import { useEffect, useState, type CSSProperties } from 'react';
import { HiTruck } from 'react-icons/hi';
import { apiGetDeliveryEstimate } from '@/services/DeliveryEstimateServices';
import {
  type DeliveryEstimate,
  deliveryLine,
  isStale,
  refreshDelayMs,
} from '@/utils/deliveryEstimate';
import { C } from './configurator/ui';

/*
 * Ligne discrète de la fiche produit client : « Commandez avant 10 h : expédition
 * prévue le mardi 24 novembre ». Pour les produits fabriqués par l'imprimeur
 * partenaire (avec ou sans formulaire) ; rien pour les autres (404).
 * Dans le formulaire, la date rendue avec le prix (`formShipDate`) prime.
 * Une seule lecture par produit, partagée (téléphone et ordinateur), relue
 * quand l'heure limite passe.
 */

const KEEP_MS = 10 * 60 * 1000;
const RETRY_MS = 60 * 1000;

type Entry = {
  until: number;
  data: DeliveryEstimate | null;
  pending?: Promise<DeliveryEstimate | null>;
};
const cache = new Map<string, Entry>();

function loadEstimate(
  id: string,
  force: boolean
): Promise<DeliveryEstimate | null> {
  const hit = cache.get(id);
  if (hit?.pending) return hit.pending;
  if (hit && !force && Date.now() < hit.until && !isStale(hit.data))
    return Promise.resolve(hit.data);
  const pending = apiGetDeliveryEstimate(id)
    .then((r) => {
      cache.set(id, { until: Date.now() + KEEP_MS, data: r.data ?? null });
      return r.data ?? null;
    })
    .catch((e: { response?: { status?: number } }) => {
      // 404 = produit non concerné (gardé) ; autre échec : nouvel essai dans une minute.
      const keep = e?.response?.status === 404 ? KEEP_MS : RETRY_MS;
      cache.set(id, { until: Date.now() + keep, data: null });
      return null;
    });
  cache.set(id, { until: 0, data: hit?.data ?? null, pending });
  return pending;
}

export function useDeliveryEstimate(
  productDocumentId: string | undefined
): DeliveryEstimate | null {
  const [est, setEst] = useState<DeliveryEstimate | null>(
    () => (productDocumentId && cache.get(productDocumentId)?.data) || null
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!productDocumentId) return;
    let alive = true;
    loadEstimate(productDocumentId, tick > 0).then((d) => {
      if (alive) setEst(d);
    });
    return () => {
      alive = false;
    };
  }, [productDocumentId, tick]);

  // Heure limite atteinte pendant la visite : la date change, on relit.
  useEffect(() => {
    const ms = refreshDelayMs(est);
    if (ms === null) return;
    const t = setTimeout(() => setTick((n) => n + 1), ms);
    return () => clearTimeout(t);
  }, [est]);

  return est;
}

type Props = {
  productDocumentId: string;
  /** Date d'expédition rendue avec le prix du formulaire (prime sur l'estimation). */
  formShipDate?: string | null;
  /** Délai rendu avec le prix, quand il n'y a pas de date. */
  formWorkingDays?: number | null;
  style?: CSSProperties;
};

const DeliveryEstimateLine = ({
  productDocumentId,
  formShipDate = null,
  formWorkingDays = null,
  style,
}: Props) => {
  const est = useDeliveryEstimate(productDocumentId);
  const days = formWorkingDays ?? 0;
  const text =
    deliveryLine(est, { formShipDate }) ||
    (days > 0
      ? `Fabrication en ${days} jour${days > 1 ? 's' : ''} ouvré${days > 1 ? 's' : ''}`
      : null);
  if (!text) return null;
  return (
    <p
      data-testid="delivery-estimate"
      style={{
        margin: '10px 0 0',
        fontSize: '12.5px',
        lineHeight: 1.4,
        color: C.text,
        display: 'flex',
        gap: '6px',
        alignItems: 'flex-start',
        ...style,
      }}
    >
      <HiTruck
        aria-hidden="true"
        style={{ color: C.accentText, flexShrink: 0, marginTop: '2px' }}
      />
      <span>{text}</span>
    </p>
  );
};

export default DeliveryEstimateLine;
