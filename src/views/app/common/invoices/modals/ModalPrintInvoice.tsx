import { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { HiX } from 'react-icons/hi';
import { Invoice } from '@/@types/invoice';
import useResponsive from '@/utils/hooks/useResponsive';
import { apiGetInvoiceDocument } from '@/services/InvoicesServices';
import InvoicePDF from '../pdf/InvoicePDF';

const ModalPrintInvoice = ({
  printInvoiceDialog,
  selectedInvoice,
  setPrintInvoiceDialog,
  setSelectedInvoice,
  dispatch,
}: {
  printInvoiceDialog: boolean;
  selectedInvoice: Invoice;
  setPrintInvoiceDialog: (printInvoiceDialog: boolean) => any;
  setSelectedInvoice: (invoice: Invoice | null) => any;
  dispatch: (fonction: any) => any;
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { smaller } = useResponsive();
  // Sous md, l'iframe est inutile : iOS Safari ne rend pas un PDF en iframe
  // (zone blanche) et le rendu coûte un affichage complet pour rien. On sert
  // directement le lien d'ouverture, qui donne aussi la feuille de partage.
  const isMobile = smaller.md;

  const invoiceLabel = selectedInvoice?.name ?? '';
  const downloadName = `Facture-${invoiceLabel.replace(/[^\w.-]+/g, '-') || 'PEG'}.pdf`;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const generatePdf = async () => {
      try {
        setLoading(true);
        setPdfError(null);

        // Charger le logo en data URL
        let logoUrl = '';
        try {
          const res = await fetch('/img/logo/logo-nova.png');
          const blob = await res.blob();
          logoUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (err) { console.warn('[PrintInvoice] Logo indisponible, PDF généré sans logo:', err); }

        // La facture complète, relue au serveur : lignes figées, projet, client.
        // L'écran appelant (liste, projet, accueil) n'en charge qu'un extrait.
        let invoice: Invoice = selectedInvoice;
        try {
          invoice = (await apiGetInvoiceDocument(selectedInvoice.documentId)) ?? selectedInvoice;
        } catch (err) {
          console.warn('[PrintInvoice] Relecture de la facture impossible, PDF depuis la liste :', err);
        }

        if (cancelled) return;

        const doc = <InvoicePDF invoice={invoice} logoUrl={logoUrl} />;
        const blob = await pdf(doc).toBlob();

        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (e: any) {
        if (!cancelled) {
          setPdfError(e?.message ?? 'Erreur lors de la génération du PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generatePdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedInvoice?.documentId]);

  const handleClose = () => {
    dispatch(setPrintInvoiceDialog(false));
    dispatch(setSelectedInvoice(null));
  };

  if (!printInvoiceDialog) return null;

  return (
    <>
      <style>{`
        @keyframes premiumFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes premiumSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'premiumFadeIn 0.25s ease-out',
        }}
        onClick={handleClose}
      >
        <div
          className="peg-full-mobile"
          style={{
            position: 'relative',
            width: '95vw',
            maxWidth: 1100,
            height: '92dvh',
            background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)',
            borderRadius: 20,
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'premiumSlideUp 0.35s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="peg-tap-target"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            <HiX size={18} />
          </button>

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', textAlign: 'center' }}>
              Facture N° {selectedInvoice?.name ?? ''}
            </h3>
          </div>

          {/* PDF Content */}
          <div style={{ flex: 1, padding: 'var(--peg-pad-16)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Génération du PDF en cours…
              </div>
            )}
            {pdfError && (
              <div style={{ textAlign: 'center', padding: 20, color: '#f87171' }}>
                <p>Erreur : {pdfError}</p>
              </div>
            )}
            {pdfUrl && !isMobile && (
              <iframe
                src={pdfUrl}
                style={{ width: '100%', flex: 1, border: 'none', borderRadius: 12, background: '#fff' }}
                title={`Facture ${selectedInvoice?.name ?? ''}`}
              />
            )}
            {pdfUrl && isMobile && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 14, padding: '0 8px' }}>
                Le PDF est prêt : ouvrez-le pour le consulter, l'enregistrer ou le partager.
              </div>
            )}
            {/* Seule sortie du PDF : sans ce lien, un blob affiché en iframe
                n'est ni téléchargeable ni partageable (aucun href dans l'écran). */}
            {pdfUrl && (
              <a
                href={pdfUrl}
                download={downloadName}
                target="_blank"
                rel="noopener"
                className="peg-tap-target"
                style={{
                  marginTop: 12,
                  alignSelf: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 22px',
                  borderRadius: 10,
                  background: 'rgba(47,111,237,0.15)',
                  border: '1px solid rgba(47,111,237,0.35)',
                  color: '#6fa3f5',
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Ouvrir / Enregistrer le PDF
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalPrintInvoice;
