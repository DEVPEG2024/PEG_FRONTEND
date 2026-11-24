/**
 * Facture PDF (react-pdf) — document remis au client.
 *
 * Les lignes viennent de la facture elle-même (`invoice.lines`, figées à
 * l'émission) ; une facture antérieure aux lignes les voit reconstituées
 * depuis ses commandes ou son projet (utils/invoiceLines.ts). Le tableau
 * retombe toujours sur le « Total HT » : livraison, remises et ajustements
 * sont des lignes, pas des écarts muets.
 *
 * ⚠️ Polices standard PDF (Helvetica, encodage WinAnsi) : accents, « € », « × »
 * et « — » passent ; PAS l'espace fine insécable (U+202F) que produit
 * `toLocaleString('fr-FR')` pour les milliers → formats maison ci-dessous.
 */

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import { Invoice } from '@/@types/invoice';
import { countries } from '@/constants/countries.constant';
import { appliedVatRate, InvoiceLine, isInvoicePaid, resolveInvoiceLines } from '@/utils/invoiceLines';
import { paymentModeData } from '../constants';

// ─── Émetteur ────────────────────────────────────────────────────────────────
const ISSUER = {
  name: 'NOVA 2.0',
  address: '3 rue du Bois Arquet',
  city: '74140 Douvaine',
  country: 'France',
  email: 'contact@hellonova.fr',
  siret: '943 335 760 00014',
  vat: 'FR88943335760',
  iban: 'FR76 1679 8000 0100 0178 1163 397',
  bic: 'TRZOFR21XXX',
};

// ─── Régimes de TVA ──────────────────────────────────────────────────────────
// France → TVA 20 % ; UE hors France → autoliquidation ; hors UE → exportation.
// (La Suisse n'est PAS de l'autoliquidation intracommunautaire — cas courant ici, Genève.)
const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR',
  'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

export type VatRegime = 'domestic' | 'intracom' | 'export';

export const resolveVatRegime = (country?: string | null): VatRegime => {
  const c = (country || 'FR').toUpperCase();
  if (c === 'FR') return 'domestic';
  return EU_COUNTRIES.has(c) ? 'intracom' : 'export';
};

const VAT_LEGAL_MENTION: Record<Exclude<VatRegime, 'domestic'>, string> = {
  intracom: 'Autoliquidation de la TVA — article 283-2 du CGI.',
  export: 'Exonération de TVA — article 262 I du CGI (exportation hors UE).',
};

// ─── Formats (compatibles polices standard PDF) ──────────────────────────────
const group = (int: string): string => int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const pdfMoney = (value: unknown): string => {
  const n = Number(value);
  const safe = Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  const [int, dec] = Math.abs(safe).toFixed(2).split('.');
  return `${safe < 0 ? '-' : ''}${group(int)},${dec} €`;
};

export const pdfQuantity = (value: unknown): string => {
  const n = Number(value) || 0;
  const rounded = Math.round(n * 1000) / 1000;
  const [int, dec] = String(rounded).split('.');
  return dec ? `${group(int)},${dec}` : group(int);
};

const pdfDate = (d: unknown): string => (d ? dayjs(d as string).format('DD/MM/YYYY') : '—');

/** Pays en français (« Suisse », pas « Switzerland ») ; liste de l'app en repli. */
const countryName = (code?: string | null): string | undefined => {
  if (!code) return undefined;
  try {
    const name = new Intl.DisplayNames(['fr'], { type: 'region' }).of(code.toUpperCase());
    if (name && name !== code.toUpperCase()) return name;
  } catch { /* moteur sans Intl.DisplayNames */ }
  return countries.find((c) => c.value === code)?.label;
};

const percent = (rate: number): string => `${String(Math.round(rate * 1000) / 10).replace('.', ',')} %`;

