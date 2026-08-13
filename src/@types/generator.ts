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
  method: 'transfer' | 'cheque' | 'cash' | 'other';
  reference: string;
  note: string;
  commissionsCount?: number;
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

/** Payload de l'espace Générateur (`GET /referral/me`) */
export type GeneratorSpace = {
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
export type CustomerReferralSpace = {
  enabled: boolean;
  sponsor: Sponsor | null;
  generator?: GeneratorProfile;
  stats?: GeneratorStats;
  commissions?: Commission[];
  payouts?: GeneratorPayout[];
  referrals?: Referral[];
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
