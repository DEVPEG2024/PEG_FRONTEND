import { Customer } from './customer';
import { OrderItem } from './orderItem';
import type { InvoiceLine } from '@/utils/invoiceLines';

export type { InvoiceLine, InvoiceLineKind } from '@/utils/invoiceLines';

export type Invoice = {
  documentId: string;
  customer: Customer;
  orderItems: OrderItem[];
  amount: number;
  vatAmount: number;
  totalAmount: number;
  name: string;
  date: Date;
  dueDate: Date;
  paymentDate: Date;
  paymentMethod: string;
  paymentState: string;
  paymentReference: string;
  paymentAmount: number;
  state: string;
  file?: { documentId: string; url: string; name: string } | null;
  /**
   * Lignes figées à l'émission (désignation, quantité, P.U. HT, total).
   * Absent = facture antérieure aux lignes, ou serveur pas encore à jour :
   * l'affichage les reconstitue (utils/invoiceLines.ts → resolveInvoiceLines).
   */
  lines?: InvoiceLine[] | null;
  /** Projet facturé — lu pour l'impression et l'édition (apiGetInvoiceDocument). */
  project?: {
    documentId: string;
    name?: string | null;
    orderItem?: OrderItem | null;
  } | null;
}
