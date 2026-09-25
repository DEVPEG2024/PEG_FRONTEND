import type {
  CampaignAudience,
  CampaignInput,
  CampaignRecipient,
  CampaignStatus,
  CampaignTag,
  OpenChannel,
} from '@/@types/campaign';

/**
 * Campagnes clients — règles d'affichage partagées (admin, pop-up, Actualités).
 * Fonctions pures : testées dans src/__tests__/campaignFormat.test.ts.
 * Le serveur applique les mêmes règles (peg_strapi `campaign-text.ts`).
 */

export const TAG_META: Record<CampaignTag, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  info: { label: 'Information', color: '#60a5fa', bg: 'rgba(96,165,250,0.14)', border: 'rgba(96,165,250,0.35)', emoji: '📣' },
  nouveaute: { label: 'Nouveauté', color: '#4ade80', bg: 'rgba(74,222,128,0.14)', border: 'rgba(74,222,128,0.35)', emoji: '✨' },
  promotion: { label: 'Promotion', color: '#f472b6', bg: 'rgba(244,114,182,0.14)', border: 'rgba(244,114,182,0.35)', emoji: '🏷️' },
  important: { label: 'Important', color: '#f87171', bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.35)', emoji: '⚠️' },
};
export const CAMPAIGN_TAGS = Object.keys(TAG_META) as CampaignTag[];

export const STATUS_META: Record<CampaignStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'rgba(255,255,255,0.6)' },
  scheduled: { label: 'Programmée', color: '#fbbf24' },
  sending: { label: 'Envoi en cours', color: '#60a5fa' },
  sent: { label: 'Envoyée', color: '#4ade80' },
  canceled: { label: 'Annulée', color: 'rgba(255,255,255,0.45)' },
};

export const CHANNEL_LABELS: Record<OpenChannel, string> = {
  popup: 'Pop-up',
  bell: 'Cloche',
  feed: 'Actualités',
  email: 'E-mail',
};

export const LIMITS = { title: 120, message: 4000, images: 6, ctaLabel: 40 };

/** Raccourcis du bouton d'action (pages client existantes). */
export const CTA_PRESETS: { label: string; url: string }[] = [
  { label: 'Catalogue', url: '/customer/catalogue' },
  { label: 'Mes offres', url: '/customer/products' },
  { label: 'Demande de devis', url: '/customer/devis' },
  { label: 'Premium', url: '/customer/premium' },
  { label: 'Mes projets', url: '/common/projects' },
  { label: 'Parrainage', url: '/customer/referral' },
];

// ── Destination du bouton : produit / catégorie du catalogue ────────────────

/** Fiche produit et page de catégorie de l'espace client (routes existantes). */
export const productLink = (documentId: string) => `/customer/product/${documentId}`;
export const categoryLink = (documentId: string) => `/customer/catalogue/categories/${documentId}`;

export type CtaMode = 'preset' | 'product' | 'category' | 'custom' | 'none';

/** Reconnaît le type de destination d'un lien de bouton (pour réafficher l'éditeur). */
export function ctaTargetOf(url: string): { mode: CtaMode; id: string | null } {
  const u = (url || '').trim();
  if (!u) return { mode: 'none', id: null };
  if (CTA_PRESETS.some((p) => p.url === u)) return { mode: 'preset', id: null };
  const product = u.match(/^\/customer\/product\/([A-Za-z0-9_-]+)\/?$/);
  if (product) return { mode: 'product', id: product[1] };
  const category = u.match(/^\/customer\/catalogue\/categories\/([A-Za-z0-9_-]+)\/?$/);
  if (category) return { mode: 'category', id: category[1] };
  return { mode: 'custom', id: null };
}

export const emptyAudience = (): CampaignAudience => ({
  type: 'all', premium: 'any', categories: [], customers: [], users: [], label: '',
});

export const emptyCampaign = (): CampaignInput => ({
  title: '',
  message: '',
  tag: 'info',
  images: [],
  ctaLabel: '',
  ctaUrl: '',
  channelPopup: true,
  channelEmail: false,
  audience: emptyAudience(),
  expiresAt: null,
});

// ── Liens ────────────────────────────────────────────────────────────────────

/** Chemin interne du front (navigation dans l'app) — jamais « //hôte ». */
export const isInternalLink = (url: string) => url.startsWith('/') && !url.startsWith('//');

