import { IOffer } from './offer';
import { IProject } from './project';
import { IUser } from './user';

export interface Invoice {
  _id: string; // Identifiant
  sellerId: IUser; // Identifiant du vendeur
  customerId: IUser; // Identifiant du client
  amount: number; // Montant de la facture
  vat: number; // Taux de TVA
  vatAmount: number; // Montant de la TVA
  totalAmount: number; // Montant total de la facture
  projectId: IProject | null; // Identifiant du projet
  offerId: IOffer | null; // Identifiant de l'offre
  invoiceNumber: string; // Numéro de la facture
  invoiceDate: Date; // Date de la facture
  dueDate: Date; // Date d'échéance de la facture
  paymentDate: Date; // Date de paiement de la facture
  paymentMethod: string; // Méthode de paiement
  paymentStatus: string; // Statut du paiement
  paymentReference: string; // Référence du paiement
  paymentAmount: number; // Montant du paiement
  items: Items[]; // Liste des items de la facture
  status: string; // Statut de la facture
  createdAt: Date; // Date de création de la facture
}

export interface Items {
  _id: string; // Identifiant de l'item
  name: string; // Nom de l'item
  quantity: number; // Quantité de l'item
  price: number; // Prix unitaire de l'item
  total: number; // Montant total de l'item
}
