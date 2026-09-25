import { FormAnswer } from './formAnswer';
import { Product, SizeAndColorSelection } from './product';

export type CartItem = {
  id: string;
  product: Product;
  formAnswer: FormAnswer;
  sizeAndColors: SizeAndColorSelection[];
  orderItemDocumentId?: string;
  userDocumentId: string;
  /** BAT du produit approuvé sur la fiche avant l'ajout (produit « BAT requis »). */
  batApproved?: boolean;
  /** Conversation du chat d'où vient l'article (offre de l'assistant) → order-item, clôture du chat. */
  chatConversationId?: string;
};
