export type ExpenseCategory =
  | 'supplier'      // Fournisseur matériel
  | 'subcontractor' // Sous-traitance
  | 'logistics'     // Logistique / transport
  | 'subscription'  // Abonnements
  | 'other';        // Divers

export type ExpenseStatus =
  | 'pending'   // À payer
  | 'paid'      // Payée
  | 'overdue';  // En retard

export type RecurrenceInterval =
  | 'monthly'    // Mensuel
  | 'quarterly'  // Trimestriel
  | 'yearly';    // Annuel

export type Expense = {
  documentId: string;
  label: string;
  description: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  category: ExpenseCategory;
  status: ExpenseStatus;
  date: string;
  dueDate: string;
  paidDate: string;
  supplierName: string;
  project?: { documentId: string; name: string } | null;
  receipt?: { documentId: string; url: string; name: string } | null;
  recurring: boolean;
  recurrenceInterval: RecurrenceInterval | null;
  recurrenceEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}
