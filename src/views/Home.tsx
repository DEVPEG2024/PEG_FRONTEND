import { User } from '@/@types/user'
import { AuthorityCheck } from '@/components/shared'
import { useAppSelector } from '@/store'
import DashboardAdmin from '@/views/app/admin/home/DashboardAdmin'
import DashboardCustomer from '@/views/app/customer/home/DashboardCustomer'
import DashboardProducer from '@/views/app/producer/home/DashboardProducer'
import { Suspense } from 'react'

const Home = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user)

  const userAuthority =
    (user as any)?.authority ||
    (user as any)?.user?.authority ||
    (user as any)?.user?.user?.authority ||
    []
  return (
  <Suspense fallback={null}>

    <AuthorityCheck authority={['super_admin']} userAuthority={userAuthority}>
      <DashboardAdmin />
    </AuthorityCheck>

    <AuthorityCheck authority={['customer']} userAuthority={userAuthority}>
      <DashboardCustomer />
    </AuthorityCheck>

    <AuthorityCheck authority={['producer']} userAuthority={userAuthority}>
      <DashboardProducer />
    </AuthorityCheck>

  </Suspense>
)
}
export default Home