import Container from '@/components/shared/Container'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGetDashboardSuperAdminInformations } from '@/services/DashboardSuperAdminService'

function safeDate(s?: string) {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function eur(n: number) {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${Math.round(n)} €`
  }
}

export default function DashboardAdmin() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gql, setGql] = useState<any>(null)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await apiGetDashboardSuperAdminInformations()
        const data = (res as any)?.data?.data ?? (res as any)?.data ?? null
        if (!data) throw new Error('Réponse GraphQL vide')
        setGql(data)
      } catch (e: any) {
        setError(e?.message ?? 'Erreur dashboard')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const projectsTotal = gql?.projects_connection?.pageInfo?.total ?? 0
  const customersTotal = gql?.customers_connection?.pageInfo?.total ?? 0
  const producersTotal = gql?.producers_connection?.pageInfo?.total ?? 0
  const ticketsTotal = gql?.tickets_connection?.pageInfo?.total ?? 0
  const invoices = gql?.invoices_connection?.nodes ?? []
  const projects = gql?.projects_connection?.nodes ?? []

  const invoiceTotal = useMemo(
    () => invoices.reduce((a: number, x: any) => a + (Number(x?.totalAmount) || 0), 0),
    [invoices]
  )

  const invoicePaid = useMemo(() => {
    return invoices.reduce((a: number, x: any) => {
      const ps = (x?.paymentState ?? '').toString().toLowerCase()
      const st = (x?.state ?? '').toString().toLowerCase()
      const paid = ps.includes('paid') || ps === 'paid' || ps === 'paye' || st.includes('paid')
      return a + (paid ? (Number(x?.totalAmount) || 0) : 0)
    }, 0)
  }, [invoices])

  const overdueInvoices = useMemo(() => {
    const now = new Date()
    return invoices.filter((x: any) => {
      const d = safeDate(x?.date)
      if (!d) return false
      const ps = (x?.paymentState ?? '').toString().toLowerCase()
      const paid = ps.includes('paid') || ps === 'paid' || ps === 'paye'
      return d.getTime() < now.getTime() && !paid
    }).length
  }, [invoices])

  return (
    <Container>
      <div className="p-4 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard (mode debug)</h1>
            <p className="text-sm text-white/60">
              Si tu vois cette page, le menu/layout fonctionne. On réparera ensuite le design.
            </p>
          </div>

          <button
            className="bg-white/5 border border-white/10 text-white/80 px-3 py-2 rounded-xl"
            onClick={() => window.location.reload()}
          >
            Rafraîchir
          </button>
        </div>

        {loading ? <div className="text-white/60">Chargement…</div> : null}
        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
            <div className="font-semibold">Erreur :</div>
            <div>{error}</div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
            <div className="text-xs text-white/60">Projets</div>
            <div className="text-2xl font-black text-white">{projectsTotal}</div>
            <button className="text-xs text-blue-300 mt-2" onClick={() => navigate('/common/projects')}>
              Ouvrir →
            </button>
          </div>

          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
            <div className="text-xs text-white/60">Clients</div>
            <div className="text-2xl font-black text-white">{customersTotal}</div>
            <button className="text-xs text-blue-300 mt-2" onClick={() => navigate('/admin/customers/list')}>
              Ouvrir →
            </button>
          </div>

          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
            <div className="text-xs text-white/60">Producteurs</div>
            <div className="text-2xl font-black text-white">{producersTotal}</div>
            <button className="text-xs text-blue-300 mt-2" onClick={() => navigate('/admin/producers/list')}>
              Ouvrir →
            </button>
          </div>

          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
            <div className="text-xs text-white/60">Tickets</div>
            <div className="text-2xl font-black text-white">{ticketsTotal}</div>
            <button className="text-xs text-blue-300 mt-2" onClick={() => navigate('/support')}>
              Ouvrir →
            </button>
          </div>

          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10 md:col-span-2">
            <div className="text-xs text-white/60">CA total (factures)</div>
            <div className="text-2xl font-black text-white">{eur(invoiceTotal)}</div>
            <div className="text-xs text-white/50 mt-2">Encaissé : {eur(invoicePaid)}</div>
            <div className="text-xs text-white/50">Retard : {overdueInvoices}</div>
            <button className="text-xs text-blue-300 mt-2" onClick={() => navigate('/admin/invoices')}>
              Voir factures →
            </button>
          </div>

          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10 md:col-span-2">
            <div className="text-xs text-white/60">Debug : projets (3 premiers)</div>
            <pre className="text-[11px] text-white/60 overflow-auto mt-2 max-h-40">
              {JSON.stringify(projects.slice(0, 3), null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </Container>
  )
}