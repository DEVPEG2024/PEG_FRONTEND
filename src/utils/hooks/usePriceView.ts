import { useAppSelector } from '@/store/hook'
import { priceView, PriceView } from '@/utils/priceDisplay'

/**
 * Affichage des prix (HT ou TTC) du compte connecté. Seul un client résolu
 * TTC par PriceDisplayLoader voit le TTC ; l'admin, le producteur et tout
 * client non encore résolu gardent l'affichage HT historique.
 */
export default function usePriceView(): PriceView {
  const ttc = useAppSelector((state) => {
    const resolved = state.auth.priceDisplay
    const customerId = state.auth.user?.user?.customer?.documentId
    return !!resolved?.ttc && !!customerId && resolved.customerDocumentId === customerId
  })
  return priceView(ttc)
}
