/**
 * Campagnes clients — l'admin notifie tous les clients ou une partie d'entre eux
 * (message, photos, bouton d'action) et suit ouvertures et clics.
 * Backend : peg_strapi `src/services/campaign.service.ts` (routes /api/campaigns/*).
 */

export type CampaignTag = 'info' | 'nouveaute' | 'promotion' | 'important';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'canceled';

/**
 * - `all`       : tous les clients
 * - `segment`   : Premium / Standard × secteurs (aucun secteur = tous)
 * - `selection` : clients choisis un par un
 * - `users`     : comptes précis (relance des non-ouvreurs)
 */
export type AudienceType = 'all' | 'segment' | 'selection' | 'users';
export type PremiumFilter = 'any' | 'premium' | 'standard';

export type CampaignAudience = {
  type: AudienceType;
  premium: PremiumFilter;
  categories: string[];
  customers: string[];
  users: string[];
  label: string;
};

export type CampaignImage = {
  id: number | null;
  url: string;
  width: number | null;
  height: number | null;
  name: string;
};

export type CampaignInput = {
  title: string;
  message: string;
  tag: CampaignTag;
  images: CampaignImage[];
  ctaLabel: string;
  ctaUrl: string;
  channelPopup: boolean;
  channelEmail: boolean;
  audience: CampaignAudience;
  expiresAt: string | null;
};

export type Campaign = CampaignInput & {
  id: number;
  status: CampaignStatus;
  sendAt: string | null;
  sentAt: string | null;
  archived: boolean;
  recipientCount: number;
  bellCount: number;
  emailCount: number;
  dispatchError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  audienceSummary: string;
};

export type CampaignListItem = Campaign & {
  stats: {
    recipients: number;
    opened: number;
    clicked: number;
    emailSent: number;
    openRate: number;
    clickRate: number;
  };
};

export type CampaignsOverview = {
  sent: number;
  sentLast30Days: number;
  recipients: number;
  openRate: number;
  clickRate: number;
};

export type CampaignStats = {
  recipients: number;
  opened: number;
  clicked: number;
  dismissed: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  bellSent: number;
  emailSent: number;
  emailOpened: number;
  emailFailed: number;
  emailOptout: number;
  emailNoAddress: number;
  emailOpenRate: number;
  byChannel: { popup: number; feed: number; bell: number; email: number };
};

export type CampaignTimeline = {
  unit: 'hour' | 'day';
  points: { t: string; opens: number; clicks: number; cumulativeOpens: number; cumulativeClicks: number }[];
};

export type OpenChannel = 'popup' | 'feed' | 'bell' | 'email';

export type CampaignRecipient = {
  id: number;
  customerDocumentId: string | null;
  customerName: string;
  userName: string;
  userEmail: string;
  receivedAt: string | null;
  bellStatus: string | null;
  emailStatus: string | null;
  emailError: string | null;
  openedAt: string | null;
  lastOpenedAt: string | null;
  openChannel: OpenChannel | null;
  openCount: number;
  emailOpenedAt: string | null;
  clickedAt: string | null;
  clickCount: number;
  dismissedAt: string | null;
};

export type AudiencePreview = {
  customers: number;
  users: number;
  emails: number;
  optouts: number;
  noEmail: number;
  sample: string[];
};

export type AudienceDirectory = {
  customers: {
    documentId: string;
    name: string;
    premium: boolean;
    categoryDocumentId: string | null;
    categoryName: string;
    users: number;
  }[];
  categories: { documentId: string; name: string; customers: number }[];
  /** Hors production : aucun client n'est réellement notifié (cf. backend). */
  sandbox: boolean;
  emailConfigured: boolean;
};

/** Campagne vue par le client (Actualités, pop-up). */
export type ClientCampaign = {
  id: number;
  title: string;
  message: string;
  tag: CampaignTag;
  images: CampaignImage[];
  ctaLabel: string;
  ctaUrl: string;
  receivedAt: string | null;
  expiresAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  dismissedAt: string | null;
  popup: boolean;
  isTest: boolean;
};
