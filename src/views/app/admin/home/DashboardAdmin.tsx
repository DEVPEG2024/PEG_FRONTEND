import Container from '@/components/shared/Container'
import { useEffect, useMemo, useState } from 'react'
import { apiGetDashboardSuperAdminInformations } from '@/services/DashboardSuperAdminService'

type KpiTone = 'neutral' | 'good' | 'warn' | 'bad'
type Kpi = {
  label: string
  value: string
  hint?: string
  tone?: KpiTone
  icon?: string
  accent?: 'blue' | 'green' | 'orange' | 'red'
}

type SeriesPoint = { label: string; a: number; b: number }

type PipelineItem = {
  label: string
  value: number
  color: 'blue' | 'cyan' | 'orange' | 'green' | 'purple'
}

const toneToBorder = (tone?: KpiTone) => {
  if (tone === 'good') return 'rgba(34,197,94,0.6)'
  if (tone === 'warn') return 'rgba(245,158,11,0.7)'
  if (tone === 'bad') return 'rgba(239,68,68,0.7)'
  return 'rgba(59,130,246,0.55)'
}

const accentToLine = (accent?: Kpi['accent']) => {
  if (accent === 'green') return 'rgba(34,197,94,0.8)'
  if (accent === 'orange') return 'rgba(245,158,11,0.8)'
  if (accent === 'red') return 'rgba(239,68,68,0.85)'
  return 'rgba(59,130,246,0.75)'
}

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 18,
      padding: 16,
    }}
  >
    {children}
  </div>
)

const KpiCard = ({ kpi }: { kpi: Kpi }) => (
  <div
    style={{
      position: 'relative',
      background: 'rgba(0,0,0,0.16)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: 16,
      minHeight: 92,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 3,
        height: '100%',
        background: accentToLine(kpi.accent),
      }}
    />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, letterSpacing: 0.6, opacity: 0.75, textTransform: 'uppercase' }}>{kpi.label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{kpi.value}</div>
        {kpi.hint ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: kpi.tone === 'good' ? 'rgba(34,197,94,0.95)' : 'rgba(255,255,255,0.65)',
            }}
          >
            {kpi.hint}
          </div>
        ) : null}
      </div>

      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${toneToBorder(kpi.tone)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.95,
          fontSize: 14,
        }}
        title={kpi.label}
      >
        {kpi.icon ?? '•'}
      </div>
    </div>
  </div>
)

