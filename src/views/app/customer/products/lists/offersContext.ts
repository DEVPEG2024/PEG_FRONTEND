// Contexte client de la page « Mes offres » (/customer/products).
//
// Pourquoi ce fichier : `/users/me` (UserService.getUser) ne peuple que les
// champs simples du client. `customerCategory` (relation) y est absent, donc
// la page envoyait `customerCategoryDocumentId: ''` et les offres rattachées
// au secteur du client ne s'affichaient jamais (le dashboard, lui, relit le
// client en GraphQL). On relit donc le client avant de charger les produits.
//
// Ordre de résolution :
//   1. apiGetCustomerOffersContext (secteur + drapeaux premium + catalogAccess)
//   2. repli : apiGetDashboardCustomerInformations (requête déjà éprouvée en
//      prod) pour le secteur et catalogAccess ; drapeaux premium du store
//   3. repli ultime : tout vient du store, secteur vide (comportement d'avant)
// La fonction ne lève JAMAIS d'exception.
import { Customer } from '@/@types/customer';
import {
  apiGetCustomerOffersContext,
  apiGetDashboardCustomerInformations,
} from '@/services/DashboardCustomerService';
import { unwrapData } from '@/utils/serviceHelper';

export type OffersContext = {
  customerDocumentId: string;
  customerName?: string;
  customerCategoryDocumentId: string;
  catalogAccess?: boolean | null;
  premium?: boolean | null;
  premiumProcessed?: boolean | null;
  premiumSince?: string | null;
};

type StoreCustomer = Partial<Customer> | null | undefined;

const fromStore = (storeCustomer: StoreCustomer): OffersContext => ({
  customerDocumentId: storeCustomer?.documentId || '',
  customerName: storeCustomer?.name || undefined,
  customerCategoryDocumentId: storeCustomer?.customerCategory?.documentId || '',
  catalogAccess: storeCustomer?.catalogAccess,
  premium: storeCustomer?.premium,
  premiumProcessed: storeCustomer?.premiumProcessed,
  premiumSince: storeCustomer?.premiumSince ?? null,
});

export async function loadOffersContext(
  storeCustomer: StoreCustomer
): Promise<OffersContext> {
  const base = fromStore(storeCustomer);
  const id = base.customerDocumentId;
  if (!id) return base;

  // 1. Requête dédiée
  try {
    const { customer } = await unwrapData(apiGetCustomerOffersContext(id));
    if (customer) {
      return {
        customerDocumentId: customer.documentId || id,
        customerName: customer.name || base.customerName,
        customerCategoryDocumentId:
          customer.customerCategory?.documentId ||
          base.customerCategoryDocumentId,
        catalogAccess: customer.catalogAccess ?? base.catalogAccess,
        premium: customer.premium ?? base.premium,
        premiumProcessed: customer.premiumProcessed ?? base.premiumProcessed,
        premiumSince: customer.premiumSince ?? base.premiumSince ?? null,
      };
    }
  } catch (error) {
    console.warn(
      '[Mes offres] Contexte client indisponible, repli dashboard :',
      error
    );
  }

  // 2. Repli : requête du tableau de bord (secteur + catalogAccess)
  try {
    const { customer } = await unwrapData(
      apiGetDashboardCustomerInformations(id)
    );
    if (customer) {
      return {
        ...base,
        customerName: customer.name || base.customerName,
        customerCategoryDocumentId:
          customer.customerCategory?.documentId ||
          base.customerCategoryDocumentId,
        catalogAccess: customer.catalogAccess ?? base.catalogAccess,
      };
    }
  } catch (error) {
    console.warn(
      '[Mes offres] Repli dashboard indisponible, contexte du store :',
      error
    );
  }

  // 3. Comportement historique
  return base;
}
