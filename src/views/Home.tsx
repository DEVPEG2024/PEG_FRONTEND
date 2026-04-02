import { User } from '@/@types/user'
import { useAppSelector } from '@/store'
import { hasRole } from '@/utils/permissions'
import { SUPER_ADMIN, ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant'
import DashboardAdmin from '@/views/app/admin/home/DashboardAdmin'
import DashboardCustomer from '@/views/app/customer/home/DashboardCustomer'
import DashboardProducer from '@/views/app/producer/home/DashboardProducer'
import { Suspense, useRef } from 'react'

/**
 * Stabilise un booléen de rôle : une fois passé à `true`, il ne redescend
 * jamais à `false` pendant la durée de vie du composant.
 * Cela évite le démontage du dashboard lors d'un flicker de réhydration
 * redux-persist (state.auth.user passe brièvement par l'état initial).
 */
function useStickyRole(user: User, roles: string[]): boolean {
  const stuck = useRef(false)
  if (hasRole(user, roles)) stuck.current = true
  return stuck.current
}

const Home = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user)

  const isAdmin = useStickyRole(user, [SUPER_ADMIN, ADMIN])
  const isCustomer = useStickyRole(user, [CUSTOMER])
  const isProducer = useStickyRole(user, [PRODUCER])

  return (
    <Suspense fallback={null}>
      {isAdmin && <DashboardAdmin />}
      {isCustomer && <DashboardCustomer />}
      {isProducer && <DashboardProducer />}
    </Suspense>
  )
}
export default Home