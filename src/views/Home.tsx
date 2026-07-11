import { User } from '@/@types/user'
import { useAppSelector } from '@/store'
import { hasRole } from '@/utils/permissions'
import { SUPER_ADMIN, ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant'
import DashboardAdmin from '@/views/app/admin/home/DashboardAdmin'
import DashboardCustomer from '@/views/app/customer/home/DashboardCustomer'
import DashboardProducer from '@/views/app/producer/home/DashboardProducer'
import { Suspense } from 'react'

/**
 * Choisit le dashboard selon le rôle courant.
 *
 * Le rôle est autoritatif ici : `ProtectedRoute` ne rend les routes protégées
 * qu'après confirmation de l'utilisateur courant par le serveur (/users/me).
 * On peut donc lire directement `user.role` sans verrou anti-flicker.
 */
const Home = () => {
  const { user }: { user: User } = useAppSelector((state) => state.auth.user)

  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN])
  const isCustomer = hasRole(user, [CUSTOMER])
  const isProducer = hasRole(user, [PRODUCER])
  const isKnownRole = isAdmin || isCustomer || isProducer

  return (
    <Suspense fallback={null}>
      {isAdmin && <DashboardAdmin />}
      {isCustomer && <DashboardCustomer />}
      {isProducer && <DashboardProducer />}
      {/* Repli : rôle inconnu/non configuré → message plutôt qu'une page blanche */}
      {!isKnownRole && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', flexDirection: 'column', gap: '12px',
          fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '24px',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Bienvenue, {user?.firstName || user?.email || ''} 👋
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: 0, maxWidth: '360px' }}>
            Votre compte est en cours de configuration. Si le problème persiste,
            contactez votre administrateur.
          </p>
        </div>
      )}
    </Suspense>
  )
}
export default Home
