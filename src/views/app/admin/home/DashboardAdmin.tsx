import Container from '@/components/shared/Container'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { apiGetDashboardSuperAdminInformations } from '@/services/DashboardSuperAdminService'

// ✅ IMPORTANT : imports en DEFAULT (pour corriger ton erreur Vercel)
import KPICard from './components/KPICard'
import AlertsPanel from './components/AlertsPanel'
import RevenueChart from './components/RevenueChart'
import PipelineFunnel from './components/PipelineFunnel'
import SupplierRanking from './components/SupplierRanking'

import BaseService from '@/services/BaseService'
import ApiService from '@/services/ApiService'

function monthKey(d: Date) {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [, mm] = key.split('-')
  const m = Number(mm) - 1
  const names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  return `${names[m]}`
}

function safeDate(s?: string) {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function eur(n: number) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${Math.round(n)} €`
  }
}

// ⚠️ Très simple : convertit /uploads/... en https://api.mypeg.fr/uploads/...
// Si tu veux 100% parfait selon env (dev/prod), on le fera ensuite.
function absoluteMediaUrl(url?: string | null) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `https://api.mypeg.fr${url}`
}

type AlertItem = { level: 'danger' | 'warning' | 'info'; title: string; detail?: string }

export default function DashboardAdmin() {
  const navigate = useNavigate()

  const [month, setMonth] = useState('Mars 2026')
  const [loading, setLoading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [gql, setGql] = useState<any>(null)

  // ✅ Banner
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)

  // -----------------------
  // FETCH Dashboard + Banner
  // -----------------------
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        // 1) Dashboard GraphQL (déjà branché chez toi)
        const res = await apiGetDashboardSuperAdminInformations()
        const data = (res as any)?.data?.data ?? (res as any)?.data ?? null
        if (!data) throw new Error('Réponse GraphQL vide')
        setGql(data)

        // 2) Banner (Strapi REST) : /api/dashboard-setting?populate=dashboardBanner
        // Si l’API n’existe pas encore, on ignore sans casser.
        try {
          const s = await ApiService.fetchData({
            url: '/dashboard-setting?populate=dashboardBanner',
            method: 'get',
          })
          const attrs = (s as any)?.data?.data?.attributes ?? {}
          const url = attrs?.dashboardBanner?.data?.attributes?.url ?? null
          setBannerUrl(absoluteMediaUrl(url))
        } catch {
          // pas de single type => pas grave
        }
      } catch (e: any) {
        setError(e?.message ?? 'Erreur dashboard')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [month])

  // -----------------------
  // DATA extraction
  // -----------------------
  const projects = gql?.projects_connection?.nodes ?? []
  const projectsTotal = gql?.projects_connection?.pageInfo?.total ?? 0
  const customersTotal = gql?.customers_connection?.pageInfo?.total ?? 0
  const producersTotal = gql?.producers_connection?.pageInfo?.total ?? 0
  const tickets = gql?.tickets_connection?.nodes ?? []
  const ticketsTotal = gql?.tickets_connection?.pageInfo?.total ?? 0
  const invoices = gql?.invoices_connection?.nodes ?? []

  // CA / encaissé / en attente
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

  const invoicePending = Math.max(0, invoiceTotal - invoicePaid)

  // Factures en retard (date passée + pas payée)
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

  // Projets "à risque" (endDate passée + pas terminé)
  const atRiskProjects = useMemo(() => {
    const now = new Date()
    return projects.filter((p: any) => {
      const end = safeDate(p?.endDate)
      if (!end) return false
      const state = (p?.state ?? '').toString().toLowerCase()
      const done =
        state.includes('done') || state.includes('closed') || state.includes('term') || state.includes('livr')
      return end.getTime() < now.getTime() && !done
    }).length
  }, [projects])

  // Devis en attente (estimé via state)
  const pendingQuotes = useMemo(() => {
    return projects.filter((p: any) => {
      const s = (p?.state ?? '').toString().toLowerCase()
      return s.includes('quote') || s.includes('devis')
    }).length
  }, [projects])

  // Délai moyen
  const avgDeliveryDays = useMemo(() => {
    const pairs = projects
      .map((p: any) => ({ s: safeDate(p?.startDate), e: safeDate(p?.endDate) }))
      .filter((x: any) => x.s && x.e)
    if (!pairs.length) return 0
    const days = pairs.reduce(
      (a: number, x: any) => a + Math.max(0, (x.e.getTime() - x.s.getTime()) / 86400000),
      0
    )
    return Math.round(days / pairs.length)
  }, [projects])

  // Revenue 6 mois depuis invoices.date
  const revenue6m = useMemo(() => {
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(monthKey(d))
    }
    const by = new Map<string, { ca: number; marge: number }>()
    months.forEach((k) => by.set(k, { ca: 0, marge: 0 }))

    for (const inv of invoices) {
      const d = safeDate(inv?.date)
      if (!d) continue
      const k = monthKey(d)
      if (!by.has(k)) continue
      by.set(k, { ca: by.get(k)!.ca + (Number(inv?.totalAmount) || 0), marge: by.get(k)!.marge })
    }

    return months.map((k) => ({ label: monthLabel(k), ca: by.get(k)!.ca, marge: by.get(k)!.marge }))
  }, [invoices])

  // Pipeline (projets par statut)
  const pipeline = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of projects) {
      const s = (p?.state ?? 'unknown').toString()
      m.set(s, (m.get(s) ?? 0) + 1)
    }
    return Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [projects])

  // Ranking producteurs
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
  }, [projects])

  // Activité récente (factures + projets)
  const activity = useMemo(() => {
    const items: { ts: number; user: string; action: string; details: string }[] = []

    for (const inv of invoices.slice(0, 30)) {
      const d = safeDate(inv?.date)
      if (!d) continue
      items.push({
        ts: d.getTime(),
        user: inv?.customer?.name ?? 'Client',
        action: `Facture ${inv?.name ?? inv?.documentId ?? ''}`,
        details: `${eur(Number(inv?.totalAmount) || 0)} — ${inv?.paymentState ?? inv?.state ?? ''}`,
      })
    }

    for (const p of projects.slice(0, 30)) {
      const d = safeDate(p?.startDate) ?? safeDate(p?.endDate)
      if (!d) continue
      items.push({
        ts: d.getTime(),
        user: p?.customer?.name ?? 'Client',
        action: `Projet ${p?.name ?? ''}`,
        details: `${p?.state ?? ''} — ${p?.producer?.name ?? '—'}`,
      })
    }

    return items.sort((a, b) => b.ts - a.ts).slice(0, 8)
  }, [invoices, projects])

  // Alerts
  const alerts: AlertItem[] = useMemo(() => {
    const a: AlertItem[] = []
    if (overdueInvoices > 0)
      a.push({ level: 'danger', title: `${overdueInvoices} facture(s) en retard`, detail: 'Vérifie paymentState / date' })
    if (atRiskProjects > 0)
      a.push({ level: 'warning', title: `${atRiskProjects} projet(s) à risque`, detail: 'endDate dépassée et pas terminé' })
    const openTickets = tickets.filter((t: any) => !String(t?.state ?? '').toLowerCase().includes('closed')).length
    if (openTickets > 0) a.push({ level: 'info', title: `${openTickets} ticket(s) ouverts`, detail: 'Support à traiter' })
    return a
  }, [overdueInvoices, atRiskProjects, tickets])

  // KPI Cards
  const kpis = useMemo(() => {
    return [
      { title: 'CA total (factures)', value: eur(invoiceTotal), icon: '€' },
      { title: 'Encaissé', value: eur(invoicePaid), icon: '✅', variant: 'success' as const },
      { title: 'En attente', value: eur(invoicePending), icon: '⏳', variant: invoicePending > 0 ? ('warning' as const) : ('default' as const) },
      { title: 'Projets', value: String(projectsTotal), icon: '📦' },
      { title: 'Projets à risque', value: String(atRiskProjects), icon: '⚠️', variant: atRiskProjects > 0 ? ('danger' as const) : ('default' as const) },
      { title: 'Devis en attente', value: String(pendingQuotes), icon: '📄', variant: pendingQuotes > 0 ? ('warning' as const) : ('default' as const) },
      { title: 'Clients', value: String(customersTotal), icon: '👥' },
      { title: 'Producteurs', value: String(producersTotal), icon: '🏭' },
      { title: 'Tickets', value: String(ticketsTotal), icon: '🎫', variant: ticketsTotal > 0 ? ('warning' as const) : ('default' as const) },
      { title: 'Factures en retard', value: String(overdueInvoices), icon: '🧾', variant: overdueInvoices > 0 ? ('danger' as const) : ('default' as const) },
      { title: 'Délai moyen', value: `${avgDeliveryDays}j`, icon: '🕒', subtitle: 'Livraison' },
    ] as const
  }, [
    invoiceTotal,
    invoicePaid,
    invoicePending,
    projectsTotal,
    atRiskProjects,
    pendingQuotes,
    customersTotal,
    producersTotal,
    ticketsTotal,
    overdueInvoices,
    avgDeliveryDays,
  ])

  // Routes EXACTES (selon ton routes.config.ts)
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
      case 'Factures en retard':
      case 'CA total (factures)':
      case 'Encaissé':
      case 'En attente':
        return '/admin/invoices'
      default:
        return null
    }
  }

  // -----------------------
  // Banner click -> upload -> save to Strapi
  // -----------------------
  const onBannerClick = () => {
    if (bannerUploading) return
    fileInputRef.current?.click()
  }

  const onBannerFileSelected = async (file: File) => {
    try {
      setBannerUploading(true)
      setError(null)

      // 1) Upload -> /api/upload
      const form = new FormData()
      form.append('files', file)

      const up = await BaseService.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const uploaded = (up as any)?.data?.[0]
      const mediaId = uploaded?.id
      const mediaUrl = uploaded?.url

      if (!mediaId) throw new Error("Upload OK mais l'ID du fichier manque")

      // 2) Save to dashboard-setting (Single Type) -> PUT /api/dashboard-setting
      await ApiService.fetchData({
        url: '/dashboard-setting',
        method: 'put',
        data: { data: { dashboardBanner: mediaId } },
      })

      setBannerUrl(absoluteMediaUrl(mediaUrl))
    } catch (e: any) {
      setError(e?.message ?? 'Erreur upload bannière')
    } finally {
      setBannerUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* ✅ Banner (clic pour changer) */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
          <div onClick={onBannerClick} className="relative cursor-pointer" title="Cliquer pour changer la bannière">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Bannière dashboard"
                style={{
                  width: '100%',
                  aspectRatio: '4 / 1',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{ width: '100%', aspectRatio: '4 / 1' }}
                className="flex items-center justify-center text-white/60 text-sm"
              >
                Cliquer pour ajouter une bannière (ratio 4:1)
              </div>
            )}

            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition" />
            <div className="absolute bottom-3 right-3 text-xs text-white/80 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
              {bannerUploading ? 'Upload…' : 'Changer la bannière'}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onBannerFileSelected(f)
            }}
          />
        </div>

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Tableau de bord</h1>
          <p className="text-sm text-white/60">Vue d&apos;ensemble opérationnelle — {month}</p>
        </div>

        {/* Month selector + status */}
        <div className="flex items-center justify-between gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/80 px-3 py-2 rounded-xl outline-none"
          >
            <option>Mars 2026</option>
            <option>Février 2026</option>
            <option>Janvier 2026</option>
          </select>

          <div className="text-xs">
            {loading ? <span className="text-white/60">Chargement…</span> : null}
            {error ? <span className="text-red-300">{error}</span> : null}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((k) => {
            const to = routeForKpi(k.title)
            return (
              <KPICard
                key={k.title}
                title={k.title}
                value={k.value}
                subtitle={(k as any).subtitle}
                icon={(k as any).icon}
                variant={(k as any).variant}
                onClick={to ? () => navigate(to) : undefined}
              />
            )
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueChart data={revenue6m} />
          <PipelineFunnel
            items={pipeline}
            onItemClick={(label: string) => navigate(`/common/projects?state=${encodeURIComponent(label)}`)}
          />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AlertsPanel alerts={alerts} />
          <SupplierRanking rows={topProducers} />

          {/* Recent Activity */}
          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-3">Activité récente</h3>
            <div className="space-y-3">
              {activity.length === 0 ? (
                <div className="text-xs text-white/60">Aucune activité.</div>
              ) : (
                activity.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white">
                        <span className="font-medium">{entry.user}</span>
                        <span className="text-white/60"> — {entry.action}</span>
                      </p>
                      <p className="text-white/60 truncate">{entry.details}</p>
                      <p className="text-white/40 text-[10px]">{new Date(entry.ts).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}