/*
 * Catalogue Master Print — panneau « Prix d'achat » (ajout 21/11/2026).
 *
 * Quand Master Print change ses prix, PEG recalcule les paliers des produits
 * importés avec la même majoration : tout seul si les paliers sont encore ceux
 * de PEG, « à revoir » si un admin les a retouchés (rien n'est écrasé). Ici :
 * la dernière vérification, le bouton « Vérifier les prix maintenant » et les
 * changements récents, avec « Appliquer les nouveaux prix » / « Ignorer ».
 * Backend : peg_strapi `master-print-prices.service.ts`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import type {
  MpPriceChange,
  MpPricesOverview,
} from '@/@types/masterPrintPrices';
import {
  apiApplyMasterPrintPriceChange,
  apiCheckMasterPrintPrices,
  apiGetMasterPrintPrices,
  apiIgnoreMasterPrintPriceChange,
} from '@/services/MasterPrintPricesServices';
import { fmtEur, masterPrintError } from '@/utils/masterPrint';
import {
  PRICE_STATUS_LABELS,
  canApply,
  canDecide,
  compareTiers,
  costLine,
  fmtDateTime,
  priceLine,
  priceStatusTone,
  reasonText,
  runLine,
  splitChanges,
  variationColor,
} from '@/utils/masterPrintPrices';
import {
  Btn,
  Pill,
  card,
  muted,
} from '@/views/app/common/projects/details/components/masterPrint/ui';

const POLL_MS = 4000;

/** Détail d'un changement : paliers avant / après. */
const TierTable = ({ c }: { c: MpPriceChange }) => (
  <div style={{ overflowX: 'auto', marginTop: '8px' }}>
    <table
      style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}
    >
      <thead>
        <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>
          <th style={{ padding: '5px 8px', fontWeight: 600 }}>Dès</th>
          <th style={{ padding: '5px 8px', fontWeight: 600 }}>Avant</th>
          <th style={{ padding: '5px 8px', fontWeight: 600 }}>
            {c.status === 'applique' ? 'Après' : 'Proposé'}
          </th>
        </tr>
      </thead>
      <tbody>
        {compareTiers(c.oldTiers, c.newTiers).map((r) => (
          <tr
            key={r.minQuantity}
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <td style={{ padding: '5px 8px' }}>
              {r.minQuantity} pièce{r.minQuantity > 1 ? 's' : ''}
            </td>
            <td style={{ padding: '5px 8px' }}>{fmtEur(r.before)}</td>
            <td style={{ padding: '5px 8px', fontWeight: 700 }}>
              {fmtEur(r.after)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ChangeRow = ({
  c,
  busy,
  onApply,
  onIgnore,
}: {
  c: MpPriceChange;
  busy: boolean;
  onApply: () => void;
  onIgnore: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const cost = costLine(c);
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: '12px',
        background:
          c.status === 'a_revoir'
            ? 'rgba(245,158,11,0.06)'
            : 'rgba(255,255,255,0.03)',
        border: `1px solid ${c.status === 'a_revoir' ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)'}`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px 10px',
        }}
      >
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {c.productExists ? (
            <Link
              to={`/admin/products/edit/${c.productDocumentId}`}
              style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'underline',
              }}
            >
              {c.productName || c.productDocumentId}
            </Link>
          ) : (
            <strong style={{ fontSize: '13px' }}>
              {c.productName || c.productDocumentId} (supprimé)
            </strong>
          )}
          <span style={{ ...muted, fontSize: '11.5px' }}>
            {' '}
            · {c.mpProductId}
          </span>
        </span>
        <Pill tone={priceStatusTone(c.status)}>
          {PRICE_STATUS_LABELS[c.status] || c.status}
        </Pill>
      </div>
      <p
        style={{
          fontSize: '13px',
          margin: '6px 0 0',
          color: variationColor(c.variation),
          fontWeight: 600,
        }}
      >
        {priceLine(c)}
      </p>
      {cost && <p style={{ ...muted, margin: '2px 0 0' }}>{cost}</p>}
      <p style={{ ...muted, margin: '2px 0 0' }}>
        {reasonText(c)} {fmtDateTime(c.updatedAt || c.createdAt)}
      </p>
      {open && c.newTiers && <TierTable c={c} />}
      {(!!c.newTiers?.length || canDecide(c)) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '8px',
          }}
        >
          {canApply(c) && (
            <Btn variant="primary" onClick={onApply} disabled={busy}>
              Appliquer les nouveaux prix
            </Btn>
          )}
          {canDecide(c) && (
            <Btn onClick={onIgnore} disabled={busy}>
              Ignorer
            </Btn>
          )}
          {!!c.newTiers?.length && (
            <Btn onClick={() => setOpen((o) => !o)}>
              {open ? 'Masquer les paliers' : 'Voir les paliers'}
            </Btn>
          )}
        </div>
      )}
    </div>
  );
};

