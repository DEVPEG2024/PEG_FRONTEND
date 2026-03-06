import Container from '@/components/shared/Container'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiGetDashboardSuperAdminInformations } from '@/services/DashboardSuperAdminService'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
dayjs.extend(isoWeek)
dayjs.locale('fr')

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

function monthKey(d: Date) {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [, mm] = key.split('-')
  const m = Number(mm) - 1
  const names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  return names[m] ?? key
}

/** ========= UI (self-contained) ========= */

type KpiVariant = 'default' | 'success' | 'warning' | 'danger'

function kpiRing(variant: KpiVariant) {
  if (variant === 'success') return 'ring-1 ring-emerald-400/25'
  if (variant === 'warning') return 'ring-1 ring-amber-400/25'
  if (variant === 'danger') return 'ring-1 ring-rose-400/25'
  return 'ring-1 ring-sky-400/15'
}

function kpiAccent(variant: KpiVariant) {
  if (variant === 'success') return 'from-emerald-500/20 to-emerald-500/0'
  if (variant === 'warning') return 'from-amber-500/20 to-amber-500/0'
  if (variant === 'danger') return 'from-rose-500/20 to-rose-500/0'
  return 'from-sky-500/18 to-sky-500/0'
}

function KPI({
  title,
  value,
  subtitle,
  hint,
  icon,
  variant = 'default',
  onClick,
}: {
  title: string
  value: string
  subtitle?: string
  hint?: string
  icon?: string
  variant?: KpiVariant
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={[
        'relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4',
        kpiRing(variant),
        onClick ? 'cursor-pointer hover:bg-white/[0.055] transition' : '',
      ].join(' ')}
      title={onClick ? 'Cliquer pour ouvrir' : title}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${kpiAccent(variant)}`} />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-white/55">{title}</div>
          <div className="mt-1 text-2xl font-extrabold text-white">{value}</div>
          {subtitle ? <div className="mt-1 text-xs text-white/45">{subtitle}</div> : null}
          {hint ? <div className="mt-2 text-xs text-white/60">{hint}</div> : null}
          {onClick ? <div className="mt-2 text-[11px] text-sky-300/80">Ouvrir →</div> : null}
        </div>

        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80">
          {icon ?? '•'}
        </div>
      </div>
    </div>
  )
}

function Panel({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-white/50">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children}
    </div>
  )
}

/** Chart barres ultra simple en SVG (pas de lib) */
function BarsChart({
  data,
  leftLabel = 'CA',
  rightLabel = 'Marge',
}: {
  data: { label: string; ca: number; marge: number }[]
  leftLabel?: string
  rightLabel?: string
}) {
  const W = 760
  const H = 220
  const padL = 34
  const padR = 12
  const padT = 14
  const padB = 30

  const maxVal = useMemo(() => {
    let m = 1
    for (const p of data) m = Math.max(m, p.ca, p.marge)
    return m
  }, [data])

  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const groupW = data.length ? plotW / data.length : plotW
  const barW = Math.max(10, Math.min(26, groupW * 0.22))
  const gap = Math.max(6, Math.min(10, groupW * 0.08))

  const y = (v: number) => padT + (1 - v / maxVal) * plotH

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-white/65">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded bg-sky-400/90" />
          {leftLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-400/90" />
          {rightLabel}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" role="img" aria-label="Chart">
        {Array.from({ length: 5 }).map((_, i) => {
          const yy = padT + (plotH * i) / 4
          return <line key={i} x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="rgba(255,255,255,0.08)" />
        })}

        {data.map((p, i) => {
          const cx = padL + i * groupW + groupW / 2
          const x1 = cx - barW - gap / 2
          const x2 = cx + gap / 2
          const caY = y(p.ca)
          const mgY = y(p.marge)

          return (
            <g key={p.label}>
              <rect x={x1} y={caY} width={barW} height={padT + plotH - caY} rx={6} fill="rgba(56,189,248,0.92)" />
              <rect x={x2} y={mgY} width={barW} height={padT + plotH - mgY} rx={6} fill="rgba(52,211,153,0.92)" />
              <text x={cx} y={H - 10} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.55)">
                {p.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function PipelineBars({
  items,
  onClick,
}: {
  items: { label: string; value: number }[]
  onClick?: (label: string) => void
}) {
  const max = useMemo(() => Math.max(...items.map((i) => i.value), 1), [items])

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const pct = Math.round((it.value / max) * 100)
        return (
          <div key={it.label} className="grid grid-cols-[120px_1fr_44px] items-center gap-3">
            <button
              type="button"
              onClick={() => onClick?.(it.label)}
              className={[
                'text-left text-xs text-white/70 truncate',
                onClick ? 'hover:text-white transition' : '',
              ].join(' ')}
              title={onClick ? 'Cliquer pour filtrer' : it.label}
            >
              {it.label}
            </button>

            <div className="h-3.5 rounded-full border border-white/10 bg-white/[0.04] overflow-hidden">
              <div className="h-full bg-sky-400/80" style={{ width: `${pct}%` }} />
            </div>

            <div className="text-right text-xs text-white/60">{it.value}</div>
          </div>
        )
      })}
    </div>
  )
}

function TableMini({
  rows,
  onRowClick,
}: {
  rows: { left: string; right: string; sub?: string }[]
  onRowClick?: (idx: number) => void
}) {
  return (
    <div className="divide-y divide-white/10">
      {rows.length === 0 ? <div className="text-xs text-white/55">Aucune donnée.</div> : null}
      {rows.map((r, idx) => (
        <div
          key={idx}
          onClick={() => onRowClick?.(idx)}
          className={['py-2 flex items-start justify-between gap-3', onRowClick ? 'cursor-pointer hover:bg-white/[0.03] px-2 -mx-2 rounded-lg transition' : ''].join(' ')}
        >
          <div className="min-w-0">
            <div className="text-sm text-white/85 truncate">{r.left}</div>
            {r.sub ? <div className="text-xs text-white/50 truncate">{r.sub}</div> : null}
          </div>
          <div className="text-sm text-white/60 shrink-0">{r.right}</div>
        </div>
      ))}
    </div>
  )
}

/** ========= Calendar Widget ========= */

const CAL_STORAGE_KEY = 'peg:calendarEvents'
const CAT_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  production: { dot: 'bg-orange-500', bg: 'bg-orange-500/10 border border-orange-500/20', text: 'text-orange-300' },
  réunion:    { dot: 'bg-sky-500',    bg: 'bg-sky-500/10 border border-sky-500/20',        text: 'text-sky-300'    },
  livraison:  { dot: 'bg-emerald-500',bg: 'bg-emerald-500/10 border border-emerald-500/20',text: 'text-emerald-300'},
  autre:      { dot: 'bg-violet-500', bg: 'bg-violet-500/10 border border-violet-500/20',  text: 'text-violet-300' },
}

interface RawCalEvent { id: number; title: string; start: string; end: string; category: string }

function useCalendarEvents() {
  const [events, setEvents] = useState<RawCalEvent[]>([])
  useEffect(() => {
    const raw = localStorage.getItem(CAL_STORAGE_KEY)
    if (raw) {
      try { setEvents(JSON.parse(raw)) } catch { /* noop */ }
    }
  }, [])
  return events
}

function CalEventRow({ ev }: { ev: RawCalEvent }) {
  const start = dayjs(ev.start)
  const end = dayjs(ev.end)
  const cat = CAT_COLORS[ev.category] ?? CAT_COLORS.autre
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2 ${cat.bg}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${cat.dot}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold truncate ${cat.text}`}>{ev.title}</div>
        <div className="text-xs text-white/40">{start.format('HH:mm')} – {end.format('HH:mm')}</div>
      </div>
    </div>
  )
}

