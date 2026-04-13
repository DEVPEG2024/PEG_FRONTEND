export type SavTicket = {
  id: string;
  title: string;
  description: string;
  openDate: string;   // ISO date
  closeDate?: string; // ISO date — rempli à la clôture
  status: 'open' | 'closed';
  closureNote?: string;
  createdBy: string;  // displayName de l'utilisateur
};
