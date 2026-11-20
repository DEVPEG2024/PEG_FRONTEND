import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MpOfferAdmin } from '@/@types/masterPrint';
import { apiGetMasterPrintOffer } from '@/services/ConfiguratorServices';

/*
 * Fiche produit admin : rappel qu'un produit est relié à Master Print, et accès
 * à son formulaire client (offre configurable). Rien d'affiché sinon.
 */
const OfferLinkBanner = ({
  productDocumentId,
}: {
  productDocumentId: string;
}) => {
  const [data, setData] = useState<MpOfferAdmin | null>(null);
  useEffect(() => {
    let alive = true;
    apiGetMasterPrintOffer(productDocumentId)
      .then((r) => alive && setData(r.data))
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [productDocumentId]);
  if (!data?.linked) return null;
  return (
    <div
      role="note"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '10px',
        justifyContent: 'space-between',
        marginBottom: '14px',
        padding: '12px 16px',
        borderRadius: '14px',
        background: 'rgba(47,111,237,0.1)',
        border: '1px solid rgba(47,111,237,0.3)',
        color: 'rgba(220,232,255,0.9)',
        fontSize: '13px',
      }}
    >
      <span>
        <strong style={{ color: '#fff' }}>Produit Master Print</strong>
        {data.mpProduct ? ` (${data.mpProduct.name})` : ''} — formulaire client{' '}
        {data.enabled
          ? 'actif : le client compose sa commande et elle part chez Master Print au paiement.'
          : 'inactif : le client commande avec la fiche habituelle.'}
      </span>
      <Link
        to={`/admin/master-print/offers/${productDocumentId}`}
        style={{
          color: '#8db4ff',
          fontWeight: 700,
          textDecoration: 'underline',
        }}
      >
        Régler le formulaire client
      </Link>
    </div>
  );
};

export default OfferLinkBanner;
