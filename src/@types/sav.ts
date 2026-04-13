export type SavMessage = {
  id: string;
  content: string;
  images?: string[];     // URLs des images uploadées
  createdBy: string;     // displayName
  createdByRole: string; // 'admin' | 'customer' | 'producer'
  createdAt: string;     // ISO date
};

export type SavTicket = {
  id: string;
  title: string;
  description: string;
  openDate: string;      // ISO date
  closeDate?: string;    // ISO date — rempli à la clôture
  status: 'open' | 'closed';
  closureNote?: string;
  createdBy: string;     // displayName de l'utilisateur
  createdByRole: string; // 'admin' | 'customer' | 'producer'
  images?: string[];     // URLs des images jointes à l'ouverture
  messages?: SavMessage[];
};
