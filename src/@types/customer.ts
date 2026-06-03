import { Banner } from './banner';
import { Product } from './product';
import { PegFile } from './pegFile';

export type CustomerCategory = {
  documentId: string;
  name: string;
  banner?: Banner;
  products: Product[];
  customers: Customer[];
};

export type CompanyInformations = {
  email: string;
  phoneNumber: string;
  vatNumber: string;
  siretNumber: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  website: string;
};

export type Customer = {
  documentId: string;
  name: string;
  companyInformations: CompanyInformations;
  customerCategory: CustomerCategory;
  banner: Banner;
  logo?: PegFile;
  deferredPayment: boolean;
  catalogAccess: boolean;
  /** Client Premium (abonnement) → accès aux offres personnalisées ("Mes offres"). Standard sinon. */
  premium?: boolean;
  /** Premium traité côté admin = offres personnalisées préparées. */
  premiumProcessed?: boolean;
  /** Date de passage en Premium (ISO). */
  premiumSince?: string;
};
