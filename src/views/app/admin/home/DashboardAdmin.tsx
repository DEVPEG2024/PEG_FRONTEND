import Container from '@/components/shared/Container'
import ApiService from '@/services/ApiService'
import { useEffect, useMemo, useState } from 'react'

/**
 * ✅ À ADAPTER (1 seule ligne)
 * Mets ici l'endpoint Strapi qui renvoie les stats dashboard super admin.
 * Exemples possibles:
 * - '/api/dashboard/super-admin'
 * - '/api/dashboard-super-admin'
 * - '/api/super-admin/dashboard'
 */
const DASHBOARD_ENDPOINT = '/api/dashboard/super-admin'

type KpiTone = 'neutral' | 'good' | 'warn' | 'bad'

type Kpi = {
  label: string
  value: string
  hint?: string
  tone?: KpiTone
  icon?: string
  accent?: 'blue' | 'green' | 'orange' | 'red'
}

type SeriesPoint = { label: string; ca: number; marge: number }
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
        <div style={{ fontSize: 12, letterSpacing: 0.6, opacity: 0.75, textTransform: 'uppercase' }}>
          {kpi.label}
        </div>
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
  subtitle,
  data,
}: {
  title: string
  subtitle?: string
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
    for (const p of data) m = Math.max(m, p.ca, p.marge)
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
          {subtitle ? <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{subtitle}</div> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, opacity: 0.8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(59,130,246,0.9)', display: 'inline-block' }} />
            CA HT
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(34,197,94,0.9)', display: 'inline-block' }} />
            Marge HT
          </span>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260" role="img" aria-label={title}>
          {Array.from({ length: 5 }).map((_, i) => {
            const yy = padT + (plotH * i) / 4
            return (
              <line
                key={i}
                x1={padL}
                x2={W - padR}
                y1={yy}
                y2={yy}
                stroke="rgba(255,255,255,0.08)"
              />
            )
          })}

          {data.map((p, i) => {
            const cx = padL + i * groupW + groupW / 2
            const x1 = cx - barW - gap / 2
            const x2 = cx + gap / 2

            const caY = y(p.ca)
            const mgY = y(p.marge)

            return (
              <g key={`${p.label}-${i}`}>
                <rect x={x1} y={caY} width={barW} height={padT + plotH - caY} rx={6} fill="rgba(59,130,246,0.9)" />
                <rect x={x2} y={mgY} width={barW} height={padT + plotH - mgY} rx={6} fill="rgba(34,197,94,0.9)" />
                <text x={cx} y={H - 12} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.6)">
                  {p.label}
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
            <div key={it.label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 50px', gap: 12, alignItems: 'center' }}>
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

const DashboardAdmin = () => {
  const [month, setMonth] = useState('Mars 2026')

  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔥 Charge les stats depuis Strapi à chaque changement de mois
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        // ⚠️ Strapi peut attendre un query param (ex: ?month=Mars%202026)
        const res = await ApiService.fetchData({
          url: DASHBOARD_ENDPOINT,
          method: 'get',
          params: { month },
        })

        // selon ton ApiService, les données peuvent être:
        // - res.data
        // - res.data.data (Strapi)
        // - res directement
        const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res
        setStats(payload)
      } catch (e: any) {
        setError(e?.message ?? 'Erreur dashboard')
        setStats(null)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [month])

  // Conversions / fallback
  const apiKpis = stats?.kpis ?? {}
  const apiSeries = Array.isArray(stats?.series6mois) ? stats.series6mois : []
  const apiPipeline = Array.isArray(stats?.pipeline) ? stats.pipeline : []

  const kpis: Kpi[] = [
    {
      label: 'CA HT (mois)',
      value: apiKpis.caHT != null ? `${Math.round(apiKpis.caHT / 1000)}k €` : '—',
      hint: apiKpis.caVsPrevPct != null ? `↑ ${apiKpis.caVsPrevPct}% vs mois précédent` : undefined,
      tone: apiKpis.caVsPrevPct > 0 ? 'good' : 'neutral',
      icon: '€',
      accent: 'blue',
    },
    {
      label: 'Marge HT',
      value: apiKpis.margeHT != null ? `${Math.round(apiKpis.margeHT / 1000)}k €` : '—',
      hint: apiKpis.margeVsPrevPct != null ? `↑ ${apiKpis.margeVsPrevPct}% vs mois précédent` : undefined,
      tone: apiKpis.margeVsPrevPct > 0 ? 'good' : 'neutral',
      icon: '↗',
      accent: 'green',
    },
    {
      label: 'Marge %',
      value: apiKpis.margePct != null ? `${apiKpis.margePct}%` : '—',
      hint: 'Objectif : 35%',
      tone: 'neutral',
      icon: '%',
      accent: 'blue',
    },
    { label: 'Projets en cours', value: apiKpis.projetsEnCours != null ? String(apiKpis.projetsEnCours) : '—', icon: '📦', accent: 'blue' },
    { label: 'Projets à risque', value: apiKpis.projetsARisque != null ? String(apiKpis.projetsARisque) : '—', tone: 'bad', icon: '⚠️', accent: 'red' },
    { label: 'Devis en attente', value: apiKpis.devisEnAttente != null ? String(apiKpis.devisEnAttente) : '—', icon: '📄', accent: 'blue' },
    { label: 'Factures en retard', value: apiKpis.facturesEnRetard != null ? String(apiKpis.facturesEnRetard) : '—', tone: 'warn', icon: '⏳', accent: 'orange' },
    { label: 'Délai moyen', value: apiKpis.delaiMoyenJours != null ? `${apiKpis.delaiMoyenJours}j` : '—', hint: 'Livraison', icon: '🕒', accent: 'blue' },
    { label: 'Taux qualité', value: apiKpis.tauxQualitePct != null ? `${apiKpis.tauxQualitePct}%` : '—', hint: 'QC pass rate', tone: 'good', icon: '✅', accent: 'green' },
  ]

  // Charts: on affiche en "k€" (comme tes bars fake)
  const series: SeriesPoint[] = apiSeries.map((p: any, idx: number) => ({
    label: p.label ?? `M${idx + 1}`,
    ca: Math.round(((p.ca ?? 0) as number) / 1000),
    marge: Math.round(((p.marge ?? 0) as number) / 1000),
  }))

  const palette = ['blue', 'cyan', 'orange', 'green', 'purple'] as const
  const pipeline: PipelineItem[] = apiPipeline.map((p: any, idx: number) => ({
    label: p.label ?? `Step ${idx + 1}`,
    value: Number(p.value ?? 0),
    color: palette[idx % palette.length],
  }))

  return (
    <Container>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Tableau de bord</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
            Vue d’ensemble opérationnelle — {month}
          </div>
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

      {/* States */}
      {loading ? <div style={{ opacity: 0.7, marginBottom: 10 }}>Chargement…</div> : null}
      {error ? <div style={{ color: 'rgba(239,68,68,0.9)', marginBottom: 10 }}>{error}</div> : null}

      {/* KPI grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      {/* Charts */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        <Panel>
          <SvgGroupedBars title="Chiffre d'affaires & marge (6 mois)" data={series.length ? series : []} />
          {!series.length && !loading ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>Aucune donnée (series6mois)</div>
          ) : null}
        </Panel>

        <Panel>
          <SvgPipeline title="Pipeline commercial" items={pipeline.length ? pipeline : []} />
          {!pipeline.length && !loading ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>Aucune donnée (pipeline)</div>
          ) : null}
        </Panel>
      </div>

      {/* Responsive hacks (comme ton code) */}
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