import { Customer } from "./customer";
import { Producer } from "./producer";

// TODO: supprimer reste

export interface ICategory {
  _id: string; // Identifiant unique
  title: string; // Titre
}

export interface IWallet {
  _id: string; // Identifiant unique
  balance: number; // Solde
  createdAt: string; // Date de création
  updatedAt: string; // Date de mise à jour
  deletedAt: string | null; // Date de suppression
  deleted: boolean; // Indique si le produit est supprimé
}

export interface IUser {
  _id: string; // Identifiant unique
  lastName: string; // Nom
  firstName: string; // Prénom
  logo: string; // Logo
  companyName: string; // Nom de l'entreprise
  phone: string; // Numéro de téléphone
  address: string; // Adresse
  zip: string; // Code postal
  city: string; // Ville
  country: string; // Pays
  description: string; // Description
  category: ICategory; // Catégorie
  website: string; // Site web
  siret: string; // Numéro SIRET
  wallet: IWallet; // Wallet
  vat: string; // Numéro TVA
  email: string; // Adresse e-mail
  password: string; // Mot de passe
  authority: string[]; // Rôle
  qrCode: string; // Code QR
  createdAt: string; // Date de création
  updatedAt: string; // Date de mise à jour
  deletedAt: string | null; // Date de suppression
  deleted: boolean; // Indique si le produit est supprimé
  device: string; // Identifiant du device
  status: boolean; // Indique si le produit est supprimé
  tags: string[]; // Tags
}

export type Role = {
  documentId: string;
  name: string;
};

export type User = {
  documentId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  customer?: Customer;
  producer?: Producer;
  role: Role;
  authority: string[];
  blocked: boolean;
}