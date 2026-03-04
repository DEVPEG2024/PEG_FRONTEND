import Container from '@/components/shared/Container'
import { useNavigate } from 'react-router-dom'

type Card = {
  title: string
  subtitle: string
  route: string
  icon: string
  badge?: string
}

const cards: Card[] = [
  { title: 'Projets', subtitle: 'Gérer les projets', route: '/projects', icon: '📁' },
  { title: 'Bannières', subtitle: 'Gérer les bannières', route: '/banners', icon: '🖼️' },
  { title: 'Boutique', subtitle: 'Catalogue & produits', route: '/store', icon: '🛍️' },
  { title: 'Clients', subtitle: 'Comptes & organisations', route: '/customers', icon: '👥' },
  { title: 'Producteurs', subtitle: 'Réseau de production', route: '/producers', icon: '🏭' },
  { title: 'Factures', subtitle: 'Suivi financier', route: '/invoices', icon: '🧾' },
  { title: 'Utilisateurs', subtitle: 'Accès & rôles', route: '/users', icon: '🧑‍💻' },
  { title: 'Paramètres', subtitle: 'Configuration du SaaS', route: '/settings', icon: '⚙️' },
]

const DashboardAdmin = () => {
  const navigate = useNavigate()

  return (
    <Container>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Dashboard Super Admin</h1>
          <p style={{ opacity: 0.7, marginTop: 6, marginBottom: 0 }}>
            Accès rapide aux modules clés — clique sur une carte pour ouvrir la page.
          </p>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 12,
            opacity: 0.85,
          }}
        >
          Mode: Super Admin
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {cards.map((c) => (
          <button
            key={c.title}
            onClick={() => navigate(c.route)}
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 18,
              padding: 16,
              minHeight: 110,
              transition: 'transform 0.08s ease, background 0.15s ease, border 0.15s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.18)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    fontSize: 18,
                  }}
                >
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{c.title}</div>
                  <div style={{ opacity: 0.72, fontSize: 12, marginTop: 2 }}>{c.subtitle}</div>
                </div>
              </div>

              {c.badge ? (
                <div
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    opacity: 0.9,
                  }}
                >
                  {c.badge}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ opacity: 0.65, fontSize: 12 }}>Ouvrir</div>
              <div style={{ opacity: 0.9, fontSize: 14 }}>→</div>
            </div>
          </button>
        ))}
      </div>

      {/* Responsive simple : si écran plus petit, on réduit le nombre de colonnes */}
      <style>
        {`
          @media (max-width: 1200px) {
            div[style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          }
          @media (max-width: 900px) {
            div[style*="grid-template-columns: repeat(4"], div[style*="grid-template-columns: repeat(3"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          }
          @media (max-width: 600px) {
            div[style*="grid-template-columns: repeat(4"], div[style*="grid-template-columns: repeat(3"], div[style*="grid-template-columns: repeat(2"] { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
          }
          button:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.16) !important; }
        `}
      </style>
    </Container>
  )
}

export default DashboardAdmin