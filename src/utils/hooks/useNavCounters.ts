import { useEffect, useState } from 'react';
import { apiGetQuotes, apiGetCustomerQuotes } from '@/services/QuoteServices';
import { apiGetPremiumCustomers } from '@/services/PremiumServices';
import { apiGetPayoutRequests } from '@/services/GeneratorServices';
import { unwrapData } from '@/utils/serviceHelper';
import type { NavCounters } from '@/utils/navMenu';

/** Compteurs des pastilles du menu, rafraîchis toutes les minutes. */
const useNavCounters = (
  isAdmin: boolean,
  customerDocumentId?: string
): NavCounters => {
  const [quoteCount, setQuoteCount] = useState(0);
  const [premiumCount, setPremiumCount] = useState(0);
  const [payoutRequestCount, setPayoutRequestCount] = useState(0);

  // Compteur de devis en attente (admin : demandes reçues ; client : propositions à valider)
  useEffect(() => {
    let stopped = false;
    const fetchCount = async () => {
      try {
        const res = isAdmin
          ? await unwrapData(
              apiGetQuotes({
                pagination: { page: 1, pageSize: 1000 },
                searchTerm: '',
              })
            )
          : customerDocumentId
            ? await unwrapData(apiGetCustomerQuotes(customerDocumentId))
            : null;
        if (!res || stopped) return;
        const nodes =
          (res as { quotes_connection?: { nodes?: { status: string }[] } })
            .quotes_connection?.nodes || [];
        const pending = nodes.filter((q) =>
          isAdmin ? q.status === 'requested' : q.status === 'proposed'
        ).length;
        if (!stopped) setQuoteCount(pending);
      } catch {
        // silencieux (collection devis pas encore déployée / permissions)
      }
    };
    fetchCount();
    const id = setInterval(fetchCount, 60000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [isAdmin, customerDocumentId]);

  // Compteur de clients Premium non traités (admin) → badge sur l'onglet "Premium"
  useEffect(() => {
    if (!isAdmin) return;
    let stopped = false;
    const fetchPremium = async () => {
      try {
        const list = await apiGetPremiumCustomers();
        if (stopped) return;
        setPremiumCount(list.filter((c) => !c.premiumProcessed).length);
      } catch {
        // silencieux
      }
    };
    fetchPremium();
    const id = setInterval(fetchPremium, 60000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [isAdmin]);

  // Demandes de retrait en attente (admin) → pastille sur l'onglet "Générateurs".
  // Un parrain qui demande un virement attend une action humaine : sans cette
  // pastille, sa demande peut dormir jusqu'à ce qu'un admin ouvre l'écran.
  useEffect(() => {
    if (!isAdmin) return;
    let stopped = false;
    const fetchPayoutRequests = async () => {
      try {
        const list = await apiGetPayoutRequests('pending');
        if (!stopped) setPayoutRequestCount(list.length);
      } catch {
        // silencieux (backend pas encore déployé / route absente)
      }
    };
    fetchPayoutRequests();
    const id = setInterval(fetchPayoutRequests, 60000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [isAdmin]);

  return { quoteCount, premiumCount, payoutRequestCount };
};

export default useNavCounters;
