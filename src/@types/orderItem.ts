import { Customer } from './customer';
import { FormAnswer } from './formAnswer';
import { PegFile } from './pegFile';
import { Product, SizeAndColorSelection } from './product';
import { Project } from './project';

export type OrderItem = {
  documentId: string;
  product: Product;
  sizeAndColorSelections: SizeAndColorSelection[];
  formAnswer: FormAnswer | null;
  price: number;
  state: string;
  customer: Customer;
  // Optionnel : à la création depuis le panier, le projet n'existe pas encore (créé après commande)
  project?: Project;
  batStatus?: 'pending' | 'approved' | 'rejected' | null;
  batComment?: string | null;
}