import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdCheck, MdClose, MdOpenInNew, MdOutlineFlag, MdOutlineWorkspacePremium, MdRefresh, MdSend, MdUndo } from 'react-icons/md';
import type { AgentReview } from '@/services/AgentServices';
import AgentShell, { type CardApi } from './agents/AgentShell';
import { Card, STATUS_LABEL, SeverityBadge, Toggle, btn, eur, fileUrl, fmtDate, inputStyle, labelStyle, mutedText } from './agents/agentUi';

/**
 * Offres Premium — agent qui prépare les offres personnalisées des clients
 * Premium (« Mes offres ») : sélection adaptée au secteur et à l'historique,
 * prix jamais moins avantageux que le catalogue remisé, maquette avec le logo.
 * Les offres ne sont créées qu'ici, sur validation.
 */

const tiersLabel = (prix: any) => {
  const list = (prix?.paliers || []) as { minQuantity: number; price: number }[];
  if (prix?.mode === 'm2') return `${eur(prix.prixM2)} HT / m²`;
  if (prix?.mode === 'packs') return list.map((t) => `${t.minQuantity} : ${eur(t.price)}`).join(' · ');
  return list.map((t) => `${t.minQuantity}+ : ${eur(t.price)}`).join(' · ');
};

const OffersCard = ({ review, api }: { review: AgentReview; api: CardApi }) => {
  const d = review.details || {};
  const items: any[] = d.items || [];
  const st = STATUS_LABEL[review.status];
  const [picked, setPicked] = useState<Set<number>>(() => new Set(items.map((_, i) => i)));
  const [noMockup, setNoMockup] = useState<Set<number>>(() => new Set());
  const [message, setMessage] = useState<string>(d.envoi?.message || d.message || '');
  const [markProcessed, setMarkProcessed] = useState(true);
  const [notify, setNotify] = useState(!!d.client?.comptes);
  const proposed = review.status === 'proposed';
  const toggle = (set: Set<number>, i: number) => { const n = new Set(set); if (n.has(i)) n.delete(i); else n.add(i); return n; };

  if (review.kind === 'signalement') {
    return (
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <SeverityBadge severity={review.severity} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{review.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{fmtDate(review.createdAt)} · {review.source}</span>
        </div>
        <div style={{ color: '#fed7aa', fontSize: '13px', display: 'flex', gap: '8px' }}><MdOutlineFlag size={16} style={{ flexShrink: 0, marginTop: '2px' }} />{d.note}</div>
        {review.status === 'flagged' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={api.busy} onClick={() => api.reject()}><MdCheck size={15} /> Classer</button>
            <button type="button" style={btn('rgba(255,255,255,0.6)')} disabled={api.busy} onClick={() => api.rerun()}><MdRefresh size={15} /> Réessayer</button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {d.client?.nouveau && <SeverityBadge severity="critical" label="Nouveau Premium" />}
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{review.label}</span>
        {d.client?.secteur && <span style={{ ...mutedText, background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px 8px' }}>{d.client.secteur}</span>}
        <span style={{ fontSize: '11px', fontWeight: 700, color: st.color }}>{st.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
          {fmtDate(review.createdAt)} · {review.source}{review.decidedBy && review.decidedBy !== 'agent' ? ` · ${review.decidedBy}` : ''}
        </span>
      </div>
      {d.resume && <div style={{ color: 'rgba(230,238,250,0.85)', fontSize: '13px' }}>{d.resume}</div>}
      <div style={mutedText}>
        {d.client?.offresExistantes ? `${d.client.offresExistantes} offre(s) déjà en place · ` : 'Aucune offre en place · '}
        {d.logo?.source ? `logo utilisé : ${d.logo.source}` : 'aucun logo exploitable pour les maquettes'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
        {items.map((it, i) => {
          const on = picked.has(i);
          const created = (d.creees || []).find((c: any) => c.nom === it.nom);
          return (
            <div key={it.baseId + i} style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${on && proposed ? 'rgba(96,165,250,0.45)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: proposed && !on ? 0.55 : 1 }}>
              {it.maquette?.url && !noMockup.has(i) ? (
                <img src={fileUrl(it.maquette.url)} alt={`Maquette ${it.nom}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#fff', borderRadius: '8px' }} loading="lazy" />
              ) : (
                <div style={{ ...mutedText, background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px', minHeight: '48px' }}>
                  {it.maquetteNote ? `Pas de maquette : ${it.maquetteNote}.` : it.placement === 'aucun' ? 'Imprimé / prestation : pas de maquette.' : 'Sans maquette.'}
                </div>
              )}
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{it.nom}</div>
              <div style={{ ...mutedText, color: 'rgba(191,219,254,0.85)' }}>{it.pourquoi}</div>
              <div style={{ fontSize: '12px', color: 'rgba(230,238,250,0.9)' }}>{tiersLabel(it.prix)} HT</div>
              <div style={mutedText}>
                −{it.prix?.remisePct} % vs catalogue ({eur(it.prix?.prixCatalogue)}){it.prix?.margeMin !== null && it.prix?.margeMin !== undefined ? ` · marge ≥ ${Math.round(it.prix.margeMin * 100)} %` : ''}{it.dejaCommande ? ' · déjà commandé' : ''}
              </div>
              {proposed && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fff', cursor: 'pointer' }}>
                    <input type="checkbox" checked={on} onChange={() => setPicked((s) => toggle(s, i))} /> Créer cette offre
                  </label>
                  {it.maquette?.url && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!noMockup.has(i)} onChange={() => setNoMockup((s) => toggle(s, i))} /> avec la maquette
                    </label>
                  )}
                </div>
              )}
              {created && <Link to={`/admin/products/edit/${created.documentId}`} style={{ ...btn('rgba(255,255,255,0.7)'), alignSelf: 'flex-start' }}><MdOpenInNew size={14} /> Offre créée</Link>}
            </div>
          );
        })}
      </div>

      {!!d.refuses?.length && proposed && (
        <details>
          <summary style={{ ...mutedText, cursor: 'pointer' }}>{d.refuses.length} suggestion(s) de l’IA écartée(s)</summary>
          <ul style={{ ...mutedText, margin: '6px 0 0', paddingLeft: '18px' }}>{d.refuses.map((r: any, i: number) => <li key={i}>{r.produit} — {r.motif}</li>)}</ul>
        </details>
      )}

      {(proposed || review.status === 'accepted') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={labelStyle}>Message au client (modifiable)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} style={inputStyle} />
        </div>
      )}

      {proposed && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fff' }}>
            <Toggle label="Marquer le client comme traité" on={markProcessed} onChange={setMarkProcessed} /> Marquer le client « traité »
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: d.client?.comptes ? '#fff' : 'rgba(255,255,255,0.4)' }}>
            <Toggle label="Prévenir le client" on={notify} disabled={!d.client?.comptes} onChange={setNotify} /> Prévenir le client{d.client?.comptes ? '' : ' (aucun compte)'}
          </label>
        </div>
      )}

      {d.envoi && (
        <div style={{ fontSize: '12px', color: '#86efac' }}>
          {d.envoi.sandbox ? 'Message enregistré (hors production : rien n’a été envoyé)' : `Client prévenu (${d.envoi.comptes} compte${d.envoi.comptes > 1 ? 's' : ''})`}{d.envoi.at ? ` le ${fmtDate(d.envoi.at)}` : ''}.
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {proposed && (
          <>
            <button
              type="button"
              style={btn('#2563eb', true)}
              disabled={api.busy || !picked.size}
              onClick={() => api.accept({ items: [...picked], sansMaquette: [...noMockup], marquerTraite: markProcessed, prevenir: notify, message }, `${picked.size} offre(s) créée(s)`)}
            >
              <MdCheck size={15} /> Créer {picked.size} offre{picked.size > 1 ? 's' : ''}
            </button>
            <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={api.busy} onClick={() => api.reject('Proposition refusée')}><MdClose size={15} /> Refuser</button>
          </>
        )}
        {review.status === 'accepted' && !d.envoi && !!d.client?.comptes && (
          <button type="button" style={btn('#60a5fa')} disabled={api.busy || !message.trim()} onClick={() => api.action('prevenir-client', { message }, 'Client prévenu')}><MdSend size={15} /> Prévenir le client</button>
        )}
        {review.status === 'accepted' && (
          <button type="button" style={btn('#fbbf24')} disabled={api.busy} onClick={() => api.revert('Offres désactivées')}><MdUndo size={15} /> Annuler (désactiver ces offres)</button>
        )}
        <button type="button" style={btn('rgba(255,255,255,0.6)')} disabled={api.busy} onClick={() => api.rerun()}><MdRefresh size={15} /> Nouvelle proposition</button>
        <Link to="/admin/premium" style={btn('rgba(255,255,255,0.6)')}><MdOpenInNew size={14} /> Onglet Premium</Link>
      </div>
    </Card>
  );
};

const IAPremiumPage = () => (
  <AgentShell
    agent="premium"
    icon={<MdOutlineWorkspacePremium size={22} />}
    title="Offres Premium"
    subtitle="Pour chaque client Premium, l’agent prépare une sélection d’offres personnalisées : produits adaptés à son secteur et à ses commandes, prix au moins aussi avantageux que le catalogue remisé, maquette avec son logo. Rien n’est créé sans votre validation."
    schedule="Prépare les offres de chaque nouveau Premium et repasse à 5 h"
    budgetLabel="Appels IA"
    tabs={[
      { key: 'todo', label: 'À valider', statuses: ['proposed'], empty: 'Aucune proposition en attente.' },
      { key: 'done', label: 'Offres créées', statuses: ['accepted'], empty: 'Aucune offre créée par l’agent.' },
      { key: 'flags', label: 'Signalements', statuses: ['flagged'], empty: 'Aucun signalement.' },
      { key: 'journal', label: 'Journal', statuses: [], empty: 'Aucune entrée.' },
    ]}
    options={[
      { key: 'margeMin', label: 'Marge minimale', type: 'percent', min: 0, max: 90, hint: 'Un produit dont l’offre passerait sous ce seuil n’est pas proposé.' },
      { key: 'remiseSupplementaire', label: 'Remise supplémentaire', type: 'percent', min: 0, max: 50, hint: 'En plus des −15 % Premium (0 par défaut).' },
      { key: 'maquettes', label: 'Maquettes avec le logo', type: 'boolean' },
      { key: 'seulementSansOffre', label: 'Seulement les clients sans offre', type: 'boolean', hint: 'Sinon, tous les clients Premium sont revus.' },
    ]}
    stats={(s) => [
      { label: 'Nouveaux Premium', value: String(s.extra?.aTraiter ?? 0), tone: s.extra?.aTraiter ? 'danger' : 'ok', hint: 'offres à préparer' },
      { label: 'Premium sans offre', value: String(s.extra?.sansOffre ?? 0), tone: s.extra?.sansOffre ? 'warning' : 'ok', hint: `sur ${s.extra?.clientsPremium ?? 0} client(s) Premium` },
    ]}
    banner={(s) => s.extra?.bacASable ? (
      <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', color: '#fde68a', borderRadius: '12px', padding: '10px 14px', fontSize: '13px' }}>
        Hors production : les messages aux clients sont enregistrés mais jamais envoyés.
      </div>
    ) : null}
    renderReview={(r, api) => <OffersCard review={r} api={api} />}
  />
);

export default IAPremiumPage;
