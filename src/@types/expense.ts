import { Customer } from './customer';

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
  project?: { documentId: string; title: string } | null;
  receipt?: { documentId: string; url: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
