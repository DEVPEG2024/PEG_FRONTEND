import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { MpPriceChange } from '@/@types/masterPrintPrices';
import {
  apiApplyMasterPrintPriceChange,
  apiGetMasterPrintProductPrices,
  apiIgnoreMasterPrintPriceChange,
} from '@/services/MasterPrintPricesServices';
import { masterPrintError } from '@/utils/masterPrint';
import { hubPath } from '@/utils/masterPrintHub';
import {
  canApply,
  costLine,
  priceLine,
  reasonText,
  reviewTitle,
} from '@/utils/masterPrintPrices';
import { Btn } from '@/views/app/common/projects/details/components/masterPrint/ui';

/*
 * Fiche produit admin : avertissement quand le prix d'achat Master Print de ce
 * produit a changé et que PEG n'a rien écrasé (paliers retouchés à la main,
 * import d'avant le suivi, produit retiré). Rien d'affiché sinon.
 * Appliquer recharge la fiche : le formulaire ouvert garderait sinon les
 * anciens paliers et les réécrirait à l'enregistrement.
 */
const PriceReviewNotice = ({
  productDocumentId,
}: {
  productDocumentId: string;
}) => {
  const [pending, setPending] = useState<MpPriceChange | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGetMasterPrintProductPrices(productDocumentId)
      .then((r) => alive && setPending(r.data.pending))
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [productDocumentId]);

  if (!pending) return null;

  const apply = async () => {
    if (
      !window.confirm(
        'Appliquer les nouveaux prix ? La fiche sera rechargée : les modifications non enregistrées seront perdues.'
      )
    )
      return;
    setBusy(true);
    try {
      await apiApplyMasterPrintPriceChange(pending.id);
      toast.success('Nouveaux prix appliqués.');
      window.location.reload();
    } catch (e) {
      toast.error(masterPrintError(e, 'Action impossible.'));
      setBusy(false);
    }
  };

  const ignore = async () => {
    setBusy(true);
    try {
      await apiIgnoreMasterPrintPriceChange(pending.id);
      toast.info(
        'Changement ignoré : les prix de la fiche restent tels quels.'
      );
      setPending(null);
    } catch (e) {
      toast.error(masterPrintError(e, 'Action impossible.'));
    } finally {
      setBusy(false);
    }
  };

  const cost = costLine(pending);
  return (
    <div
      role="alert"
      style={{
        marginBottom: '14px',
        padding: '12px 16px',
        borderRadius: '14px',
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.35)',
        color: 'rgba(255,240,210,0.92)',
        fontSize: '13px',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: '#fcd34d' }}>{reviewTitle(pending)}</strong>
      <div style={{ marginTop: '4px' }}>{priceLine(pending)}</div>
      {cost && <div>{cost}</div>}
      <div style={{ color: 'rgba(255,240,210,0.7)' }}>
        {reasonText(pending)}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          marginTop: '8px',
        }}
      >
        {canApply(pending) && (
          <Btn variant="primary" onClick={apply} disabled={busy}>
            Appliquer les nouveaux prix
          </Btn>
        )}
        <Btn onClick={ignore} disabled={busy}>
          Ignorer
        </Btn>
        <Link
          to={hubPath('prix')}
          style={{
            color: '#b9b0ff',
            fontWeight: 700,
            textDecoration: 'underline',
          }}
        >
          Tous les changements de prix
        </Link>
      </div>
    </div>
  );
};

export default PriceReviewNotice;
