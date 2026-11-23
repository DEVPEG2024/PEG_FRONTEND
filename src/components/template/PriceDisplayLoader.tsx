import { useEffect } from 'react'
import { setPriceDisplay, useAppDispatch, useAppSelector } from '@/store'
import { apiGetCustomerSectorName } from '@/services/CustomerServices'
import { customerSeesTTC } from '@/utils/priceDisplay'

/**
 * Résout une fois par session l'affichage HT/TTC du client connecté
 * (utils/priceDisplay) et le range dans le store ; les écrans le lisent avec
 * usePriceView. Monté par le Layout pour les seuls clients.
 *
 * - Réglage de l'admin (`customer.priceDisplay`, renvoyé par /users/me) :
 *   appliqué tel quel, sans requête.
 * - Automatique : le nom du secteur est relu (absent de /users/me).
 * En cas d'échec réseau, le dernier affichage connu pour ce client est gardé.
 */
const PriceDisplayLoader = () => {
  const dispatch = useAppDispatch()
  const customerId = useAppSelector((state) => state.auth.user.user?.customer?.documentId)
  const choice = useAppSelector((state) => state.auth.user.user?.customer?.priceDisplay)

  useEffect(() => {
    if (!customerId) return
    if (choice === 'ttc' || choice === 'ht') {
      dispatch(setPriceDisplay({ customerDocumentId: customerId, ttc: choice === 'ttc' }))
      return
    }
    let cancelled = false
    apiGetCustomerSectorName(customerId)
      .then((sectorName) => {
        if (cancelled) return
        dispatch(setPriceDisplay({ customerDocumentId: customerId, ttc: customerSeesTTC(null, sectorName) }))
      })
      .catch((error) => {
        console.warn('[Prix] Secteur du client illisible, affichage inchangé :', error)
      })
    return () => {
      cancelled = true
    }
  }, [customerId, choice, dispatch])

  return null
}

export default PriceDisplayLoader