const PurchasePricesPanel = () => {
  const [data, setData] = useState<MpPricesOverview | null>(null);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState('');
  const [listOpen, setListOpen] = useState<boolean | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const watching = useRef(false);

  const load = useCallback(async () => {
    try {
      const { data: d } = await apiGetMasterPrintPrices();
      setData(d);
      setError('');
      // Fin d'une vérification lancée d'ici : bilan en une ligne.
      if (watching.current && !d.running) {
        watching.current = false;
        toast.info(runLine(d.last, d.pending));
      }
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      // Serveur pas encore à jour : le catalogue reste utilisable, sans ce panneau.
      if (status === 404 || status === 405) setHidden(true);
      else setError(masterPrintError(e, 'Prix d’achat indisponibles.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Vérification en cours : relecture régulière jusqu'à la fin.
  useEffect(() => {
    if (!data?.running) return;
    const t = window.setTimeout(load, POLL_MS);
    return () => window.clearTimeout(t);
  }, [data, load]);

  const check = async () => {
    setStarting(true);
    try {
      const { data: r } = await apiCheckMasterPrintPrices();
      watching.current = true;
      toast.info(
        r.queued
          ? 'Une vérification est déjà en cours : la vôtre suivra.'
          : 'Vérification lancée : comptez environ une seconde par produit.'
      );
      setData((d) => (d ? { ...d, running: true } : d));
      window.setTimeout(load, 1500);
    } catch (e) {
      toast.error(masterPrintError(e, 'Vérification impossible.'));
    } finally {
      setStarting(false);
    }
  };

  const decide = async (c: MpPriceChange, action: 'apply' | 'ignore') => {
    setBusyId(c.id);
    try {
      if (action === 'apply') {
        await apiApplyMasterPrintPriceChange(c.id);
        toast.success(`Nouveaux prix appliqués à « ${c.productName} ».`);
      } else {
        await apiIgnoreMasterPrintPriceChange(c.id);
        toast.info(
          'Changement ignoré : les prix de la fiche restent tels quels.'
        );
      }
      await load();
    } catch (e) {
      toast.error(masterPrintError(e, 'Action impossible.'));
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (hidden) return null;
  if (!data) {
    return error ? (
      <div style={{ ...card, padding: '14px 16px' }}>
        <p style={{ ...muted, color: '#fca5a5' }}>{error}</p>
      </div>
    ) : null;
  }
  if (!data.configured) return null;

  const {
    pending,
    history,
    hidden: more,
  } = splitChanges(data.changes, showAll);
  const total = data.changes.length;
  const open = listOpen ?? data.pending > 0;

  return (
    <section style={{ ...card, padding: '14px 16px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 700,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            Prix d’achat
            {data.pending > 0 && (
              <Pill tone={priceStatusTone('a_revoir')}>
                {data.pending} à revoir
              </Pill>
            )}
          </h2>
          <p style={{ ...muted, marginTop: '4px' }}>
            {data.running
              ? 'Vérification en cours… les prix d’achat sont relus produit par produit.'
              : runLine(data.last, data.pending)}
          </p>
          <p style={{ ...muted, marginTop: '2px' }}>
            {data.linked
              ? `${data.tracked} produit${data.tracked > 1 ? 's' : ''} sur ${data.linked} suivi${data.linked > 1 ? 's' : ''} : quand Master Print change ses prix, les paliers se mettent à jour seuls (même majoration), sauf si vous les avez retouchés.`
              : 'Aucun produit relié à Master Print pour l’instant.'}
          </p>
        </div>
        <Btn
          variant="primary"
          onClick={check}
          disabled={starting || data.running || !data.linked}
        >
          {data.running ? 'Vérification…' : 'Vérifier les prix maintenant'}
        </Btn>
      </div>

      {total > 0 && (
        <div style={{ marginTop: '10px' }}>
          <Btn onClick={() => setListOpen(!open)}>
            {open
              ? 'Masquer les changements'
              : `Voir les changements récents (${total})`}
          </Btn>
        </div>
      )}

      {open && total > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '10px',
          }}
        >
          {[...pending, ...history].map((c) => (
            <ChangeRow
              key={c.id}
              c={c}
              busy={busyId === c.id}
              onApply={() => decide(c, 'apply')}
              onIgnore={() => decide(c, 'ignore')}
            />
          ))}
          {more > 0 && (
            <div>
              <Btn onClick={() => setShowAll(true)}>
                Afficher l’historique ({more} de plus)
              </Btn>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default PurchasePricesPanel;
