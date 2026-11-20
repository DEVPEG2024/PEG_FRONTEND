/*
 * Stock Master Print d'un textile, dans la fiche du Catalogue Master Print
 * (admin) — ajout 20/11/2026. Par taille du coloris choisi : stock immédiat,
 * stock fabricant (environ une semaine de plus), épuisée ou non suivie ; et les
 * coloris entièrement épuisés. Le formulaire client désactive les tailles
 * épuisées et refuse une quantité au-delà (backend : master-print-stock.service.ts).
 */
import { useEffect, useState } from 'react';
import type { MpCatalogStock } from '@/@types/offerStock';
import { apiGetMasterPrintCatalogStock } from '@/services/OfferStockServices';
import { isMasterPrintMissing, masterPrintError } from '@/utils/masterPrint';
import {
  Pill,
  muted,
  sectionTitle,
} from '@/views/app/common/projects/details/components/masterPrint/ui';

const TONES = {
  ok: {
    color: 'rgba(255,255,255,0.8)',
    background: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.12)',
  },
  low: {
    color: '#fcd34d',
    background: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.35)',
  },
  out: {
    color: 'rgba(248,113,113,0.9)',
    background: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.3)',
  },
};

const LOW = 20;

const fmt = (n: number) => n.toLocaleString('fr-FR');

const updatedLabel = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const CatalogStock = ({
  productId,
  color,
}: {
  productId: string;
  color: string;
}) => {
  const [stock, setStock] = useState<MpCatalogStock | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setStock(null);
    setError(null);
    apiGetMasterPrintCatalogStock(productId)
      .then(({ data }) => alive && setStock(data))
      .catch((e) => {
        // Serveur pas encore à jour (route absente) : la fiche reste comme avant.
        if (alive && !isMasterPrintMissing(e))
          setError(masterPrintError(e, 'Stock indisponible.'));
      });
    return () => {
      alive = false;
    };
  }, [productId]);

  if (error)
    return (
      <section>
        <h3 style={sectionTitle}>Stock Master Print</h3>
        <p style={muted}>{error}</p>
      </section>
    );
  if (!stock || !stock.tracked) return null;

  const current = stock.colors.find((c) => c.code === color);
  const soldOut = stock.colors.filter((c) => c.soldOut);
  const when = updatedLabel(stock.updatedAt);

  return (
    <section>
      <h3 style={sectionTitle}>
        Stock Master Print
        {current ? ` (coloris ${current.label})` : ''}
      </h3>
      {current ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {current.sizes.map((s) => {
            const tone =
              s.orderable === 0
                ? TONES.out
                : s.orderable !== null && s.orderable <= LOW
                  ? TONES.low
                  : TONES.ok;
            return (
              <Pill key={s.size} tone={tone}>
                {s.size} :{' '}
                {s.orderable === 0
                  ? 'épuisée'
                  : s.orderable === null
                    ? 'non suivi'
                    : fmt(s.stock)}
                {s.supplierStock > 0 && ` + ${fmt(s.supplierStock)} fabricant`}
              </Pill>
            );
          })}
        </div>
      ) : (
        <p style={muted}>Choisissez un coloris pour voir son stock.</p>
      )}
      <p style={{ ...muted, marginTop: '8px' }}>
        {current && current.total !== null
          ? `${fmt(current.total)} pièces commandables dans ce coloris. `
          : ''}
        {soldOut.length
          ? `Coloris épuisés : ${soldOut.map((c) => c.label).join(', ')}. `
          : ''}
        Stock « fabricant » : environ une semaine de plus.
        {when ? ` Relevé par Master Print le ${when}.` : ''}
      </p>
    </section>
  );
};

export default CatalogStock;