function CalendarWidget() {
  const events = useCalendarEvents()
  const today = dayjs()
  const weekStart = today.startOf('isoWeek')
  const weekEnd = today.endOf('isoWeek')

  const todayEvents = events
    .filter((e) => dayjs(e.start).isSame(today, 'day'))
    .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())

  const weekEvents = events
    .filter((e) => {
      const s = dayjs(e.start)
      return s.isAfter(weekStart.subtract(1, 'ms')) && s.isBefore(weekEnd.add(1, 'ms')) && !s.isSame(today, 'day')
    })
    .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())
    .slice(0, 6)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Aujourd'hui */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white capitalize">
              📅 Aujourd'hui — {today.format('dddd D MMMM')}
            </div>
            <div className="mt-1 text-xs text-white/50">{todayEvents.length} événement{todayEvents.length !== 1 ? 's' : ''}</div>
          </div>
          <Link to="/admin/calendar" className="text-xs text-sky-300/80 hover:text-sky-200 transition shrink-0">
            Ouvrir →
          </Link>
        </div>
        {todayEvents.length === 0 ? (
          <div className="text-xs text-white/35 py-3 text-center">Aucun événement aujourd'hui</div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((ev) => <CalEventRow key={ev.id} ev={ev} />)}
          </div>
        )}
      </div>

      {/* Cette semaine */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">
              🗓️ Cette semaine
            </div>
            <div className="mt-1 text-xs text-white/50">
              {weekStart.format('D MMM')} – {weekEnd.format('D MMM')} · {weekEvents.length} autre{weekEvents.length !== 1 ? 's' : ''} événement{weekEvents.length !== 1 ? 's' : ''}
            </div>
          </div>
          <Link to="/admin/calendar" className="text-xs text-sky-300/80 hover:text-sky-200 transition shrink-0">
            Calendrier →
          </Link>
        </div>
        {weekEvents.length === 0 ? (
          <div className="text-xs text-white/35 py-3 text-center">Aucun autre événement cette semaine</div>
        ) : (
          <div className="space-y-2">
            {weekEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3">
                <div className="text-xs text-white/35 w-12 shrink-0 text-right">{dayjs(ev.start).format('ddd D')}</div>
                <CalEventRow ev={ev} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** ========= Page ========= */

export default function DashboardAdmin() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Banner (simple) : on stocke l’image seulement en localStorage
  // (Plus tard on branchera Strapi settings, mais là tu voulais SIMPLE et fonctionnel)
  const [bannerUrl, setBannerUrl] = useState<string>(() => localStorage.getItem('peg:dashboardBanner') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gql, setGql] = useState<any>(null)

  const [month, setMonth] = useState('Mars 2026')
  const [refreshTick, setRefreshTick] = useState(0)

  const fetchDashboard = async () => {
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

  useEffect(() => {
    fetchDashboard()
  }, [month, refreshTick])

  // Rafraîchissement automatique quand l'onglet redevient visible
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setRefreshTick((t) => t + 1)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const projects = gql?.projects_connection?.nodes ?? []
  const invoices = gql?.invoices_connection?.nodes ?? []
  const tickets = gql?.tickets_connection?.nodes ?? []
  const orderItems = gql?.orderItems_connection?.nodes ?? []
  const transactions = gql?.transactions_connection?.nodes ?? []

  const projectsTotal = gql?.projects_connection?.pageInfo?.total ?? 0
  const customersTotal = gql?.customers_connection?.pageInfo?.total ?? 0
  const producersTotal = gql?.producers_connection?.pageInfo?.total ?? 0
  const ticketsTotal = gql?.tickets_connection?.pageInfo?.total ?? 0
  const orderItemsTotal = gql?.orderItems_connection?.pageInfo?.total ?? 0

  const invoiceTotal = useMemo(
    () => invoices.reduce((a: number, x: any) => a + (Number(x?.totalAmount) || 0), 0),
    [invoices]
  )

  const invoicePaid = useMemo(() => {
    return invoices.reduce((a: number, x: any) => {
      const ps = (x?.paymentState ?? '').toString().toLowerCase()
      const st = (x?.state ?? '').toString().toLowerCase()
      const paid =
        ps === 'fulfilled' ||
        st === 'fulfilled' ||
        ps.includes('paid') ||
        ps === 'paye' ||
        st.includes('paid')
      return a + (paid ? (Number(x?.totalAmount) || 0) : 0)
    }, 0)
  }, [invoices])

  const invoicePending = Math.max(0, invoiceTotal - invoicePaid)

  const overdueInvoices = useMemo(() => {
    const now = new Date()
    return invoices.filter((x: any) => {
      const d = safeDate(x?.dueDate) ?? safeDate(x?.date)
      if (!d) return false
      const ps = (x?.paymentState ?? '').toString().toLowerCase()
      const st = (x?.state ?? '').toString().toLowerCase()
      const paid =
        ps === 'fulfilled' ||
        st === 'fulfilled' ||
        ps.includes('paid') ||
        ps === 'paye'
      return d.getTime() < now.getTime() && !paid
    }).length
  }, [invoices])

  const atRiskProjects = useMemo(() => {
    const now = new Date()
    return projects.filter((p: any) => {
      const end = safeDate(p?.endDate)
      if (!end) return false
      const state = (p?.state ?? '').toString().toLowerCase()
      const done = state.includes('done') || state.includes('closed') || state.includes('term') || state.includes('livr')
      return end.getTime() < now.getTime() && !done
    }).length
  }, [projects])

  const avgDeliveryDays = useMemo(() => {
    const pairs = projects
      .map((p: any) => ({ s: safeDate(p?.startDate), e: safeDate(p?.endDate) }))
      .filter((x: any) => x.s && x.e)
    if (!pairs.length) return 0
    const days = pairs.reduce((a: number, x: any) => a + Math.max(0, (x.e.getTime() - x.s.getTime()) / 86400000), 0)
    return Math.round(days / pairs.length)
  }, [projects])

  const revenue6m = useMemo(() => {
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(monthKey(d))
    }
    const by = new Map<string, { ca: number; costs: number }>()
    months.forEach((k) => by.set(k, { ca: 0, costs: 0 }))

    for (const inv of invoices) {
      const d = safeDate(inv?.date)
      if (!d) continue
      const k = monthKey(d)
      if (!by.has(k)) continue
      by.set(k, { ...by.get(k)!, ca: by.get(k)!.ca + (Number(inv?.totalAmount) || 0) })
    }

    for (const tx of transactions) {
      const d = safeDate(tx?.date)
      if (!d) continue
      const k = monthKey(d)
      if (!by.has(k)) continue
      by.set(k, { ...by.get(k)!, costs: by.get(k)!.costs + (Number(tx?.amount) || 0) })
    }

    return months.map((k) => {
      const b = by.get(k)!
      return { label: monthLabel(k), ca: b.ca, marge: Math.max(0, b.ca - b.costs) }
    })
  }, [invoices, transactions])

  const pipeline = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of projects) {
      const s = (p?.state ?? 'unknown').toString()
      m.set(s, (m.get(s) ?? 0) + 1)
    }
    return Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [projects])

  const topProducers = useMemo(() => {
    const map = new Map<string, { projects: number; revenue: number }>()
    for (const p of projects) {
      const name = p?.producer?.name ?? '—'
      const cur = map.get(name) ?? { projects: 0, revenue: 0 }
      map.set(name, { projects: cur.projects + 1, revenue: cur.revenue + (Number(p?.price) || 0) })
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, projects: v.projects, revenue: v.revenue }))
      .sort((a, b) => (b.projects - a.projects) || (b.revenue - a.revenue))
      .slice(0, 6)
  }, [projects])

  const activity = useMemo(() => {
    const items: { ts: number; left: string; right: string; sub?: string }[] = []

    for (const inv of invoices.slice(0, 30)) {
      const d = safeDate(inv?.date)
      if (!d) continue
      items.push({
        ts: d.getTime(),
        left: `${inv?.customer?.name ?? 'Client'} — Facture ${inv?.name ?? inv?.documentId ?? ''}`,
        right: eur(Number(inv?.totalAmount) || 0),
        sub: `${inv?.paymentState ?? inv?.state ?? ''} • ${d.toLocaleString('fr-FR')}`,
      })
    }

    for (const p of projects.slice(0, 30)) {
      const d = safeDate(p?.startDate) ?? safeDate(p?.endDate)
      if (!d) continue
      items.push({
        ts: d.getTime(),
        left: `${p?.customer?.name ?? 'Client'} — Projet ${p?.name ?? ''}`,
        right: (p?.state ?? '').toString(),
        sub: `${p?.producer?.name ?? '—'} • ${d.toLocaleString('fr-FR')}`,
      })
    }

    return items.sort((a, b) => b.ts - a.ts).slice(0, 8)
  }, [invoices, projects])

  const openTickets = useMemo(() => {
    return tickets.filter((t: any) => !String(t?.state ?? '').toLowerCase().includes('closed')).length
  }, [tickets])

  // Marge brute = CA - coûts (transactions sortantes/producteurs)
  const totalCosts = useMemo(
    () => transactions.reduce((a: number, x: any) => a + (Number(x?.amount) || 0), 0),
    [transactions]
  )
  const margeBrute = Math.max(0, invoiceTotal - totalCosts)
  const margePct = invoiceTotal > 0 ? Math.round((margeBrute / invoiceTotal) * 100) : 0

  // Top clients par CA facturé
  const topClients = useMemo(() => {
    const map = new Map<string, number>()
    for (const inv of invoices) {
      const name = inv?.customer?.name ?? '—'
      map.set(name, (map.get(name) ?? 0) + (Number(inv?.totalAmount) || 0))
    }
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
  }, [invoices])

  // Échéances à venir (14 jours)
  const upcomingDeadlines = useMemo(() => {
    const now = new Date()
    const in14 = new Date(now.getTime() + 14 * 86400000)
    return projects
      .filter((p: any) => {
        const end = safeDate(p?.endDate)
        if (!end) return false
        const state = (p?.state ?? '').toString().toLowerCase()
        const done = state.includes('done') || state.includes('closed') || state.includes('term') || state.includes('livr')
        return !done && end.getTime() >= now.getTime() && end.getTime() <= in14.getTime()
      })
      .sort((a: any, b: any) => (safeDate(a?.endDate)?.getTime() ?? 0) - (safeDate(b?.endDate)?.getTime() ?? 0))
      .slice(0, 6)
      .map((p: any) => {
        const end = safeDate(p?.endDate)!
        const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000)
        return {
          left: p?.name ?? p?.documentId ?? '—',
          sub: `${p?.customer?.name ?? '—'} • ${p?.producer?.name ?? '—'}`,
          right: `J-${daysLeft}`,
          urgent: daysLeft <= 3,
        }
      })
  }, [projects])

  // Commandes par état
  const ordersByState = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of orderItems) {
      const s = (o?.state ?? 'inconnu').toString()
      m.set(s, (m.get(s) ?? 0) + 1)
    }
    return Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [orderItems])

  const onPickBanner = () => fileRef.current?.click()

  const onBannerFile = async (file?: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setBannerUrl(url)
    localStorage.setItem('peg:dashboardBanner', url)
  }

  const routeForKpi = (title: string) => {
    switch (title) {
      case 'Projets':
      case 'Projets à risque':
        return '/common/projects'
      case 'Clients':
        return '/admin/customers/list'
      case 'Producteurs':
        return '/admin/producers/list'
      case 'Tickets':
        return '/support'
      case 'Factures':
      case 'CA total':
      case 'Encaissé':
      case 'En attente':
      case 'Factures en retard':
        return '/admin/invoices'
      default:
        return null
    }
  }

  return (
    <Container>
      <div className="space-y-6">

        {/* PREMIUM BANNER 20x5 */}
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"
          style={{ aspectRatio: '4 / 1' }} // 20:5 = 4:1
        >
          {bannerUrl ? (
            <img src={bannerUrl} alt="Dashboard banner" className="h-full w-full object-cover opacity-95" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-sky-500/15 via-white/0 to-emerald-500/10" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/0" />

          <div className="absolute left-5 top-5">
            <div className="text-white text-lg font-extrabold">Tableau de bord</div>
            <div className="text-white/65 text-sm">Vue d’ensemble opérationnelle — {month}</div>
          </div>

          <div className="absolute right-4 top-4 flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-white/10 border border-white/15 text-white/85 px-3 py-2 rounded-xl outline-none"
            >
              <option>Mars 2026</option>
              <option>Février 2026</option>
              <option>Janvier 2026</option>
            </select>

            <button
              onClick={onPickBanner}
              className="bg-white/10 border border-white/15 text-white/85 px-3 py-2 rounded-xl hover:bg-white/15 transition"
              title="Changer la bannière"
            >
              Changer
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onBannerFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <button
            onClick={onPickBanner}
            className="absolute bottom-4 right-4 text-xs text-white/70 hover:text-white transition"
            title="Clique sur la bannière pour la changer"
          >
            Cliquer pour modifier la bannière →
          </button>
        </div>

        {/* STATUS */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-white/60">
            {loading ? 'Chargement…' : null}
            {error ? <span className="text-rose-300">{error}</span> : null}
          </div>

          <button
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/75 hover:bg-white/[0.06] transition"
          >
            Rafraîchir
          </button>
        </div>

        {/* KPI ROW 1 — Finances */}
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-white/40">Finances</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPI title="CA total" value={eur(invoiceTotal)} icon="€" onClick={() => navigate(routeForKpi('CA total')!)} />
            <KPI title="Encaissé" value={eur(invoicePaid)} icon="✅" variant="success" onClick={() => navigate(routeForKpi('Encaissé')!)} />
            <KPI title="En attente" value={eur(invoicePending)} icon="⏳" variant={invoicePending > 0 ? 'warning' : 'default'} onClick={() => navigate(routeForKpi('En attente')!)} />
            <KPI
              title="Marge brute"
              value={eur(margeBrute)}
              subtitle={`${margePct}% du CA`}
              icon="📈"
              variant={margePct >= 30 ? 'success' : margePct >= 15 ? 'warning' : 'danger'}
            />
            <KPI title="Factures en retard" value={String(overdueInvoices)} icon="🧾" variant={overdueInvoices > 0 ? 'danger' : 'default'} onClick={() => navigate(routeForKpi('Factures en retard')!)} />
          </div>
        </div>

        {/* KPI ROW 2 — Opérations */}
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-white/40">Opérations</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KPI title="Projets" value={String(projectsTotal)} icon="📦" onClick={() => navigate(routeForKpi('Projets')!)} />
            <KPI title="Projets à risque" value={String(atRiskProjects)} icon="⚠️" variant={atRiskProjects > 0 ? 'danger' : 'default'} onClick={() => navigate(routeForKpi('Projets à risque')!)} />
            <KPI title="Commandes" value={String(orderItemsTotal)} icon="🛒" onClick={() => navigate('/admin/order-items')} />
            <KPI title="Délai moyen" value={`${avgDeliveryDays}j`} subtitle="Livraison" icon="🕒" />
            <KPI title="Tickets ouverts" value={String(openTickets)} icon="🎫" variant={openTickets > 0 ? 'warning' : 'default'} onClick={() => navigate(routeForKpi('Tickets')!)} />
          </div>
        </div>

        {/* KPI ROW 3 — Entités */}
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-white/40">Entités</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI title="Clients" value={String(customersTotal)} icon="👥" onClick={() => navigate(routeForKpi('Clients')!)} />
            <KPI title="Producteurs" value={String(producersTotal)} icon="🏭" onClick={() => navigate(routeForKpi('Producteurs')!)} />
            <KPI title="Transactions" value={String(transactions.length)} subtitle={eur(totalCosts)} icon="💸" />
            <KPI title="Tickets total" value={String(ticketsTotal)} icon="🎫" />
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Chiffre d'affaires (6 mois)" subtitle="CA vs marge brute (CA − transactions)">
            <BarsChart data={revenue6m} leftLabel="CA" rightLabel="Marge brute" />
          </Panel>

          <Panel
            title="Pipeline"
            subtitle="Répartition des projets par statut"
            right={
              <button
                onClick={() => navigate('/common/projects')}
                className="text-xs text-sky-300/80 hover:text-sky-200 transition"
              >
                Ouvrir projets →
              </button>
            }
          >
            <PipelineBars
              items={pipeline}
              onClick={(label) => navigate(`/common/projects?state=${encodeURIComponent(label)}`)}
            />
          </Panel>
        </div>

        {/* AGENDA WIDGET */}
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-white/40">Agenda</div>
          <CalendarWidget />
        </div>

        {/* BOTTOM ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <Panel title="Alertes" subtitle="Ce qui nécessite ton attention">
            <div className="space-y-2 text-sm">
              {overdueInvoices > 0 ? (
                <div className="rounded-xl border border-rose-400/15 bg-rose-500/10 px-3 py-2 text-rose-200">
                  {overdueInvoices} facture(s) en retard
                  <div className="text-xs text-rose-200/70">Vérifie paymentState / date</div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/10 px-3 py-2 text-emerald-200">
                  Aucune facture en retard
                </div>
              )}

              {atRiskProjects > 0 ? (
                <div className="rounded-xl border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-amber-200">
                  {atRiskProjects} projet(s) à risque
                  <div className="text-xs text-amber-200/70">endDate dépassée et pas terminé</div>
                </div>
              ) : null}

              {openTickets > 0 ? (
                <div className="rounded-xl border border-sky-400/15 bg-sky-500/10 px-3 py-2 text-sky-200">
                  {openTickets} ticket(s) ouverts
                  <div className="text-xs text-sky-200/70">Support à traiter</div>
                </div>
              ) : null}

              {upcomingDeadlines.length > 0 ? (
                <div className="rounded-xl border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-amber-200">
                  {upcomingDeadlines.length} échéance(s) dans 14 jours
                  <div className="text-xs text-amber-200/70">Voir panneau ci-dessous</div>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel title="Top clients" subtitle="Par chiffre d'affaires facturé (top 6)">
            <TableMini
              rows={topClients.map((c) => ({
                left: c.name,
                right: eur(c.revenue),
              }))}
              onRowClick={() => navigate('/admin/customers/list')}
            />
          </Panel>

          <Panel title="Top producteurs" subtitle="Basé sur les projets (top 6)">
            <TableMini
              rows={topProducers.map((p) => ({
                left: p.name,
                sub: `${p.projects} projet(s)`,
                right: p.revenue ? eur(p.revenue) : '—',
              }))}
              onRowClick={() => navigate('/admin/producers/list')}
            />
          </Panel>

        </div>

        {/* BOTTOM ROW 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <Panel
            title="Échéances (14 jours)"
            subtitle="Projets non terminés à venir"
            right={
              <button onClick={() => navigate('/common/projects')} className="text-xs text-sky-300/80 hover:text-sky-200 transition">
                Tous →
              </button>
            }
          >
            {upcomingDeadlines.length === 0 ? (
              <div className="text-xs text-white/45">Aucune échéance dans les 14 prochains jours.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {upcomingDeadlines.map((d: any, i: number) => (
                  <div key={i} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-white/85 truncate">{d.left}</div>
                      <div className="text-xs text-white/50 truncate">{d.sub}</div>
                    </div>
                    <span className={['text-xs font-bold px-2 py-0.5 rounded-full shrink-0', d.urgent ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'].join(' ')}>
                      {d.right}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Commandes par état" subtitle="Répartition des order items">
            <PipelineBars items={ordersByState} />
          </Panel>

          <Panel title="Activité récente" subtitle="Projets & factures">
            <TableMini
              rows={activity.map((a) => ({
                left: a.left,
                sub: a.sub,
                right: a.right,
              }))}
              onRowClick={() => {}}
            />
          </Panel>

        </div>
      </div>
    </Container>
  )
}