export function isSafeCtaUrl(url: string): boolean {
  const u = (url || '').trim();
  if (!u) return false;
  if (u.startsWith('/')) return !u.startsWith('//') && !/[\s\\]/.test(u);
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' && !!parsed.hostname;
  } catch {
    return false;
  }
}

// ── Message ──────────────────────────────────────────────────────────────────

export type MessageToken = { type: 'text' | 'bold' | 'link'; value: string };

/**
 * Texte saisi → paragraphes de jetons (texte, **gras**, liens https). Aucun HTML
 * n'est interprété : le rendu React échappe tout.
 * Les retours à la ligne simples restent dans les jetons texte (pre-line).
 */
export function parseMessage(text: string): MessageToken[][] {
  const paragraphs = (text || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.map((p) => {
    const tokens: MessageToken[] = [];
    const pushText = (value: string) => {
      if (!value) return;
      const re = /https:\/\/[^\s<]+/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(value))) {
        const trail = (m[0].match(/[.,;:!?)]+$/) || [''])[0];
        const url = trail ? m[0].slice(0, -trail.length) : m[0];
        if (m.index > last) tokens.push({ type: 'text', value: value.slice(last, m.index) });
        tokens.push({ type: 'link', value: url });
        last = m.index + url.length;
      }
      if (last < value.length) tokens.push({ type: 'text', value: value.slice(last) });
    };
    const boldRe = /\*\*([^*\n]+)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = boldRe.exec(p))) {
      pushText(p.slice(last, m.index));
      tokens.push({ type: 'bold', value: m[1] });
      last = m.index + m[0].length;
    }
    pushText(p.slice(last));
    return tokens;
  });
}

export function excerpt(text: string, max = 180): string {
  const flat = (text || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// ── Nombres et dates ─────────────────────────────────────────────────────────

/** 0.4237 → « 42 % » ; sous 10 %, une décimale (« 4,2 % »). */
export function pct(rate: number): string {
  const v = (Number(rate) || 0) * 100;
  const digits = v > 0 && v < 10 ? 1 : 0;
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
}

export const fmtInt = (n: number) => (Number(n) || 0).toLocaleString('fr-FR');

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** « aujourd'hui 14:05 », « hier 09:12 », sinon « 12 sept. 2026 ». */
export function fmtRelativeDay(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return `aujourd’hui ${time}`;
  if (diff === 1) return `hier ${time}`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Valeur d'un <input type="datetime-local"> (heure locale) ↔ ISO. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ── Destinataires ────────────────────────────────────────────────────────────

export type RecipientFilter = 'all' | 'opened' | 'unopened' | 'clicked';

export function filterRecipients(list: CampaignRecipient[], filter: RecipientFilter, search: string): CampaignRecipient[] {
  const q = search.trim().toLowerCase();
  return list.filter((r) => {
    if (filter === 'opened' && !r.openedAt) return false;
    if (filter === 'unopened' && r.openedAt) return false;
    if (filter === 'clicked' && !r.clickedAt) return false;
    if (!q) return true;
    return `${r.customerName} ${r.userName} ${r.userEmail}`.toLowerCase().includes(q);
  });
}

export const EMAIL_STATUS_LABELS: Record<string, string> = {
  sent: 'Envoyé',
  failed: 'Échec',
  optout: 'Désinscrit',
  noemail: 'Sans adresse',
  sandbox: 'Bac à sable',
  skipped: '—',
};

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  // « = + - @ » en tête : neutralisés (injection de formule dans Excel).
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Export CSV (séparateur « ; » pour Excel en français). */
export function recipientsToCsv(list: CampaignRecipient[]): string {
  const header = ['Client', 'Compte', 'E-mail', 'Reçu le', 'Ouvert le', 'Canal d’ouverture', 'Ouvertures', 'Cliqué le', 'Clics', 'E-mail'];
  const rows = list.map((r) => [
    r.customerName,
    r.userName,
    r.userEmail,
    fmtDateTime(r.receivedAt),
    r.openedAt ? fmtDateTime(r.openedAt) : '',
    r.openChannel ? CHANNEL_LABELS[r.openChannel] : '',
    r.openCount,
    r.clickedAt ? fmtDateTime(r.clickedAt) : '',
    r.clickCount,
    r.emailStatus ? EMAIL_STATUS_LABELS[r.emailStatus] || r.emailStatus : '',
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
}
