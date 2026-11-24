/**
 * Éditeur de facture — création ET modification (admin).
 *
 * Une facture se lit ligne par ligne : désignation, détail, quantité, P.U. HT,
 * total. Les totaux (HT, TVA, TTC) se calculent depuis les lignes ; le serveur
 * refuse des lignes qui ne retombent pas sur le montant HT
 * (peg_strapi → services/invoice-lines.service.ts).
 *
 * Création : le brouillon (lignes du projet, de sa commande ou de son devis)
 * est vérifié AVANT l'émission — une facture émise reçoit son numéro FAC-XXXX
 * et ne se supprime plus (seulement s'annule).
 * Facture encaissée : montants figés, seules les désignations se corrigent.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { HiCheck, HiInformationCircle, HiLockClosed, HiOutlineCalendar, HiPlus, HiTrash, HiX } from 'react-icons/hi';
import { DatePicker, Select, Switcher } from '@/components/ui';
import { Invoice } from '@/@types/invoice';
import { Customer } from '@/@types/customer';
import { apiGetInvoiceDocument, CreateInvoiceRequest, isInvoiceLinesSupported, probeInvoiceLinesSupport } from '@/services/InvoicesServices';
import { apiGetCustomers } from '@/services/CustomerServices';
import {
  appliedVatRate,
  InvoiceLine,
  InvoiceLineKind,
  isInvoicePaid,
  PAID_PAYMENT_STATES,
  resolveInvoiceLines,
  round2,
  totalsFromLines,
  validateInvoiceLines,
} from '@/utils/invoiceLines';
import { fmtPrice, TVA_RATE } from '@/utils/priceHelpers';
import { paymentModeData, paymentStateData, stateData } from '../constants';

// ─── Contrat avec les écrans appelants ───────────────────────────────────────

export type InvoiceDraft = {
  customer: { documentId: string; name?: string | null } | null;
  project?: { documentId: string; name?: string | null } | null;
  lines: InvoiceLine[];
};

export type InvoiceEditorValues = {
  customer: { documentId: string; name?: string | null } | null;
  state: string;
  date: Date;
  dueDate: Date;
  paymentMethod: string;
  paymentState: string;
  paymentDate: Date | null;
  lines: InvoiceLine[];
  amount: number;
  vatAmount: number;
  totalAmount: number;
  /** Facture encaissée : montants à ne pas renvoyer (figés côté serveur). */
  amountsLocked: boolean;
};

/** Données de mise à jour (GraphQL `updateInvoice`) depuis les valeurs de l'éditeur. */
export const toInvoiceUpdate = (documentId: string, v: InvoiceEditorValues): Partial<Invoice> => ({
  documentId,
  state: v.state,
  date: v.date,
  dueDate: v.dueDate,
  paymentMethod: v.paymentMethod,
  paymentState: v.paymentState,
  ...(v.paymentDate ? { paymentDate: v.paymentDate } : {}),
  lines: v.lines,
  ...(v.amountsLocked ? {} : { amount: v.amount, vatAmount: v.vatAmount, totalAmount: v.totalAmount }),
});

/**
 * Demande de création (GraphQL `createInvoice`). Jamais de `name` : le numéro
 * est attribué par le serveur. `project` relie la facture à son projet.
 */
export const toInvoiceCreate = (v: InvoiceEditorValues, projectDocumentId?: string | null): CreateInvoiceRequest => ({
  customer: { documentId: v.customer?.documentId ?? '' } as Customer,
  orderItems: [],
  amount: v.amount,
  vatAmount: v.vatAmount,
  totalAmount: v.totalAmount,
  date: v.date,
  dueDate: v.dueDate,
  state: PAID_PAYMENT_STATES.includes(v.paymentState) ? 'fulfilled' : 'pending',
  paymentMethod: v.paymentMethod,
  paymentState: v.paymentState,
  paymentAmount: PAID_PAYMENT_STATES.includes(v.paymentState) ? v.totalAmount : 0,
  paymentReference: '',
  paymentDate: v.paymentDate as Date,
  lines: v.lines,
  ...(projectDocumentId ? { project: projectDocumentId } : {}),
});

