import { Link } from 'react-router-dom';
import { MdCheck, MdClose, MdOpenInNew, MdOutlinePriceCheck, MdRefresh, MdUndo } from 'react-icons/md';
import type { AgentReview } from '@/services/AgentServices';
import AgentShell, { type CardApi } from './agents/AgentShell';
import { Card, Problems, STATUS_LABEL, SeverityBadge, btn, eur, fmtDate, labelStyle, mutedText } from './agents/agentUi';

/**
 * Tarifs — agent qui audite les prix de chaque produit actif avec les formules
 * exactes du paiement (paliers, packs, m², remise Premium, marges). Aucune IA.
 */

const MODE: Record<string, string> = { tiers: 'Prix dégressifs', packs: 'Packs', m2: 'Prix au m²' };

type Snapshot = { price: number | null; priceTiers: { minQuantity: number; price: number }[]; pricingMode: string | null };

const PriceTable = ({ title, snap, compare, accent }: { title: string; snap: Snapshot; compare?: Snapshot; accent?: string }) => {
  const mode = snap.pricingMode || 'tiers';
  const changed = (i: number) => {
    if (!compare) return false;
    const a = snap.priceTiers[i]; const b = compare.priceTiers[i];
    return !b || a.minQuantity !== b.minQuantity || a.price !== b.price;
  };
  return (
    <div style={{ flex: '1 1 240px', minWidth: 0, background: 'rgba(0,0,0,0.2)', border: `1px solid ${accent || 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', padding: '10px 12px' }}>
      <div style={{ ...labelStyle, marginBottom: '6px' }}>{title}</div>
      <div style={{ ...mutedText, marginBottom: '6px', color: compare && compare.pricingMode !== snap.pricingMode ? '#86efac' : undefined }}>
        {MODE[mode] || mode}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <tbody>
          {snap.priceTiers.map((t, i) => (
            <tr key={`${t.minQuantity}-${i}`} style={{ color: changed(i) ? '#86efac' : 'rgba(230,238,250,0.9)' }}>
              <td style={{ padding: '2px 0' }}>{mode === 'packs' ? `Pack de ${t.minQuantity}` : mode === 'm2' ? `${t.minQuantity}+ m²` : `${t.minQuantity}+ pièces`}</td>
              <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600 }}>{eur(t.price)} HT</td>
            </tr>
          ))}
        </tbody>
      </table>
      {snap.price !== null && <div style={{ ...mutedText, marginTop: '6px' }}>Prix de base (suggestions du panier) : {eur(snap.price)}</div>}
    </div>
  );
};

const PriceCard = ({ review, api }: { review: AgentReview; api: CardApi }) => {
  const d = review.details || {};
  const st = STATUS_LABEL[review.status];
  const problems = d.problemes || [];
  const serious = problems.filter((p: any) => p.severity !== 'info');
  const remarks = problems.filter((p: any) => p.severity === 'info');

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {review.kind === 'alerte' && review.status === 'flagged' && <SeverityBadge severity={review.severity} />}
        {review.kind === 'correction' && <SeverityBadge severity="warning" label="Correction proposée" />}
        {review.kind === 'rangement' && <SeverityBadge severity="info" label="Rangement" />}
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{review.label}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: st.color }}>{st.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
          {fmtDate(review.createdAt)} · {review.source}{review.decidedBy && review.decidedBy !== 'agent' ? ` · ${review.decidedBy}` : ''}
        </span>
      </div>

      {review.kind === 'rangement' && (
        <ul style={{ margin: 0, paddingLeft: '18px', color: 'rgba(230,238,250,0.85)', fontSize: '13px' }}>
          {(d.changements || []).map((c: string) => <li key={c}>{c}</li>)}
        </ul>
      )}

      {review.kind === 'correction' && (
        <>
          <div style={{ color: 'rgba(230,238,250,0.9)', fontSize: '13px' }}>Proposition : {(d.pourquoi || []).join(', ')}.</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <PriceTable title="Avant" snap={review.before} />
            <PriceTable title="Après" snap={review.after} compare={review.before} accent="rgba(96,165,250,0.35)" />
          </div>
          <Problems items={serious} />
        </>
      )}

      {review.kind === 'alerte' && (
        <>
          {/* Enveloppe : dans la colonne de la carte, la base flex de 240px deviendrait une hauteur. */}
          {review.before && <div style={{ display: 'flex' }}><PriceTable title="Prix actuels" snap={review.before} /></div>}
          <Problems items={serious} />
          {!!remarks.length && (
            <details>
              <summary style={{ ...mutedText, cursor: 'pointer' }}>{remarks.length} remarque(s)</summary>
              <div style={{ marginTop: '6px' }}><Problems items={remarks} /></div>
            </details>
          )}
          {review.status === 'checked' && !serious.length && <div style={{ color: '#4ade80', fontSize: '13px' }}>Prix cohérents{d.cout ? ` (coût ${eur(d.cout)})` : ''}.</div>}
        </>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {review.status === 'proposed' && (
          <>
            <button type="button" style={btn('#2563eb', true)} disabled={api.busy} onClick={() => api.accept({}, 'Prix mis à jour')}><MdCheck size={15} /> Appliquer</button>
            <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={api.busy} onClick={() => api.reject('Proposition refusée')}><MdClose size={15} /> Refuser</button>
          </>
        )}
        {review.status === 'flagged' && (
          <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={api.busy} onClick={() => api.reject('Alerte classée')}><MdCheck size={15} /> Classer (réglé ou voulu)</button>
        )}
        {(review.status === 'applied' || review.status === 'accepted') && (
          <button type="button" style={btn('#fbbf24')} disabled={api.busy} onClick={() => api.revert('Anciens prix rétablis')}><MdUndo size={15} /> Annuler et remettre les anciens prix</button>
        )}
        <button type="button" style={btn('rgba(255,255,255,0.6)')} disabled={api.busy} onClick={() => api.rerun()}><MdRefresh size={15} /> Réexaminer</button>
        <Link to={`/admin/products/edit/${review.targetId}`} style={btn('rgba(255,255,255,0.6)')}><MdOpenInNew size={14} /> Ouvrir la fiche</Link>
      </div>
    </Card>
  );
};

const IATarifsPage = () => (
  <AgentShell
    agent="tarifs"
    icon={<MdOutlinePriceCheck size={22} />}
    title="Tarifs"
    subtitle="Chaque produit actif est vérifié avec les formules exactes du paiement : paliers, packs, prix au m², remise Premium, marge. Les rangements sûrs sont faits d’office (annulables), le reste attend votre décision."
    schedule="Vérifie chaque prix modifié et tout le catalogue à 4 h 30"
    tabs={[
      { key: 'alerts', label: 'Alertes', statuses: ['flagged'], empty: 'Aucune alerte de prix.' },
      { key: 'todo', label: 'À valider', statuses: ['proposed'], empty: 'Aucune correction à valider.' },
      { key: 'applied', label: 'Rangements', statuses: ['applied', 'accepted'], empty: 'Aucun rangement.' },
      { key: 'ok', label: 'Conformes', statuses: ['checked'], empty: 'Aucun produit contrôlé pour l’instant.' },
      { key: 'journal', label: 'Journal', statuses: [], empty: 'Aucune entrée.' },
    ]}
    options={[
      { key: 'margeMin', label: 'Marge minimale', type: 'percent', min: 0, max: 90, hint: 'Sous ce seuil (y compris après la remise Premium), le produit est signalé.' },
      { key: 'inclureInactifs', label: 'Inclure les produits inactifs', type: 'boolean' },
    ]}
    stats={(s) => [
      { label: 'Alertes bloquantes', value: String(s.extra?.critiques ?? 0), tone: s.extra?.critiques ? 'danger' : 'ok', hint: 'vente à perte, prix incohérents' },
      { label: 'À vérifier', value: String(s.extra?.avertissements ?? 0), tone: s.extra?.avertissements ? 'warning' : 'ok', hint: `${s.extra?.conformes ?? 0} produit(s) conformes` },
    ]}
    renderReview={(r, api) => <PriceCard review={r} api={api} />}
  />
);

export default IATarifsPage;
