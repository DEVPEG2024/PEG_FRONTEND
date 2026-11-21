/*
 * Devis d'achat Master Print — « Bloquer le prix d'achat (15 jours) » (ajout 21/11/2026).
 *
 * Un devis Master Print garde son prix 15 jours. L'admin le demande depuis le
 * formulaire d'envoi, avec EXACTEMENT les lignes qu'il s'apprête à envoyer. À
 * l'envoi, le serveur crée la commande depuis ce devis (prix repris) si le devis
 * est encore valable et les lignes inchangées ; sinon envoi normal, au prix du
 * jour — ce que ce bloc annonce avant de cliquer. Admin seulement.
 * Backend : peg_strapi `master-print-quotes.service.ts`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { HiLockClosed } from 'react-icons/hi';
import type { MpLineConfig } from '@/@types/masterPrint';
import type {
  MpPriceChange,
  MpQuoteCheck,
  MpQuoteView,
} from '@/@types/masterPrintQuote';
import {
  apiCheckMasterPrintQuote,
  apiCreateMasterPrintQuote,
  apiGetMasterPrintQuote,
} from '@/services/MasterPrintQuoteServices';
import { isMasterPrintMissing, masterPrintError } from '@/utils/masterPrint';
import {
  type QuoteNote,
  canLockPrice,
  priceChangeAmounts,
  quoteDecisionNote,
  quoteLabel,
} from '@/utils/masterPrintQuote';
import { Btn, label, muted } from './ui';

/** Un devis vient d'être créé : l'en-tête de l'onglet se relit. */
const QUOTE_EVENT = 'peg:master-print-quote';

const NOTE_COLORS: Record<QuoteNote['tone'], string> = {
  ok: '#86efac',
  warn: '#fcd34d',
  info: 'rgba(255,255,255,0.55)',
};

/** Formulaire d'envoi : état du devis pour les lignes actuelles + bouton « Bloquer le prix d'achat ». */
export const QuotePanel = ({
  projectDocumentId,
  lines,
  ready,
  disabled = false,
}: {
  projectDocumentId: string;
  lines: MpLineConfig[];
  /** Lignes complètes (hors adresse) : le devis peut être demandé. */
  ready: boolean;
  /** Le formulaire travaille (chiffrage, envoi) : bouton inactif. */
  disabled?: boolean;
}) => {
  const [check, setCheck] = useState<MpQuoteCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const seq = useRef(0);
  const linesKey = JSON.stringify(lines);

  // Relu à chaque changement des lignes (sans appel à Master Print côté serveur).
  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const { data } = await apiCheckMasterPrintQuote(
          projectDocumentId,
          ready ? linesRef.current : []
        );
        if (id === seq.current) setCheck(data);
      } catch (e) {
        if (id === seq.current && isMasterPrintMissing(e)) setMissing(true);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [projectDocumentId, linesKey, ready]);

  const lock = async () => {
    setBusy(true);
    const id = ++seq.current;
    try {
      const { data } = await apiCreateMasterPrintQuote(
        projectDocumentId,
        linesRef.current
      );
      if (id === seq.current) setCheck(data);
      if (data.quote)
        toast.success(`Prix d’achat bloqué — ${quoteLabel(data.quote)}`);
      window.dispatchEvent(
        new CustomEvent(QUOTE_EVENT, { detail: projectDocumentId })
      );
    } catch (e) {
      toast.error(masterPrintError(e, 'Devis Master Print impossible.'));
    } finally {
      setBusy(false);
    }
  };

  if (missing) return null; // serveur pas encore à jour : rien à proposer
  const note = check ? quoteDecisionNote(check) : null;

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${check?.decision?.use ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.07)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
      data-testid="master-print-quote"
    >
      <p style={{ ...label, marginBottom: 0 }}>Prix d’achat bloqué</p>
      {check?.quote ? (
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            overflowWrap: 'anywhere',
          }}
        >
          <HiLockClosed aria-hidden="true" style={{ flexShrink: 0 }} />
          {quoteLabel(check.quote)}
        </p>
      ) : (
        <p style={muted}>
          Un devis Master Print garde le prix d’achat 15 jours : la commande
          reprendra ce prix si les lignes n’ont pas changé d’ici l’envoi.
        </p>
      )}
      {note && (
        <p style={{ ...muted, color: NOTE_COLORS[note.tone] }}>{note.text}</p>
      )}
      {canLockPrice(check) && (
        <div>
          <Btn
            onClick={lock}
            disabled={!ready || busy || disabled}
            title={
              ready
                ? undefined
                : 'Complétez d’abord les lignes (produit, quantités, marquages)'
            }
          >
            <HiLockClosed aria-hidden="true" />
            {busy ? 'Devis en cours…' : 'Bloquer le prix d’achat (15 jours)'}
          </Btn>
        </div>
      )}
    </div>
  );
};

/** En-tête de l'onglet : dernier devis d'achat du projet. */
export const QuoteSummary = ({
  projectDocumentId,
  refreshKey,
}: {
  projectDocumentId: string;
  /** Change après un envoi (le devis a pu servir). */
  refreshKey?: number;
}) => {
  const [quote, setQuote] = useState<MpQuoteView | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiGetMasterPrintQuote(projectDocumentId);
      setQuote(data.quote);
    } catch {
      setQuote(null); // serveur pas à jour ou sans devis : rien à montrer
    }
  }, [projectDocumentId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail === projectDocumentId) load();
    };
    window.addEventListener(QUOTE_EVENT, on);
    return () => window.removeEventListener(QUOTE_EVENT, on);
  }, [projectDocumentId, load]);

  if (!quote) return null;
  const live = !quote.expired && !quote.used;
  return (
    <p
      style={{
        ...muted,
        color: live ? '#86efac' : muted.color,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        overflowWrap: 'anywhere',
      }}
    >
      <HiLockClosed aria-hidden="true" style={{ flexShrink: 0 }} />
      {quoteLabel(quote)}
    </p>
  );
};

/** Envoi refusé (409 price_changed) : ancien → nouveau total et « Confirmer le nouveau prix ». */
export const PriceChangeNotice = ({
  change,
  busy,
  onConfirm,
}: {
  change: MpPriceChange;
  busy: boolean;
  onConfirm: () => void;
}) => {
  const amounts = priceChangeAmounts(change);
  return (
    <div
      role="alert"
      style={{
        marginTop: '10px',
        padding: '10px 12px',
        borderRadius: '10px',
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.3)',
        color: '#fcd34d',
        fontSize: '12.5px',
        lineHeight: 1.6,
      }}
    >
      {amounts && (
        <p style={{ fontWeight: 700, fontSize: '14px' }}>{amounts}</p>
      )}
      <p>{change.message}</p>
      <div style={{ marginTop: '8px' }}>
        <Btn variant="primary" onClick={onConfirm} disabled={busy}>
          {busy ? 'Envoi…' : 'Confirmer le nouveau prix'}
        </Btn>
      </div>
    </div>
  );
};
