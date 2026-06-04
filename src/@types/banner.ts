import { Customer, CustomerCategory } from './customer';
import { PegFile, UploadImage } from './pegFile';

/**
 * Banner tel que renvoyé par l'API GraphQL (lecture) : relations peuplées
 * (`customer`/`customerCategory` sont des objets) et `image` un PegFile.
 */
export type Banner = {
  documentId: string;
  name: string;
  customer: Customer;
  customerCategory: CustomerCategory;
  image: PegFile;
  active: boolean;
}

/**
 * Banner côté formulaire (écriture). Les relations sont des `documentId`
 * string (ou '' / null) et l'image est soit un fichier local fraîchement
 * choisi (`UploadImage`), soit absente. Le slice (`bannerSlice.ts`) extrait
 * le documentId du customer et l'id de l'image avant l'appel API.
 */
export type BannerForm = {
  documentId?: string;
  name: string;
  customer: string | null;
  customerCategory: string | null;
  image?: UploadImage;
  active: boolean;
}