/** Message lisible d'un échec d'enregistrement (refus serveur compris). */
export const invoiceSaveError = (err: unknown): string => {
  const message = (err as { message?: string })?.message ?? '';
  return message && !/^Request failed|status code/i.test(message)
    ? message
    : "La facture n'a pas pu être enregistrée. Réessayez.";
};

type Props = {
  mode: 'create' | 'edit';
  /** Modification : la facture telle que l'écran la connaît (relue au serveur à l'ouverture). */
  invoice?: Invoice | null;
  /** Création : client, projet et lignes proposés. */
  draft?: InvoiceDraft | null;
  /** Création depuis la liste : le client se choisit ici. */
  customerSelectable?: boolean;
  saving: boolean;
  onClose: () => void;
  /** Persiste ; `true` = enregistré (l'éditeur se ferme côté appelant). */
  onSubmit: (values: InvoiceEditorValues) => Promise<boolean>;
};

// ─── Lignes éditables ────────────────────────────────────────────────────────

type Row = {
  key: string;
  label: string;
  details: string;
  quantity: string;
  unitPrice: string;
  kind?: InvoiceLineKind;
  /** Total d'origine, conservé tant que quantité et P.U. ne sont pas retouchés (le total fait foi). */
  fixedTotal: number | null;
};

let rowSeq = 0;
const nextKey = () => `row-${++rowSeq}`;
const toInput = (n: number): string => (Number.isFinite(n) ? String(n).replace('.', ',') : '');
const parseNum = (s: string): number => {
  const t = s.replace(/[\s  ]/g, '').replace(',', '.');
  return t === '' ? NaN : Number(t);
};
const toRow = (l: InvoiceLine): Row => ({
  key: nextKey(),
  label: l.label,
  details: l.details ?? '',
  quantity: toInput(l.quantity),
  unitPrice: toInput(l.unitPrice),
  kind: l.kind,
  fixedTotal: l.total,
});
const emptyRow = (): Row => ({ key: nextKey(), label: '', details: '', quantity: '1', unitPrice: '', fixedTotal: null });

const rowTotal = (r: Row): number => {
  if (r.fixedTotal != null) return r.fixedTotal;
  const q = parseNum(r.quantity);
  const pu = parseNum(r.unitPrice);
  return Number.isFinite(q) && Number.isFinite(pu) ? round2(q * pu) : 0;
};

const rowsToLines = (rows: Row[]) =>
  rows.map((r) => ({
    label: r.label,
    details: r.details,
    quantity: parseNum(r.quantity),
    unitPrice: parseNum(r.unitPrice),
    total: rowTotal(r),
    ...(r.kind ? { kind: r.kind } : {}),
  }));

// ─── Styles ──────────────────────────────────────────────────────────────────

const css = `
@keyframes pegInvFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes pegInvUp { from { opacity: 0; transform: translateY(32px) scale(.98) } to { opacity: 1; transform: none } }
.peg-inv-input { width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 9px 12px; color: #fff; font-size: 13px; font-family: Inter, sans-serif; outline: none; transition: border-color .15s, background .15s; }
.peg-inv-input:focus { border-color: rgba(91,60,245,0.7); background: rgba(255,255,255,0.07); }
.peg-inv-input:disabled { opacity: .55; cursor: not-allowed; }
.peg-inv-input.peg-inv-sub { font-size: 12px; padding: 7px 12px; color: rgba(255,255,255,0.75); }
.peg-inv-input.peg-inv-num { text-align: right; font-variant-numeric: tabular-nums; }
.peg-inv-grid { display: grid; grid-template-columns: minmax(0,1fr) 84px 116px 116px 36px; gap: 10px; align-items: start; }
.peg-inv-row { padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.peg-inv-head { padding: 0 0 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.peg-inv-head span { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.4); }
.peg-inv-total { padding-top: 9px; text-align: right; font-size: 13px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.peg-inv-mlabel { display: none; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.peg-inv-desc { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.peg-inv-del { width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.06); color: #f87171; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.peg-inv-del:disabled { opacity: .3; cursor: not-allowed; }
@media (max-width: 767px) {
  .peg-inv-head { display: none; }
  .peg-inv-grid { grid-template-columns: 1fr 1fr 1fr 36px; }
  .peg-inv-row { padding: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.02); }
  .peg-inv-desc { grid-column: 1 / -1; }
  .peg-inv-mlabel { display: block; }
  .peg-inv-total { padding-top: 0; text-align: left; line-height: 36px; }
  .peg-inv-del { align-self: end; }
}
`;

