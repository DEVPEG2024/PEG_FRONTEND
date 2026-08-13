/**
 * Programme « Générateur » (apporteur d'affaires).
 *
 * Un Générateur parraine des entreprises ou des particuliers grâce à un code
 * personnel unique, et perçoit une commission sur chaque commande RÉELLEMENT
 * PAYÉE par un de ses filleuls. Le rattachement d'un filleul est permanent.
 */

/** Cycle de vie d'une commission */
export type CommissionStatus = 'pending' | 'validated' | 'paid' | 'canceled';

export type Commission = {
  documentId: string;
  /** Référence de la commande / facture (ex : INV-XXXX) */
  reference: string;
  /** CA HT retenu comme base de calcul */
  baseAmount: number;
  /** Taux appliqué, figé à la création de la commission (%) */
  rate: number;
  /** Montant de la commission (€) */
  amount: number;
  status: CommissionStatus;
  source?: 'order' | 'quote' | 'manual';
  date: string;
  validatedAt?: string | null;
  paidAt?: string | null;
  canceledAt?: string | null;
  cancelReason?: string | null;
  customer?: { documentId: string; name: string } | null;
  invoice?: { documentId: string; name: string } | null;
  generator?: { documentId: string; name: string } | null;
};

export type GeneratorPayout = {
  documentId: string;
  amount: number;
  date: string;
  method: 'transfer' | 'cheque' | 'cash' | 'store_credit' | 'other';
  reference: string;
  note: string;
  /** Justificatif du virement joint par PEG (relevé, capture, PDF) */
  proofUrl?: string | null;
  proofName?: string | null;
  commissionsCount?: number;
};

/**
 * Destination d'un retrait :
 *  - `bank_transfer` : virement, soumis au traitement de l'administration ;
 *  - `store_credit`  : avoir utilisable au panier, effet immédiat. Réservé aux
 *    clients parrains — un apporteur d'affaires n'a pas de panier.
 */
export type PayoutMode = 'bank_transfer' | 'store_credit';

export type PayoutRequestStatus = 'pending' | 'paid' | 'rejected' | 'canceled';

export type PayoutRequest = {
  documentId: string;
  amount: number;
  mode: PayoutMode;
  status: PayoutRequestStatus;
  requestedAt: string;
  processedAt?: string | null;
  rejectReason?: string;
  note?: string;
  commissionsCount?: number;
};

/** Coordonnées bancaires du parrain — l'IBAN n'est jamais renvoyé en clair */
export type BankDetails = {
  holder: string;
  ibanMasked: string;
  bic: string;
  filled: boolean;
};

/** Ce qu'il est possible de retirer maintenant */
export type PayoutRequestState = {
  /** Total validé, engagé compris */
  availableBalance: number;
  /** Déjà engagé dans une demande en attente */
  pendingRequested: number;
  /** Réellement retirable */
  requestable: number;
  /** Plus petite commission libre — en dessous, aucun retrait n'est possible */
  smallestFree: number;
};

export type Referral = {
  documentId: string;
  name: string;
  referredAt?: string | null;
  createdAt?: string;
  city?: string;
  email?: string;
};

export type GeneratorStats = {
  /** Nombre de commandes payées ayant généré une commission */
  ordersCount: number;
  /** CA HT généré par les filleuls */
  revenueGenerated: number;
  /** Commissions cumulées (hors annulées) */
  totalCommissions: number;
  /** Commissions en attente de validation */
  pendingCommissions: number;
  /** Solde disponible (validé, pas encore versé) */
  availableBalance: number;
  /** Commissions déjà versées */
  paidCommissions: number;
  /** Commissions annulées */
  canceledCommissions: number;
  /** Nombre de filleuls rattachés */
  referralsCount?: number;
  /** Commandes de filleuls facturées mais PAS encore encaissées */
  awaitingCount?: number;
  /** CA HT correspondant, en attente d'encaissement */
  awaitingBase?: number;
  /** Commission ESTIMÉE sur ces commandes — conditionnelle, jamais un dû */
  awaitingCommission?: number;
};

