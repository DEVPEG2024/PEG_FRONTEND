import { User } from '@/@types/user'
import { useAppSelector } from '@/store'
import { hasRole } from '@/utils/permissions'
import { SUPER_ADMIN, ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant'
import DashboardAdmin from '@/views/app/admin/home/DashboardAdmin'
import DashboardCustomer from '@/views/app/customer/home/DashboardCustomer'
import DashboardProducer from '@/views/app/producer/home/DashboardProducer'
import { Suspense } from 'react'

const Home = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user)

  return (
    <Suspense fallback={null}>
      {hasRole(user, [SUPER_ADMIN, ADMIN]) && <DashboardAdmin />}
      {hasRole(user, [CUSTOMER]) && <DashboardCustomer />}
      {hasRole(user, [PRODUCER]) && <DashboardProducer />}
    </Suspense>
  )
}
export default Home