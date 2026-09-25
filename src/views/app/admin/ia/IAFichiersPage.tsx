import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdCheck, MdDownload, MdOpenInNew, MdOutlineImageSearch, MdRefresh, MdSend, MdUndo, MdVisibility } from 'react-icons/md';
import type { AgentReview } from '@/services/AgentServices';
import AgentShell, { type CardApi } from './agents/AgentShell';
import { Card, Problems, STATUS_LABEL, SeverityBadge, btn, checkerboard, fileUrl, fmtDate, inputStyle, labelStyle, mutedText } from './agents/agentUi';

/**
 * Contrôle des fichiers clients — agent qui vérifie logos, visuels et PDF
 * envoyés pour l'impression (commandes, « Mes fichiers », logo de la fiche).
 * Rien n'est envoyé au client ni modifié sans un clic ici.
 */

const VERDICT: Record<string, { label: string; severity: 'critical' | 'warning' | 'info' }> = {
  a_refaire: { label: 'À refaire', severity: 'critical' },
  a_verifier: { label: 'À vérifier', severity: 'warning' },
  conforme: { label: 'Conforme', severity: 'info' },
};

const SOURCE: Record<string, string> = {
  commande: 'Commande',
  fichier_client: 'Mes fichiers',
  logo_client: 'Logo de la fiche client',
};

const isImage = (d: any) => d?.mesures?.kind === 'raster' || d?.mesures?.kind === 'svg';

const measures = (d: any) => {
  const m = d?.mesures || {};
  if (m.kind === 'pdf' && m.pdf) {
    const p = m.pdf;
    return `PDF ${Math.round(p.widthMm)} × ${Math.round(p.heightMm)} mm · ${p.pages} page${p.pages > 1 ? 's' : ''}${p.fontsTotal ? ` · ${p.fontsTotal} police(s)${p.fontsNotEmbedded?.length ? ` dont ${p.fontsNotEmbedded.length} non incorporée(s)` : ' incorporées'}` : ''}${p.rasterOnlyDpi ? ` · image à ${p.rasterOnlyDpi} dpi` : ''}`;
  }
  if (m.kind === 'raster') {
    return `${m.width} × ${m.height} px · ${String(m.format || '').toUpperCase()} · fond ${m.fond === 'transparent' ? 'transparent' : m.fond === 'varié' ? 'non uni' : 'uni'}${d.netJusquCm ? ` · net jusqu’à ${String(d.netJusquCm).replace('.', ',')} cm` : ''}`;
  }
  if (m.kind === 'svg') return 'SVG (vectoriel)';
  if (m.kind === 'vector_other') return 'Fichier vectoriel (AI / EPS)';
  return m.format ? `Format ${m.format}` : 'Format non reconnu';
};