function SvgGroupedBars({
  title,
  aLabel,
  bLabel,
  data,
}: {
  title: string
  aLabel: string
  bLabel: string
  data: SeriesPoint[]
}) {
  const W = 780
  const H = 260
  const padL = 42
  const padR = 14
  const padT = 26
  const padB = 34

  const maxVal = useMemo(() => {
    let m = 0
    for (const p of data) m = Math.max(m, p.a, p.b)
    return Math.max(1, m)
  }, [data])

  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const groupW = data.length ? plotW / data.length : plotW
  const barW = Math.min(28, Math.max(14, groupW * 0.22))
  const gap = Math.min(10, Math.max(6, groupW * 0.08))

  const y = (v: number) => padT + (1 - v / maxVal) * plotH

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Basé sur tes données Strapi (GraphQL)</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, opacity: 0.8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(59,130,246,0.9)', display: 'inline-block' }} />
            {aLabel}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(34,197,94,0.9)', display: 'inline-block' }} />
            {bLabel}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260" role="img" aria-label={title}>
          {Array.from({ length: 5 }).map((_, i) => {
            const yy = padT + (plotH * i) / 4
            return <line key={i} x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="rgba(255,255,255,0.08)" />
          })}

          {data.map((p, i) => {
            const cx = padL + i * groupW + groupW / 2
            const x1 = cx - barW - gap / 2
            const x2 = cx + gap / 2

            const aY = y(p.a)
            const bY = y(p.b)

            return (
              <g key={`${p.label}-${i}`}>
                <rect x={x1} y={aY} width={barW} height={padT + plotH - aY} rx={6} fill="rgba(59,130,246,0.9)" />
                <rect x={x2} y={bY} width={barW} height={padT + plotH - bY} rx={6} fill="rgba(34,197,94,0.9)" />
                <text x={cx} y={H - 12} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.6)">
                  {p.label.length > 10 ? `${p.label.slice(0, 10)}…` : p.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function SvgPipeline({ title, items }: { title: string; items: PipelineItem[] }) {
  const max = useMemo(() => Math.max(...items.map((i) => i.value), 1), [items])

  const color = (c: PipelineItem['color']) => {
    if (c === 'blue') return 'rgba(59,130,246,0.95)'
    if (c === 'cyan') return 'rgba(56,189,248,0.95)'
    if (c === 'orange') return 'rgba(245,158,11,0.95)'
    if (c === 'green') return 'rgba(34,197,94,0.95)'
    return 'rgba(168,85,247,0.95)'
  }

  return (
    <div>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((it) => {
          const pct = (it.value / max) * 100
          return (
            <div key={it.label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 50px', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{it.label}</div>
              <div
                style={{
                  height: 16,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: `${pct}%`, height: '100%', background: color(it.color) }} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, textAlign: 'right' }}>{it.value}</div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.6 }}>
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function eur(n: number) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${Math.round(n)} €`
  }
}

function toCountByState(items: Array<{ state?: string | null }>): { label: string; count: number }[] {
  const m = new Map<string, number>()
  for (const it of items) {
    const s = (it?.state ?? 'unknown').toString()
    m.set(s, (m.get(s) ?? 0) + 1)
  }
  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

const DashboardAdmin = () => {
  const [month, setMonth] = useState('Mars 2026')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [projectsTotal, setProjectsTotal] = useState<number>(0)
  const [customersTotal, setCustomersTotal] = useState<number>(0)
  const [producersTotal, setProducersTotal] = useState<number>(0)
  const [ticketsTotal, setTicketsTotal] = useState<number>(0)
  const [invoicesCount, setInvoicesCount] = useState<number>(0)

  const [invoicesStats, setInvoicesStats] = useState<{ totalAmount: number; paidAmount: number; pendingAmount: number }>({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  })

  const [projectsByState, setProjectsByState] = useState<{ label: string; count: number }[]>([])
  const [ticketsByState, setTicketsByState] = useState<{ label: string; count: number }[]>([])

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await apiGetDashboardSuperAdminInformations()

        // GraphQL Strapi -> souvent: res.data.data
        const gql = (res as any)?.data?.data ?? (res as any)?.data ?? null
        if (!gql) throw new Error('Réponse GraphQL vide')

        const projectsNodes = gql?.projects_connection?.nodes ?? []
        const projectsTotalCount = gql?.projects_connection?.pageInfo?.total ?? 0
        const customersCount = gql?.customers_connection?.pageInfo?.total ?? 0
        const producersCount = gql?.producers_connection?.pageInfo?.total ?? 0

        const ticketsNodes = gql?.tickets_connection?.nodes ?? []
        const ticketsTotalCount = gql?.tickets_connection?.pageInfo?.total ?? 0

        const invoicesNodes = gql?.invoices_connection?.nodes ?? []

        // invoicesStats réels (depuis invoices_connection)
        const totalAmount = invoicesNodes.reduce((acc: number, inv: any) => acc + (Number(inv?.totalAmount) || 0), 0)
        const paidAmount = invoicesNodes.reduce((acc: number, inv: any) => {
          const pay = (inv?.paymentState ?? inv?.state ?? '').toString().toLowerCase()
          const isPaid = pay.includes('paid') || pay.includes('pay') || pay.includes('settled')
          return acc + (isPaid ? (Number(inv?.totalAmount) || 0) : 0)
        }, 0)
        const pendingAmount = Math.max(0, totalAmount - paidAmount)

        setProjectsTotal(projectsTotalCount)
        setCustomersTotal(customersCount)
        setProducersTotal(producersCount)
        setTicketsTotal(ticketsTotalCount)
        setInvoicesCount(invoicesNodes.length)

        setInvoicesStats({ totalAmount, paidAmount, pendingAmount })

        setProjectsByState(toCountByState(projectsNodes).map((x) => ({ label: x.label, count: x.count })))
        setTicketsByState(toCountByState(ticketsNodes).map((x) => ({ label: x.label, count: x.count })))
      } catch (e: any) {
        setError(e?.message ?? 'Erreur dashboard')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [month])

  // KPI cards (réels)
  const kpis: Kpi[] = [
    { label: 'CA total (factures)', value: eur(invoicesStats.totalAmount), icon: '€', accent: 'blue' },
    { label: 'Encaissé', value: eur(invoicesStats.paidAmount), icon: '✅', tone: 'good', accent: 'green' },
    { label: 'En attente', value: eur(invoicesStats.pendingAmount), icon: '⏳', tone: invoicesStats.pendingAmount > 0 ? 'warn' : 'neutral', accent: 'orange' },
    { label: 'Projets', value: String(projectsTotal), icon: '📦', accent: 'blue' },
    { label: 'Clients', value: String(customersTotal), icon: '👥', accent: 'blue' },
    { label: 'Producteurs', value: String(producersTotal), icon: '🏭', accent: 'blue' },
    { label: 'Tickets', value: String(ticketsTotal), icon: '🎫', tone: ticketsTotal > 0 ? 'warn' : 'neutral', accent: 'orange' },
    { label: 'Factures (liste)', value: String(invoicesCount), icon: '🧾', accent: 'blue' },
    { label: 'Qualité', value: '—', hint: 'à brancher si tu as un champ QC', icon: '🧪', accent: 'blue' },
  ]

  // Graphique gauche: comparaison "Projets vs Tickets" par état (top 8 états)
  const chartData: SeriesPoint[] = useMemo(() => {
    const map = new Map<string, { a: number; b: number }>()
    for (const p of projectsByState) map.set(p.label, { a: p.count, b: 0 })
    for (const t of ticketsByState) {
      const cur = map.get(t.label) ?? { a: 0, b: 0 }
      map.set(t.label, { a: cur.a, b: t.count })
    }
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, a: v.a, b: v.b }))
      .sort((x, y) => (y.a + y.b) - (x.a + x.b))
      .slice(0, 8)
  }, [projectsByState, ticketsByState])

  // Pipeline droite: tickets par statut (top 8)
  const palette = ['blue', 'cyan', 'orange', 'green', 'purple'] as const
  const pipeline: PipelineItem[] = useMemo(() => {
    return ticketsByState
      .slice(0, 8)
      .map((t, idx) => ({
        label: t.label,
        value: t.count,
        color: palette[idx % palette.length],
      }))
  }, [ticketsByState])

  return (
    <Container>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Tableau de bord</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>Vue d’ensemble opérationnelle — {month}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.85)',
              padding: '10px 12px',
              borderRadius: 12,
              outline: 'none',
            }}
          >
            <option>Janvier 2026</option>
            <option>Février 2026</option>
            <option>Mars 2026</option>
          </select>

          <button
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.85)',
              padding: '10px 12px',
              borderRadius: 12,
              cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            ⟳
          </button>
        </div>
      </div>

      {loading ? <div style={{ opacity: 0.7, marginBottom: 10 }}>Chargement des stats…</div> : null}
      {error ? <div style={{ color: 'rgba(239,68,68,0.9)', marginBottom: 10 }}>{error}</div> : null}

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14 }}>
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      {/* Charts */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        <Panel>
          <SvgGroupedBars title="Répartition par statut" aLabel="Projets" bLabel="Tickets" data={chartData} />
          {!chartData.length && !loading ? <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>Aucune donnée</div> : null}
        </Panel>

        <Panel>
          <SvgPipeline title="Tickets par statut" items={pipeline} />
          {!pipeline.length && !loading ? <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>Aucune donnée</div> : null}
        </Panel>
      </div>

      {/* Responsive */}
      <style>
        {`
          @media (max-width: 1400px) {
            div[style*="grid-template-columns: repeat(5"] { grid-template-columns: repeat(4, minmax(0,1fr)) !important; }
          }
          @media (max-width: 1100px) {
            div[style*="grid-template-columns: repeat(5"], div[style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(3, minmax(0,1fr)) !important; }
          }
          @media (max-width: 900px) {
            div[style*="grid-template-columns: 1.2fr 1fr"] { grid-template-columns: 1fr !important; }
            div[style*="grid-template-columns: repeat(5"], div[style*="grid-template-columns: repeat(4"], div[style*="grid-template-columns: repeat(3"] {
              grid-template-columns: repeat(2, minmax(0,1fr)) !important;
            }
          }
          @media (max-width: 560px) {
            div[style*="grid-template-columns: repeat(2"] { grid-template-columns: repeat(1, minmax(0,1fr)) !important; }
          }
        `}
      </style>
    </Container>
  )
}

export default DashboardAdmin