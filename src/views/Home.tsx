import { User } from '@/@types/user'
import { useAppSelector } from '@/store'
import { SUPER_ADMIN, ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant'
import DashboardAdmin from '@/views/app/admin/home/DashboardAdmin'
import DashboardCustomer from '@/views/app/customer/home/DashboardCustomer'
import DashboardProducer from '@/views/app/producer/home/DashboardProducer'
import { Suspense, useRef } from 'react'

/**
 * Résout le rôle courant pour choisir le dashboard.
 *
 * On retient le dernier rôle CONCRET (≠ 'public') afin d'éviter le démontage
 * du dashboard pendant le flicker de réhydratation redux-persist (le state
 * repasse brièvement par l'état initial 'public').
 *
 * ⚠️ Contrairement à un verrou « sticky » figé sur le 1er rôle vu, un nouveau
 * rôle concret REMPLACE toujours l'ancien. Ainsi, dès que `/users/me` renvoie
 * le vrai rôle, on bascule sur le bon dashboard — ce qui corrige le cas où un
 * client réhydraté avec un rôle admin résiduel restait coincé sur l'admin.
 */
function useResolvedRoleName(user: User): string | null {
  const last = useRef<string | null>(null)
  const name = user?.role?.name
  if (name && name !== 'public') last.current = name
  return last.current
}

const Home = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user)
  const role = useResolvedRoleName(user)

  const isAdmin = role === SUPER_ADMIN || role === ADMIN
  const isCustomer = role === CUSTOMER
  const isProducer = role === PRODUCER

  return (
    <Suspense fallback={null}>
      {isAdmin && <DashboardAdmin />}
      {isCustomer && <DashboardCustomer />}
      {isProducer && <DashboardProducer />}
    </Suspense>
  )
}
export default Home