const Thumb = ({ url, label }: { url: string; label: string }) => (
  <a href={fileUrl(url)} target="_blank" rel="noreferrer" style={{ display: 'block', ...checkerboard, borderRadius: '10px', overflow: 'hidden', width: '160px', height: '160px', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} title={label}>
    <img src={fileUrl(url)} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" />
  </a>
);

const FileCard = ({ review, api }: { review: AgentReview; api: CardApi }) => {
  const d = review.details || {};
  const verdict = VERDICT[d.verdict] || VERDICT.a_verifier;
  const [message, setMessage] = useState<string>(d.message || '');
  const [showMessage, setShowMessage] = useState(false);
  const open = review.status === 'flagged';
  const st = STATUS_LABEL[review.status];

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <SeverityBadge severity={verdict.severity} label={verdict.label} />
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', overflowWrap: 'anywhere' }}>{d.nom}</span>
        <span style={{ ...mutedText, background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px 8px' }}>{SOURCE[d.source] || d.source}</span>
        {!open && review.status !== 'checked' && <span style={{ fontSize: '11px', fontWeight: 700, color: st.color }}>{st.label}</span>}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
          {fmtDate(review.createdAt)} · {review.source}{review.decidedBy && review.decidedBy !== 'agent' ? ` · ${review.decidedBy}` : ''}
        </span>
      </div>

      <div style={{ color: 'rgba(230,238,250,0.85)', fontSize: '13px' }}>
        {review.label.split(' · ')[0]}
        {d.usage && <span style={mutedText}> — usage : {d.usage.label}{d.usage.technique ? ` en ${d.usage.technique}` : ''}</span>}
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {isImage(d) ? <Thumb url={d.url} label="Fichier du client" /> : (
          <a href={fileUrl(d.url)} target="_blank" rel="noreferrer" style={{ ...btn('rgba(255,255,255,0.7)'), height: 'fit-content' }}><MdVisibility size={15} /> Ouvrir le fichier</a>
        )}
        {d.correction?.url && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Thumb url={d.correction.url} label="Version corrigée proposée" />
            <span style={mutedText}>{d.correction.extrait ? 'Logo extrait et détouré' : 'Fond détouré'} · net jusqu’à {String(d.correction.netJusquCm).replace('.', ',')} cm</span>
          </div>
        )}
        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={mutedText}>{measures(d)}</div>
          {d.vision && (
            <div style={{ fontSize: '12px', color: 'rgba(191,219,254,0.9)' }}>
              L’IA voit : <strong>{String(d.vision.nature).replace('_', ' ')}</strong> — {d.vision.description}
            </div>
          )}
          {d.visionNote && <div style={mutedText}>({d.visionNote})</div>}
          <Problems items={d.problemes || []} />
          {review.status === 'checked' && !(d.problemes || []).length && <div style={{ color: '#4ade80', fontSize: '13px' }}>Rien à signaler pour cet usage.</div>}
        </div>
      </div>

      {d.envoi && (
        <div style={{ fontSize: '12px', color: '#86efac' }}>
          {d.envoi.sandbox ? 'Message enregistré (hors production : rien n’a été envoyé au client)' : `Client prévenu (${d.envoi.comptes} compte${d.envoi.comptes > 1 ? 's' : ''})`} le {fmtDate(d.envoi.at)} par {d.envoi.by}.
        </div>
      )}
      {d.correctionUtilisee && (
        <div style={{ fontSize: '12px', color: '#86efac' }}>
          Version corrigée ajoutée {d.correctionUtilisee.ou === 'commande' ? 'à la commande' : 'aux fichiers du client (non visible par lui)'} le {fmtDate(d.correctionUtilisee.at)} — le fichier d’origine est conservé.
        </div>
      )}

      {open && showMessage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={labelStyle}>Message au client (modifiable)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} style={inputStyle} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {open && d.message && (
          showMessage ? (
            <button type="button" style={btn('#2563eb', true)} disabled={api.busy || !message.trim()} onClick={() => api.action('prevenir-client', { message }, 'Message envoyé au client')}>
              <MdSend size={15} /> Envoyer au client
            </button>
          ) : (
            <button type="button" style={btn('#60a5fa')} onClick={() => setShowMessage(true)}>
              <MdSend size={15} /> Prévenir le client…
            </button>
          )
        )}
        {d.correction?.url && !d.correctionUtilisee && open && (
          <button type="button" style={btn('#22c55e')} disabled={api.busy} onClick={() => api.action('utiliser-correction', {}, 'Version corrigée ajoutée')}>
            <MdCheck size={15} /> Ajouter la version corrigée
          </button>
        )}
        {d.correctionUtilisee && (
          <button type="button" style={btn('#fbbf24')} disabled={api.busy} onClick={() => api.action('retirer-correction', {}, 'Version corrigée retirée')}>
            <MdUndo size={15} /> Retirer la version corrigée
          </button>
        )}
        {d.correction?.url && (
          <a href={fileUrl(d.correction.url)} download style={btn('rgba(255,255,255,0.7)')}><MdDownload size={15} /> Télécharger la version corrigée</a>
        )}
        {open && (
          <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={api.busy} onClick={() => api.reject('Signalement classé')}>
            <MdCheck size={15} /> Classer (réglé ou sans objet)
          </button>
        )}
        <button type="button" style={btn('rgba(255,255,255,0.6)')} disabled={api.busy} onClick={() => api.rerun()}>
          <MdRefresh size={15} /> Réexaminer
        </button>
        {d.projet?.documentId && (
          <Link to={`/common/projects/details/${d.projet.documentId}`} style={btn('rgba(255,255,255,0.6)')}><MdOpenInNew size={14} /> Projet</Link>
        )}
        {d.client?.documentId && (
          <Link to="/admin/customers/list" style={btn('rgba(255,255,255,0.6)')}><MdOpenInNew size={14} /> {d.client.nom}</Link>
        )}
      </div>
    </Card>
  );
};

const IAFichiersPage = () => (
  <AgentShell
    agent="fichiers"
    icon={<MdOutlineImageSearch size={22} />}
    title="Contrôle des fichiers"
    subtitle="Chaque logo ou visuel envoyé par un client est vérifié avant l’impression : résolution pour la taille prévue, fond, capture d’écran, PDF (format, fond perdu, polices). Rien n’est envoyé au client sans votre accord."
    schedule="Contrôle chaque fichier reçu et relit tout à 4 h"
    budgetLabel="Images regardées par l’IA"
    tabs={[
      { key: 'todo', label: 'À traiter', statuses: ['flagged'], empty: 'Aucun fichier à reprendre.' },
      { key: 'ok', label: 'Conformes', statuses: ['checked'], empty: 'Aucun fichier contrôlé pour l’instant.' },
      { key: 'journal', label: 'Journal', statuses: [], empty: 'Aucune entrée.' },
    ]}
    options={[
      { key: 'vision', label: 'Regard de l’IA', type: 'boolean', hint: 'Repère captures d’écran, maquettes, photos, logos coupés (≈ 0,001 € l’image).' },
      { key: 'corrections', label: 'Versions corrigées', type: 'boolean', hint: 'Détoure un fond uni ou extrait le logo d’une capture — jamais à la place du fichier du client.' },
      { key: 'alerterAdmins', label: 'Alerter les admins', type: 'boolean', hint: 'Notification quand un fichier reçu est à refaire.' },
      { key: 'joursMax', label: 'Commandes examinées', type: 'number', unit: 'derniers jours', min: 7, max: 730 },
    ]}
    stats={(s) => [
      { label: 'À refaire', value: String(s.extra?.aRefaire ?? 0), tone: s.extra?.aRefaire ? 'danger' : 'ok', hint: 'bloquant pour l’impression' },
      { label: 'À vérifier', value: String(s.extra?.aVerifier ?? 0), tone: s.extra?.aVerifier ? 'warning' : 'ok', hint: `${s.extra?.conformes ?? 0} fichier(s) conformes` },
    ]}
    banner={(s) => s.extra?.bacASable ? (
      <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', color: '#fde68a', borderRadius: '12px', padding: '10px 14px', fontSize: '13px' }}>
        Hors production : les messages aux clients sont enregistrés mais jamais envoyés.
      </div>
    ) : null}
    renderReview={(r, api) => <FileCard review={r} api={api} />}
  />
);

export default IAFichiersPage;
