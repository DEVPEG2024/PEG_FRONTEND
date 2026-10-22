// Aperçu d'un BAT dans la page : une image telle quelle, un PDF page par page
// (toutes les pages visibles EN MÊME TEMPS — deux pages côte à côte sur
// ordinateur, l'une sous l'autre sur téléphone), les autres formats en lien.
// « Agrandir » montre les mêmes pages en grand.
import { useEffect, useState } from 'react';
import { HiX } from 'react-icons/hi';
import { MdDownload, MdFullscreen, MdInsertDriveFile } from 'react-icons/md';
import type { BatFileLike } from '@/utils/projectBat';
import { PdfPageImage, renderPdfPages, revokePdfPages } from '@/utils/pdfPages';

const MAX_PAGES = 12;

type Kind = 'pdf' | 'image' | 'other';

export const batFileKind = (file: BatFileLike): Kind => {
  const name = (file.name || file.url || '').toLowerCase();
  const mime = (file.mime || '').toLowerCase();
  if (mime === 'application/pdf' || /\.pdf(\?|$)/.test(name)) return 'pdf';
  if (mime.startsWith('image/') || /\.(jpe?g|png|webp|gif)(\?|$)/.test(name)) return 'image';
  return 'other';
};

type PdfState =
  | { status: 'loading' }
  | { status: 'ready'; pages: PdfPageImage[]; total: number }
  | { status: 'error' };

const toolButton: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '36px', padding: '0 12px',
  borderRadius: '10px', border: '1px solid rgba(0,0,0,0.12)', background: '#ffffff', color: '#27272a',
  fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
};

const pagesGrid = (count: number, min: number): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: count > 1 ? `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))` : 'minmax(0, 1fr)',
  gap: '16px',
  alignItems: 'start',
  ...(count === 1 ? { maxWidth: `${min * 2}px`, margin: '0 auto', width: '100%' } : {}),
});

const PageImage = ({ page, index, total }: { page: PdfPageImage; index: number; total: number }) => (
  <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <img
      src={page.url}
      alt={`Page ${index + 1} sur ${total}`}
      width={page.width}
      height={page.height}
      style={{ width: '100%', height: 'auto', display: 'block', background: '#fff', borderRadius: '6px', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}
    />
    {total > 1 && (
      <figcaption style={{ textAlign: 'center', color: '#3f3f46', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em' }}>
        PAGE {index + 1} / {total}
      </figcaption>
    )}
  </figure>
);

const BatDocumentPreview = ({ file, onViewed }: { file: BatFileLike; onViewed?: () => void }) => {
  const kind = batFileKind(file);
  const url = file.url || '';
  const [pdf, setPdf] = useState<PdfState>({ status: 'loading' });
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (kind !== 'pdf' || !url) return;
    let cancelled = false;
    let rendered: PdfPageImage[] = [];
    setPdf({ status: 'loading' });
    renderPdfPages(url, { maxPages: MAX_PAGES })
      .then(({ pages, total }) => {
        if (cancelled) { revokePdfPages(pages); return; }
        rendered = pages;
        setPdf({ status: 'ready', pages, total });
        onViewed?.();
      })
      .catch((err) => {
        console.warn('[BAT] Aperçu PDF impossible :', err);
        if (!cancelled) setPdf({ status: 'error' });
      });
    return () => { cancelled = true; revokePdfPages(rendered); };
    // onViewed volontairement hors dépendances : un nouveau rendu par fichier, pas par rendu du parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, url]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const canExpand = kind === 'image' || (kind === 'pdf' && pdf.status === 'ready');
  const shown = pdf.status === 'ready' ? pdf.pages.length : 0;

  const body = (large: boolean) => {
    if (kind === 'image') {
      return (
        <img
          src={url}
          alt={`BAT : ${file.name || 'image'}`}
          onLoad={() => onViewed?.()}
          style={{ display: 'block', maxWidth: '100%', maxHeight: large ? 'none' : '520px', margin: '0 auto', objectFit: 'contain', borderRadius: '6px' }}
        />
      );
    }
    if (kind === 'pdf') {
      if (pdf.status === 'loading') {
        return (
          <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '48px 0', color: '#52525b', fontSize: '14px' }}>
            <div className="peg-bat-shimmer" style={{ width: '160px', height: '210px', borderRadius: '6px', background: 'linear-gradient(90deg, #e4e4e7, #f4f4f5, #e4e4e7)', backgroundSize: '200% 100%' }} />
            Préparation de l'aperçu…
          </div>
        );
      }
      if (pdf.status === 'error') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '36px 16px', color: '#3f3f46', textAlign: 'center' }}>
            <MdInsertDriveFile size={40} color="#71717a" aria-hidden />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>L'aperçu du PDF n'a pas pu s'afficher ici.</span>
            <a href={url} target="_blank" rel="noreferrer" onClick={() => onViewed?.()} style={{ ...toolButton, background: '#27272a', color: '#fff', border: 'none' }}>
              Ouvrir le PDF
            </a>
          </div>
        );
      }
      return (
        <>
          <div style={pagesGrid(pdf.pages.length, large ? 420 : 260)}>
            {pdf.pages.map((page, i) => <PageImage key={page.url} page={page} index={i} total={pdf.total} />)}
          </div>
          {pdf.total > shown && (
            <p style={{ margin: '12px 0 0', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
              {shown} premières pages sur {pdf.total} — téléchargez le PDF pour tout voir.
            </p>
          )}
        </>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '36px 16px', color: '#3f3f46', textAlign: 'center' }}>
        <MdInsertDriveFile size={40} color="#71717a" aria-hidden />
        <span style={{ fontSize: '14px', fontWeight: 700, wordBreak: 'break-word' }}>{file.name}</span>
        <span style={{ fontSize: '13px', color: '#52525b' }}>Ce format ne s'affiche pas dans le navigateur : téléchargez-le pour le vérifier.</span>
      </div>
    );
  };

  return (
    <>
      <style>{'@keyframes pegBatShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } .peg-bat-shimmer { animation: pegBatShimmer 1.4s ease-in-out infinite; } @media (prefers-reduced-motion: reduce) { .peg-bat-shimmer { animation: none; } }'}</style>
      <div style={{ position: 'relative', background: '#f4f4f5', borderRadius: '14px', padding: '52px 16px 16px' }}>
        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
          {canExpand && (
            <button type="button" onClick={() => setFullscreen(true)} className="peg-tap-target" style={toolButton}>
              <MdFullscreen size={17} aria-hidden /> Agrandir
            </button>
          )}
          <a href={url} target="_blank" rel="noreferrer" download onClick={() => onViewed?.()} className="peg-tap-target"
            aria-label="Télécharger le BAT" title="Télécharger" style={{ ...toolButton, padding: 0, width: '36px', justifyContent: 'center' }}>
            <MdDownload size={18} aria-hidden />
          </a>
        </div>
        {body(false)}
      </div>

      {fullscreen && (
        <div role="dialog" aria-modal="true" aria-label={`BAT : ${file.name || ''}`}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#090b10', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: 'calc(12px + var(--peg-safe-top, 0px)) 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
            <button type="button" onClick={() => setFullscreen(false)} aria-label="Fermer l'aperçu" autoFocus className="peg-tap-target"
              style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <HiX size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 16px calc(20px + var(--peg-safe-bottom, 0px))' }}>
            <div style={{ maxWidth: '1500px', margin: '0 auto', background: '#f4f4f5', borderRadius: '14px', padding: '16px' }}>
              {body(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BatDocumentPreview;
