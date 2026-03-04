import Container from '@/components/shared/Container'

const cardStyle = {
  background: 'rgb(30,41,59)',
  padding: 20,
  borderRadius: 8
}

const DashboardAdmin = () => {
  return (
    <Container>
      <h2 style={{ marginBottom: 20 }}>Dashboard Super Admin</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>

        <div style={cardStyle}>
          <h3>Clients</h3>
          <p>Gestion des clients</p>
        </div>

        <div style={cardStyle}>
          <h3>Producteurs</h3>
          <p>Gestion des producteurs</p>
        </div>

        <div style={cardStyle}>
          <h3>Commandes</h3>
          <p>Suivi des commandes</p>
        </div>

        <div style={cardStyle}>
          <h3>Bannières</h3>
          <p>Gestion des bannières</p>
        </div>

        <div style={cardStyle}>
          <h3>Facturation</h3>
          <p>Suivi financier</p>
        </div>

        <div style={cardStyle}>
          <h3>Paramètres</h3>
          <p>Configuration du SaaS</p>
        </div>

      </div>
    </Container>
  )
}

export default DashboardAdmin