/** Nature d'un parrain : apporteur d'affaires externe, ou client qui parraine. */
export type ReferrerKind = 'partner' | 'customer';

export type GeneratorProfile = {
  documentId: string;
  name: string;
  kind?: ReferrerKind;
  referralCode: string;
  referralLink: string;
  /** Taux effectivement appliqué (taux propre, sinon taux global de sa nature) */
  commissionRate: number;
  active: boolean;
};

/** Parrain d'un client, tel qu'affiché au filleul (aucune donnée sensible) */
export type Sponsor = {
  name: string;
  referralCode: string;
  since?: string | null;
};

/** Partie « retraits » commune à l'espace Générateur et à l'espace client parrain */
export type ReferralWalletPart = {
  bank: BankDetails;
  /** Avoir disponible au panier (clients parrains) */
  creditBalance: number;
  requestState: PayoutRequestState;
  payoutRequests: PayoutRequest[];
  /** Seuil de virement fixé par PEG (0 = aucun) */
  minPayoutAmount: number;
};

/** Payload de l'espace Générateur (`GET /referral/me`) */
export type GeneratorSpace = ReferralWalletPart & {
  generator: GeneratorProfile;
  stats: GeneratorStats;
  commissions: Commission[];
  payouts: GeneratorPayout[];
  referrals: Referral[];
};

/**
 * Espace parrainage d'un CLIENT (`GET /referral/customer/me`).
 * `enabled: false` = parrainage entre clients fermé côté PEG : seul le parrain
 * du client est renvoyé, il n'a pas de code à lui.
 */
export type CustomerReferralSpace = Partial<ReferralWalletPart> & {
  enabled: boolean;
  sponsor: Sponsor | null;
  generator?: GeneratorProfile;
  stats?: GeneratorStats;
  commissions?: Commission[];
  payouts?: GeneratorPayout[];
  referrals?: Referral[];
};

/** Demande de retrait vue par l'administration (avec les coordonnées à payer) */
export type PayoutRequestAdminRow = PayoutRequest & {
  bankSnapshot: string;
  generator: {
    documentId: string;
    name: string;
    kind: ReferrerKind;
    bankHolder: string;
    bankIban: string;
    bankBic: string;
  } | null;
};

/** Réglages globaux du programme */
export type ReferralSettings = {
  /** Taux des apporteurs d'affaires (Générateurs) */
  defaultCommissionRate: number;
  /** Taux des clients qui parrainent */
  customerCommissionRate: number;
  /** Parrainage entre clients ouvert ou non */
  customerReferralEnabled: boolean;
  autoValidate: boolean;
  minPayoutAmount: number;
};

/** Ligne de la liste admin des générateurs */
export type GeneratorAdminRow = {
  documentId: string;
  name: string;
  kind: ReferrerKind;
  /** Renseigné pour un client parrain : le compte client bénéficiaire */
  customerDocumentId: string | null;
  referralCode: string;
  referralLink: string;
  /** Taux personnalisé (null = taux global) */
  commissionRate: number | null;
  /** Taux réellement appliqué */
  effectiveRate: number;
  active: boolean;
  payoutDetails: string;
  notes: string;
  email: string;
  phoneNumber: string;
  userDocumentId: string | null;
  referralsCount: number;
  stats: GeneratorStats;
};

/** Détail admin d'un générateur */
export type GeneratorAdminDetail = {
  generator: GeneratorProfile & {
    commissionRate: number | null;
    effectiveRate: number;
    payoutDetails: string;
    notes: string;
    email: string;
  };
  stats: GeneratorStats;
  commissions: Commission[];
  payouts: GeneratorPayout[];
  referrals: Referral[];
};

/** Client vu depuis l'écran de rattachement admin */
export type ReferralCustomer = {
  documentId: string;
  name: string;
  referredAt?: string | null;
  generator?: { documentId: string; name: string } | null;
};
