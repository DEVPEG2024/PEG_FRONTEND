import { Customer } from './customer';

export type QuoteStatus = 'requested' | 'proposed' | 'accepted' | 'rejected' | 'expired';

export type Quote = {
  documentId: string;
  title?: string;
  status: QuoteStatus;
  projectType?: string;
  quantity?: string;
  description: string;
  desiredDeadline?: string | null;
  requestedByName?: string | null;
  requestedByEmail?: string | null;
  requestedByPhone?: string | null;
  customer?: Pick<Customer, 'documentId' | 'name'> | null;
  proposalAmount?: number | null;
  proposalMessage?: string | null;
  proposalFile?: { documentId?: string; url: string; name?: string } | null;
  proposedAt?: string | null;
  validatedAt?: string | null;
  project?: { documentId: string } | null;
  createdAt?: string;
};

export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; color: string }> = {
  requested: { label: 'Demande reçue', color: '#fbbf24' },
  proposed: { label: 'Proposition envoyée', color: '#6b9eff' },
  accepted: { label: 'Validé', color: '#4ade80' },
  rejected: { label: 'Refusé', color: '#f87171' },
  expired: { label: 'Expiré', color: 'rgba(255,255,255,0.5)' },
};