const labelStyle: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.02em' };
const sep: React.CSSProperties = { height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', margin: '22px 0' };
const notice = (tone: 'info' | 'lock' | 'warn'): React.CSSProperties => {
  const c = tone === 'lock' ? ['rgba(251,191,36,0.08)', 'rgba(251,191,36,0.3)', '#fcd34d'] : tone === 'warn' ? ['rgba(239,68,68,0.08)', 'rgba(239,68,68,0.3)', '#fca5a5'] : ['rgba(91,60,245,0.1)', 'rgba(124,107,255,0.35)', '#c4b5fd'];
  return { display: 'flex', gap: 10, alignItems: 'flex-start', background: c[0], border: `1px solid ${c[1]}`, color: c[2], borderRadius: 12, padding: '10px 14px', fontSize: 13, lineHeight: 1.45, marginBottom: 16 };
};

// ─── Composant ───────────────────────────────────────────────────────────────

export default function ModalInvoiceEditor({ mode, invoice, draft, customerSelectable, saving, onClose, onSubmit }: Props) {
  const isCreate = mode === 'create';
  const [doc, setDoc] = useState<Invoice | null>(isCreate ? null : invoice ?? null);
  const [loadingDoc, setLoadingDoc] = useState(!isCreate);
  const [linesSupported, setLinesSupported] = useState(true);
  const [derived, setDerived] = useState(false);

  const [customer, setCustomer] = useState<InvoiceDraft['customer']>(draft?.customer ?? null);
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);
  const [rows, setRows] = useState<Row[]>(() => (draft?.lines?.length ? draft.lines.map(toRow) : [emptyRow()]));
  const [vatEnabled, setVatEnabled] = useState(true);
  const [state, setState] = useState('pending');
  const [date, setDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(dayjs().add(30, 'day').toDate());
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentState, setPaymentState] = useState('pending');
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstInput = useRef<HTMLInputElement | null>(null);

  // Modification : facture complète relue au serveur (lignes, projet).
  useEffect(() => {
    let alive = true;
    const init = (inv: Invoice) => {
      const resolved = resolveInvoiceLines(inv);
      setRows(resolved.lines.map(toRow));
      setDerived(resolved.source === 'derived');
      setVatEnabled(appliedVatRate(inv) > 0);
      setState(inv.state || 'pending');
      setDate(inv.date ? dayjs(inv.date).toDate() : new Date());
      setDueDate(inv.dueDate ? dayjs(inv.dueDate).toDate() : dayjs().add(30, 'day').toDate());
      setPaymentMethod(inv.paymentMethod || 'transfer');
      setPaymentState(inv.paymentState || 'pending');
      const pd = inv.paymentDate ? dayjs(inv.paymentDate) : null;
      setPaymentDate(pd && pd.year() > 1970 ? pd.toDate() : null);
      setCustomer(inv.customer ? { documentId: inv.customer.documentId, name: inv.customer.name } : null);
    };
    if (isCreate) {
      probeInvoiceLinesSupport().then((ok) => alive && setLinesSupported(ok));
      return () => { alive = false; };
    }
    if (!invoice) return;
    init(invoice);
    apiGetInvoiceDocument(invoice.documentId)
      .then((full) => {
        if (!alive || !full) return;
        setDoc(full);
        init(full);
      })
      .catch((err) => console.warn('[InvoiceEditor] Relecture impossible, édition depuis la liste :', err))
      .finally(() => {
        if (!alive) return;
        setLinesSupported(isInvoiceLinesSupported());
        setLoadingDoc(false);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreate, invoice?.documentId]);

  // Création depuis la liste : choix du client.
  useEffect(() => {
    if (!isCreate || !customerSelectable) return;
    apiGetCustomers({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })
      .then((res) => {
        const nodes = res.data?.data?.customers_connection?.nodes ?? [];
        setCustomerOptions(
          nodes
            .filter((c) => c?.documentId)
            .map((c) => ({ value: c.documentId, label: c.name || 'Client sans nom' }))
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
        );
      })
      .catch(() => toast.error('Liste des clients indisponible'));
  }, [isCreate, customerSelectable]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const amountsLocked = !isCreate && isInvoicePaid(doc);
  const vatRate = vatEnabled ? TVA_RATE : 0;
  const computed = useMemo(() => totalsFromLines(rows.map((r) => ({ total: rowTotal(r) } as InvoiceLine)), vatRate), [rows, vatRate]);
  // Facture encaissée : on montre les montants enregistrés (ils ne bougent pas).
  const totals = amountsLocked && doc
    ? { amount: Number(doc.amount) || 0, vatAmount: Number(doc.vatAmount) || 0, totalAmount: Number(doc.totalAmount) || 0 }
    : computed;

  const updateRow = (key: string, patch: Partial<Row>, amountsChanged = false) => {
    setError(null);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch, ...(amountsChanged ? { fixedTotal: null } : {}) } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (key: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const onPaymentStateChange = (value: string) => {
    setPaymentState(value);
    if (PAID_PAYMENT_STATES.includes(value)) {
      setState('fulfilled');
      if (!paymentDate) setPaymentDate(new Date());
    } else if (state === 'fulfilled') {
      setState('pending');
    }
  };

  const submit = async () => {
    if (saving) return;
    if (isCreate && !customer?.documentId) return setError('Choisissez le client à facturer.');
    const { lines, error: linesError } = validateInvoiceLines(rowsToLines(rows));
    if (linesError) return setError(linesError);
    const totalsNow = amountsLocked ? totals : totalsFromLines(lines, vatRate);
    if (totalsNow.amount <= 0) return setError('Le total HT de la facture doit être supérieur à zéro.');
    setError(null);
    const ok = await onSubmit({
      customer,
      state,
      date,
      dueDate,
      paymentMethod,
      paymentState,
      paymentDate: PAID_PAYMENT_STATES.includes(paymentState) ? paymentDate ?? new Date() : null,
      lines,
      amount: totalsNow.amount,
      vatAmount: totalsNow.vatAmount,
      totalAmount: totalsNow.totalAmount,
      amountsLocked,
    });
    if (!ok) firstInput.current?.focus();
  };

  const projectName = isCreate ? draft?.project?.name : doc?.project?.name;
  const paid = PAID_PAYMENT_STATES.includes(paymentState);
  const stateOptions = paid ? stateData.filter(({ value }) => value === 'fulfilled') : stateData;

  return (
    <>
      <style>{css}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isCreate ? 'Nouvelle facture' : `Facture ${doc?.name ?? ''}`}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pegInvFade .25s ease-out' }}
        onClick={() => !saving && onClose()}
      >
        <div
          className="peg-pad-mobile peg-full-mobile"
          style={{ background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)', borderRadius: 20, padding: 32, width: '95%', maxWidth: 1040, maxHeight: '92dvh', overflowY: 'auto', position: 'relative', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', animation: 'pegInvUp .3s ease-out', fontFamily: 'Inter, sans-serif' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── En-tête ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                {isCreate ? 'Nouvelle facture' : `Facture ${doc?.name ?? ''}`}
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {isCreate
                  ? 'Vérifiez les lignes : le numéro FAC-XXXX est attribué à l’émission, et une facture émise ne se supprime plus (elle s’annule).'
                  : [customer?.name, projectName ? `Projet : ${projectName}` : null].filter(Boolean).join(' · ')}
              </p>
              {isCreate && projectName ? (
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#c4b5fd', fontWeight: 600 }}>Projet : {projectName}</p>
              ) : null}
            </div>
            <button onClick={onClose} disabled={saving} className="peg-tap-target" aria-label="Fermer"
              style={{ flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
              <HiX size={20} />
            </button>
          </div>

          {/* ── Client (création depuis la liste) ── */}
          {isCreate && customerSelectable ? (
            <div style={{ marginBottom: 20, maxWidth: 420 }}>
              <div style={labelStyle}>Client facturé</div>
              <Select
                placeholder="Choisir un client…"
                options={customerOptions}
                value={customer ? { value: customer.documentId, label: customer.name ?? '' } : null}
                noOptionsMessage={() => 'Aucun client'}
                onChange={(opt: any) => { setError(null); setCustomer(opt ? { documentId: opt.value, name: opt.label } : null); }}
              />
            </div>
          ) : isCreate ? (
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#fff', fontWeight: 600 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Client facturé : </span>{customer?.name ?? '—'}
            </p>
          ) : null}

          {/* ── Dates & règlement ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 6 }}>
            <div>
              <div style={labelStyle}>Date d’émission</div>
              <DatePicker value={date} inputFormat="DD/MM/YYYY" inputPrefix={<HiOutlineCalendar style={{ fontSize: 18 }} />}
                onChange={(d: Date | null) => d && setDate(dayjs(d).toDate())} />
            </div>
            <div>
              <div style={labelStyle}>Échéance</div>
              <DatePicker value={dueDate} inputFormat="DD/MM/YYYY" inputPrefix={<HiOutlineCalendar style={{ fontSize: 18 }} />}
                onChange={(d: Date | null) => d && setDueDate(dayjs(d).toDate())} />
            </div>
            <div>
              <div style={labelStyle}>Mode de paiement</div>
              <Select options={paymentModeData} value={paymentModeData.find((o) => o.value === paymentMethod) ?? null}
                onChange={(o: any) => setPaymentMethod(o?.value || 'transfer')} />
            </div>
            <div>
              <div style={labelStyle}>Paiement</div>
              <Select options={paymentStateData} value={paymentStateData.find((o) => o.value === paymentState) ?? null}
                onChange={(o: any) => onPaymentStateChange(o?.value || 'pending')} />
            </div>
            {paid ? (
              <div>
                <div style={labelStyle}>Payée le</div>
                <DatePicker value={paymentDate ?? new Date()} inputFormat="DD/MM/YYYY" inputPrefix={<HiOutlineCalendar style={{ fontSize: 18 }} />}
                  onChange={(d: Date | null) => d && setPaymentDate(dayjs(d).toDate())} />
              </div>
            ) : null}
            {!isCreate ? (
              <div>
                <div style={labelStyle}>Statut</div>
                <Select options={stateOptions} value={stateData.find((o) => o.value === state) ?? null}
                  onChange={(o: any) => setState(o?.value || 'pending')} />
              </div>
            ) : null}
          </div>

          <div style={sep} />

          {/* ── Lignes ── */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Lignes de la facture</h3>
            {loadingDoc ? <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Chargement…</span> : null}
          </div>

          {amountsLocked ? (
            <div style={notice('lock')}>
              <HiLockClosed size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Facture encaissée : les montants sont figés. Vous pouvez corriger les désignations et les détails ; pour changer un montant, établissez un avoir.</span>
            </div>
          ) : null}
          {!isCreate && derived && linesSupported && !loadingDoc ? (
            <div style={notice('info')}>
              <HiInformationCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Facture émise avant l’enregistrement des lignes : elles sont reconstituées depuis sa commande ou son projet. Vérifiez-les puis enregistrez pour les figer sur la facture.</span>
            </div>
          ) : null}
          {!linesSupported ? (
            <div style={notice('warn')}>
              <HiInformationCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Le serveur n’enregistre pas encore les lignes (mise à jour en attente) : seuls les montants seront conservés, le PDF reconstituera les lignes.</span>
            </div>
          ) : null}

          <div className="peg-inv-grid peg-inv-head">
            <span>Désignation</span>
            <span style={{ textAlign: 'right' }}>Qté</span>
            <span style={{ textAlign: 'right' }}>P.U. HT</span>
            <span style={{ textAlign: 'right' }}>Total HT</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div key={r.key} className="peg-inv-grid peg-inv-row">
              <div className="peg-inv-desc">
                <input ref={i === 0 ? firstInput : undefined} className="peg-inv-input" value={r.label} placeholder="Désignation (ex. Tee-shirt brodé cœur)"
                  aria-label={`Désignation ligne ${i + 1}`} maxLength={200}
                  onChange={(e) => updateRow(r.key, { label: e.target.value })} />
                <input className="peg-inv-input peg-inv-sub" value={r.details} placeholder="Détail : tailles, coloris, dimensions… (facultatif)"
                  aria-label={`Détail ligne ${i + 1}`} maxLength={1000}
                  onChange={(e) => updateRow(r.key, { details: e.target.value })} />
              </div>
              <div>
                <div className="peg-inv-mlabel">Qté</div>
                <input className="peg-inv-input peg-inv-num" inputMode="decimal" value={r.quantity} disabled={amountsLocked}
                  aria-label={`Quantité ligne ${i + 1}`}
                  onChange={(e) => updateRow(r.key, { quantity: e.target.value }, true)} />
              </div>
              <div>
                <div className="peg-inv-mlabel">P.U. HT</div>
                <input className="peg-inv-input peg-inv-num" inputMode="decimal" value={r.unitPrice} placeholder="0,00" disabled={amountsLocked}
                  aria-label={`Prix unitaire HT ligne ${i + 1}`}
                  onChange={(e) => updateRow(r.key, { unitPrice: e.target.value }, true)} />
              </div>
              <div>
                <div className="peg-inv-mlabel">Total HT</div>
                <div className="peg-inv-total" style={{ color: rowTotal(r) < 0 ? '#86efac' : '#fff' }}>{fmtPrice(rowTotal(r))}</div>
              </div>
              <button type="button" className="peg-inv-del" onClick={() => removeRow(r.key)} disabled={amountsLocked || rows.length <= 1}
                title="Supprimer la ligne" aria-label={`Supprimer la ligne ${i + 1}`}>
                <HiTrash size={15} />
              </button>
            </div>
          ))}

          {!amountsLocked ? (
            <button type="button" onClick={addRow}
              style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: '1px dashed rgba(124,107,255,0.5)', background: 'rgba(91,60,245,0.08)', color: '#c4b5fd', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <HiPlus size={15} /> Ajouter une ligne
            </button>
          ) : null}

          <div style={sep} />

          {/* ── Totaux ── */}
          <div className="peg-stack-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8, opacity: amountsLocked ? 0.5 : 1 }}>
              <Switcher checked={vatEnabled} disabled={amountsLocked} onChange={(checked: boolean) => setVatEnabled(checked)} />
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                TVA {Math.round(TVA_RATE * 100)} %
                <span style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>À désactiver pour un client exonéré (UE autoliquidée, hors UE).</span>
              </span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 14, padding: '18px 24px', border: '1px solid rgba(255,255,255,0.06)', minWidth: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Total HT</span>
                <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{fmtPrice(totals.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>TVA {vatEnabled ? `${Math.round(TVA_RATE * 100)} %` : '0 %'}</span>
                <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{fmtPrice(totals.vatAmount)}</span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>Total TTC</span>
                <span style={{ fontSize: 16, color: '#a78bfa', fontWeight: 800 }}>{fmtPrice(totals.totalAmount)}</span>
              </div>
            </div>
          </div>

          {error ? (
            <div role="alert" style={{ ...notice('warn'), marginTop: 18, marginBottom: 0 }}>
              <HiInformationCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          ) : null}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button onClick={onClose} disabled={saving}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 22px', color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiX size={16} /> Annuler
            </button>
            <button onClick={submit} disabled={saving || loadingDoc}
              style={{ background: saving || loadingDoc ? 'rgba(91,60,245,0.35)' : 'linear-gradient(135deg, #6d5dfc, #4f3ae0)', border: 'none', borderRadius: 12, padding: '10px 26px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving || loadingDoc ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: saving ? 'none' : '0 4px 15px rgba(91,60,245,0.35)' }}>
              <HiCheck size={18} />
              {saving ? 'Enregistrement…' : isCreate ? 'Émettre la facture' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