// ─── Document ────────────────────────────────────────────────────────────────
export const InvoicePDF = ({ invoice, logoUrl }: { invoice: Invoice; logoUrl?: string }) => {
  const customer = invoice?.customer;
  const info = customer?.companyInformations;
  const { lines } = resolveInvoiceLines(invoice);

  const amountHT = Number(invoice?.amount) || 0;
  const vatAmount = Number(invoice?.vatAmount) || 0;
  const totalTTC = Number(invoice?.totalAmount) || amountHT + vatAmount;
  // La TVA affichée est celle réellement facturée : un client hors de France
  // réglé TTC par carte reste une facture TTC. La mention d'exonération ne vaut
  // que pour une facture SANS TVA à un client de l'UE (autoliquidation) ou hors UE.
  const vatRate = appliedVatRate(invoice);
  const hasVat = vatAmount > 0.004;
  const regime = resolveVatRegime(info?.country);
  const exemptRegime = !hasVat && regime !== 'domestic' ? regime : null;

  const canceled = invoice?.state === 'canceled';
  const paid = isInvoicePaid(invoice);
  const paymentLabel = paymentModeData.find((m) => m.value === invoice?.paymentMethod)?.label ?? '—';
  const countryLabel = countryName(info?.country);
  const cityLine = [info?.zipCode, info?.city].filter(Boolean).join(' ');
  const projectName = invoice?.project?.name?.trim();

  const vatLabel = (): string => {
    if (hasVat) return `TVA ${percent(vatRate)}`;
    if (exemptRegime === 'intracom') return 'TVA autoliquidée';
    if (exemptRegime === 'export') return 'TVA non applicable';
    return 'TVA 0 %';
  };
  const lineVat = hasVat ? percent(vatRate) : exemptRegime ? '—' : '0 %';

  return (
    <Document title={`Facture ${invoice?.name ?? ''}`} author={ISSUER.name} language="fr">
      <Page size="A4" style={s.page}>
        {/* ── En-tête ── */}
        <View style={s.header}>
          <View style={s.issuer}>
            {logoUrl ? <Image src={logoUrl} style={s.logo} /> : <Text style={s.issuerName}>{ISSUER.name}</Text>}
            <Text style={s.issuerStrong}>{ISSUER.name}</Text>
            <Text style={s.muted}>{ISSUER.address}</Text>
            <Text style={s.muted}>{`${ISSUER.city} — ${ISSUER.country}`}</Text>
            <Text style={s.muted}>{ISSUER.email}</Text>
          </View>
          <View style={s.titleBlock}>
            <Text style={s.title}>FACTURE</Text>
            <Text style={s.number}>{invoice?.name ? `N° ${invoice.name}` : 'N° attribué à l’émission'}</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date d’émission</Text>
              <Text style={s.metaValue}>{pdfDate(invoice?.date)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Échéance</Text>
              <Text style={s.metaValue}>{pdfDate(invoice?.dueDate)}</Text>
            </View>
            {projectName ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Projet</Text>
                <Text style={s.metaValue}>{projectName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {canceled ? (
          <View style={s.canceled}>
            <Text style={s.canceledText}>FACTURE ANNULÉE — ce document n’est plus exigible.</Text>
          </View>
        ) : null}

        {/* ── Client / règlement ── */}
        <View style={s.parties}>
          <View style={[s.partyBox, { marginRight: 12 }]}>
            <Text style={s.boxLabel}>FACTURÉ À</Text>
            <Text style={s.partyName}>{customer?.name || '—'}</Text>
            {info?.address ? <Text style={s.partyLine}>{info.address}</Text> : null}
            {cityLine ? <Text style={s.partyLine}>{cityLine}</Text> : null}
            {countryLabel ? <Text style={s.partyLine}>{countryLabel}</Text> : null}
            {info?.vatNumber ? (
              <Text style={s.partyId}>{`${regime === 'export' ? 'N° TVA' : 'TVA intracom.'} : ${info.vatNumber}`}</Text>
            ) : null}
            {info?.siretNumber ? <Text style={s.partyId}>{`SIRET : ${info.siretNumber}`}</Text> : null}
          </View>
          <View style={s.partyBox}>
            <Text style={s.boxLabel}>RÈGLEMENT</Text>
            <View style={s.kv}>
              <Text style={s.kvLabel}>Mode</Text>
              <Text style={s.kvValue}>{paymentLabel}</Text>
            </View>
            <View style={s.kv}>
              <Text style={s.kvLabel}>Statut</Text>
              <Text style={[s.kvValue, paid ? s.ok : canceled ? s.muted : s.due]}>
                {canceled
                  ? 'Annulée'
                  : paid
                    ? `Acquittée${invoice?.paymentDate && dayjs(invoice.paymentDate).year() > 1970 ? ` le ${pdfDate(invoice.paymentDate)}` : ''}`
                    : invoice?.paymentState === 'pending_transfer'
                      ? 'Virement annoncé, en cours de réception'
                      : `À régler avant le ${pdfDate(invoice?.dueDate)}`}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Lignes ── */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.colLabel]}>Désignation</Text>
            <Text style={[s.th, s.colQty]}>Qté</Text>
            <Text style={[s.th, s.colUnit]}>P.U. HT</Text>
            <Text style={[s.th, s.colVat]}>TVA</Text>
            <Text style={[s.th, s.colTotal]}>Total HT</Text>
          </View>
          {lines.map((line: InvoiceLine, i: number) => (
            <View key={i} style={[s.row, i === lines.length - 1 ? s.rowLast : {}]} wrap={false}>
              <View style={s.colLabel}>
                <Text style={s.lineLabel}>{line.label}</Text>
                {line.details ? <Text style={s.lineDetails}>{line.details}</Text> : null}
              </View>
              <Text style={[s.td, s.colQty]}>{pdfQuantity(line.quantity)}</Text>
              <Text style={[s.td, s.colUnit]}>{pdfMoney(line.unitPrice)}</Text>
              <Text style={[s.td, s.colVat]}>{lineVat}</Text>
              <Text style={[s.td, s.colTotal, s.strong]}>{pdfMoney(line.total)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totaux ── */}
        <View style={s.totalsRow} wrap={false}>
          <View style={s.totalsNote}>
            {exemptRegime ? <Text style={s.legalNote}>{VAT_LEGAL_MENTION[exemptRegime]}</Text> : null}
          </View>
          <View style={s.totals}>
            <View style={s.totalLine}>
              <Text style={s.totalLabel}>Total HT</Text>
              <Text style={s.totalValue}>{pdfMoney(amountHT)}</Text>
            </View>
            <View style={s.totalLine}>
              <Text style={s.totalLabel}>{vatLabel()}</Text>
              <Text style={s.totalValue}>{pdfMoney(vatAmount)}</Text>
            </View>
            <View style={s.grandTotal}>
              <Text style={s.grandLabel}>{exemptRegime ? 'Net à payer' : 'Total TTC'}</Text>
              <Text style={s.grandValue}>{pdfMoney(hasVat ? totalTTC : amountHT)}</Text>
            </View>
          </View>
        </View>

        {/* ── Paiement ── */}
        {!paid && !canceled ? (
          <View style={s.payment} wrap={false}>
            <Text style={s.boxLabel}>COORDONNÉES BANCAIRES</Text>
            <View style={s.bankRow}>
              <Text style={s.bankItem}>{`IBAN : ${ISSUER.iban}`}</Text>
              <Text style={s.bankItem}>{`BIC : ${ISSUER.bic}`}</Text>
            </View>
            <Text style={[s.boxLabel, { marginTop: 10 }]}>CONDITIONS DE PAIEMENT</Text>
            <Text style={s.conditions}>
              Un acompte de 50 % du montant total TTC est exigé à la validation de la commande afin de la confirmer et de lancer la production. Le solde de 50 % est payable à la fin du chantier, à réception des travaux ou avant la livraison des produits. La commande n’est ferme et définitive qu’à réception de l’acompte.
            </Text>
          </View>
        ) : null}

        {/* ── Pied de page légal (chaque page) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerStrong}>{`${ISSUER.name} — SIRET ${ISSUER.siret} — TVA ${ISSUER.vat}`}</Text>
          <Text style={s.footerText}>
            Pas d’escompte en cas de paiement anticipé. Pénalités de retard : trois fois le taux d’intérêt légal. Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40,00 €.
          </Text>
          <Text style={s.footerText}>
            Réserve de propriété : nous nous réservons la propriété des marchandises jusqu’au paiement intégral du prix par l’acheteur ; notre droit de revendication porte aussi sur leur prix si elles ont déjà été revendues (loi du 12 mai 1980).
          </Text>
          <Text
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) => `${invoice?.name ?? ''}  ·  Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const INK = '#111827';
const MUTED = '#6b7280';
const RULE = '#e5e7eb';
const ACCENT = '#5b3cf5';
const ACCENT_SOFT = '#f1edff';

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingHorizontal: 40, paddingBottom: 96, fontFamily: 'Helvetica', fontSize: 9, color: INK },
  strong: { fontFamily: 'Helvetica-Bold' },
  muted: { color: MUTED, fontSize: 8.5, marginTop: 1.5 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  issuer: { width: '50%' },
  logo: { width: 104, height: 51, marginBottom: 6, marginLeft: -8 },
  issuerName: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: ACCENT, marginBottom: 6 },
  issuerStrong: { fontFamily: 'Helvetica-Bold', fontSize: 10 },
  titleBlock: { width: '45%', alignItems: 'flex-end' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 24, color: ACCENT, letterSpacing: 2 },
  number: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginTop: 4, marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2.5 },
  metaLabel: { color: MUTED, width: 90, textAlign: 'right', marginRight: 8 },
  metaValue: { fontFamily: 'Helvetica-Bold', maxWidth: 150, textAlign: 'right' },

  canceled: { borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fef2f2', borderRadius: 4, padding: 7, marginBottom: 14 },
  canceledText: { color: '#b91c1c', fontFamily: 'Helvetica-Bold', textAlign: 'center' },

  parties: { flexDirection: 'row', marginBottom: 18 },
  partyBox: { flex: 1, borderWidth: 1, borderColor: RULE, borderRadius: 6, padding: 12 },
  boxLabel: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: ACCENT, letterSpacing: 1, marginBottom: 6 },
  partyName: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 3 },
  partyLine: { marginTop: 1.5 },
  partyId: { color: MUTED, fontSize: 8, marginTop: 3 },
  kv: { flexDirection: 'row', marginTop: 3 },
  kvLabel: { color: MUTED, width: 44 },
  kvValue: { flex: 1, fontFamily: 'Helvetica-Bold' },
  ok: { color: '#047857' },
  due: { color: '#b45309' },

  table: { borderWidth: 1, borderColor: RULE, borderRadius: 6 },
  thead: { flexDirection: 'row', backgroundColor: ACCENT_SOFT, borderTopLeftRadius: 6, borderTopRightRadius: 6, paddingVertical: 7, paddingHorizontal: 10 },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: ACCENT, letterSpacing: 0.4 },
  row: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: RULE, alignItems: 'flex-start' },
  rowLast: { borderBottomWidth: 0 },
  td: { fontSize: 9 },
  colLabel: { flex: 1, paddingRight: 8 },
  colQty: { width: 46, textAlign: 'right' },
  colUnit: { width: 72, textAlign: 'right' },
  colVat: { width: 40, textAlign: 'right' },
  colTotal: { width: 78, textAlign: 'right' },
  lineLabel: { fontFamily: 'Helvetica-Bold', fontSize: 9.5 },
  lineDetails: { color: MUTED, fontSize: 8, marginTop: 2, lineHeight: 1.35 },

  totalsRow: { flexDirection: 'row', marginTop: 14 },
  totalsNote: { flex: 1, paddingRight: 16, justifyContent: 'flex-end' },
  legalNote: { fontSize: 8, color: MUTED, fontFamily: 'Helvetica-Oblique' },
  totals: { width: 220 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 10 },
  totalLabel: { color: MUTED },
  totalValue: { fontFamily: 'Helvetica-Bold' },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: ACCENT, borderRadius: 5 },
  grandLabel: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 10.5 },
  grandValue: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 10.5 },

  payment: { marginTop: 22, borderWidth: 1, borderColor: RULE, borderRadius: 6, padding: 12 },
  bankRow: { flexDirection: 'row' },
  bankItem: { fontFamily: 'Helvetica-Bold', marginRight: 24 },
  conditions: { color: MUTED, fontSize: 7.5, lineHeight: 1.45 },

  footer: { position: 'absolute', left: 40, right: 40, bottom: 24, borderTopWidth: 1, borderTopColor: RULE, paddingTop: 6 },
  footerStrong: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, textAlign: 'center', color: MUTED },
  footerText: { fontSize: 6, textAlign: 'center', color: MUTED, marginTop: 2, lineHeight: 1.3 },
  pageNumber: { fontSize: 6.5, textAlign: 'right', color: MUTED, marginTop: 3 },
});

export default InvoicePDF;
