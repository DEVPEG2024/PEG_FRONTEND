import { User } from '@/@types/user';
import { AuthorityCheck } from '@/components/shared';
import { useAppSelector } from '@/store';
import DashboardAdmin from '@/views/app/admin/home/DashboardAdmin';
import DashboardCustomer from '@/views/app/customer/home/DashboardCustomer';
import DashboardProducer from '@/views/app/producer/home/DashboardProducer';
import { Suspense } from 'react';

const Home = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthorityCheck
        authority={['super_admin']}
        userAuthority={user?.authority || []}
      >
        <DashboardAdmin />
      </AuthorityCheck>
      <AuthorityCheck
        authority={['customer']}
        userAuthority={user?.authority || []}
      >
        <DashboardCustomer />
      </AuthorityCheck>
      <AuthorityCheck
        authority={['producer']}
        userAuthority={user?.authority || []}
      >
        <DashboardProducer />
      </AuthorityCheck>
    </Suspense>
  );
};

export default Home;
