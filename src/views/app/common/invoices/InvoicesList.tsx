import { Container } from '@/components/shared';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice } from '@/@types/invoice';
import { injectReducer, useAppDispatch, useAppSelector as useRootAppSelector, RootState } from '@/store';
import reducer, { deleteInvoice, getInvoices, setEditInvoiceDialog, setPrintInvoiceDialog, setSelectedInvoice, updateInvoice, useAppSelector } from './store';
import ModalEditInvoice from './modals/ModalEditInvoice';
const ModalPrintInvoice = lazy(() => import('./modals/ModalPrintInvoice'));
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import dayjs from 'dayjs';
import { HiOutlineSearch, HiPencil, HiPrinter, HiBan, HiDocumentText, HiTrash, HiCreditCard, HiDownload, HiCheckCircle, HiClock, HiDocumentDuplicate, HiDocumentReport, HiClipboardCheck } from 'react-icons/hi';
import { FaPiggyBank } from 'react-icons/fa';
import { fmtPrice, fmtHT, fmtTTC, fmtEur, fmtNum } from '@/utils/priceHelpers';
import { PREMIUM_DISCOUNT_RATE } from '@/utils/productHelpers';

injectReducer('invoices', reducer);

const STATE_CFG: Record<string, { label: string; bg: string; border: string; color: string }> = {
  pending:   { label: 'En attente', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  color: '#fbbf24' },
  fulfilled: { label: 'Payée',      bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  color: '#4ade80' },
  canceled:  { label: 'Annulée',    bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#f87171' },
}
const PAY_CFG: Record<string, { label: string; bg: string; color: string; border?: string }> = {
  fulfilled:        { label: 'Payé',                  bg: 'rgba(34,197,94,0.1)',   color: '#4ade80' },
  pending:          { label: 'Non payé',              bg: 'rgba(239,68,68,0.1)',   color: '#f87171' },
  pending_transfer: { label: '⏳ Virement en attente', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.4)' },
}
const initials = (name: string) => name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

const Btn = ({ onClick, icon, hoverBg, hoverColor, hoverBorder, title, disabled }: any) => (
  <button title={title} onClick={onClick} disabled={disabled}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder } }}
    onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}
  >{icon}</button>
)

const TAB_STATES = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'fulfilled', label: 'Payées' },
  { key: 'canceled', label: 'Annulées' },
]

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
const PREMIUM_PERKS = [
  '-15% sur tout le catalogue',
  'Historique de factures illimité',
  'Export comptable simplifié',
  'Relances et suivi automatisés',
  'Support prioritaire',
]

/* ── Panel chrome (titre + lien optionnel) ── */
const Panel = ({ title, action, children, style }: any) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '22px', ...style }}>
    {(title || action) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
        {action}
      </div>
    )}
    {children}
  </div>
)

/* ── KPI card ── */
const KpiCard = ({ icon, iconBg, iconBorder, iconColor, label, value, hint }: any) => (
  <div style={{ flex: '1 1 200px', minWidth: 0, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: iconBg, border: `1px solid ${iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, margin: '0 0 2px' }}>{label}</p>
      <p style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</p>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>{hint}</p>
    </div>
  </div>
)

/* ── Illustration hero (facture + carte + graphe) ── */
const HeroArt = () => (
  <svg width="300" height="170" viewBox="0 0 300 170" fill="none" style={{ flexShrink: 0, maxWidth: '40%', height: 'auto' }} aria-hidden>
    <defs>
      <linearGradient id="invG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6d5dfc" /><stop offset="1" stopColor="#4534c9" />
      </linearGradient>
    </defs>
    {/* facture */}
    <rect x="70" y="18" width="110" height="134" rx="12" fill="url(#invG)" opacity="0.92" />
    <text x="84" y="46" fill="#fff" fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif">FACTURE</text>
    <text x="160" y="46" fill="#fff" fontSize="13" fontWeight="700" fontFamily="Inter, sans-serif">€</text>
    <rect x="84" y="62" width="82" height="7" rx="3.5" fill="#fff" opacity="0.85" />
    <rect x="84" y="78" width="64" height="7" rx="3.5" fill="#fff" opacity="0.55" />
    <rect x="84" y="94" width="74" height="7" rx="3.5" fill="#fff" opacity="0.55" />
    <rect x="84" y="110" width="50" height="7" rx="3.5" fill="#fff" opacity="0.4" />
    {/* carte paiement */}
    <rect x="24" y="96" width="78" height="52" rx="10" fill="#3d2fa8" stroke="rgba(255,255,255,0.15)" />
    <circle cx="42" cy="116" r="5" fill="#fff" opacity="0.85" />
    <circle cx="54" cy="116" r="5" fill="#fff" opacity="0.5" />
    {/* check */}
    <circle cx="170" cy="120" r="16" fill="#34d399" />
    <path d="M163 120 l5 5 l9 -10" stroke="#0f1c2e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* graphe barres */}
    <rect x="196" y="40" width="86" height="96" rx="12" fill="#2a2270" opacity="0.85" stroke="rgba(255,255,255,0.1)" />
    <rect x="210" y="96" width="10" height="26" rx="3" fill="#8b7dff" />
    <rect x="226" y="80" width="10" height="42" rx="3" fill="#8b7dff" />
    <rect x="242" y="66" width="10" height="56" rx="3" fill="#a99bff" />
    <rect x="258" y="86" width="10" height="36" rx="3" fill="#8b7dff" />
  </svg>
)

/* ── Cadre + area chart SVG (dépenses par mois) — axes toujours visibles ── */
const niceMax = (m: number): number => {
  if (m <= 0) return 3000
  const pow = Math.pow(10, Math.floor(Math.log10(m)))
  const n = m / pow
  const step = n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 5 ? 5 : 10
  return step * pow
}
const SpendingChart = ({ data, empty }: { data: number[]; empty?: boolean }) => {
  const max = empty ? 3000 : niceMax(Math.max(...data))
  const ticks = [max, (max * 2) / 3, max / 3, 0]
  const W = 720, H = 200, padT = 8, padB = 8
  const innerH = H - padT - padB
  const pts = data.map((v, i) => {
    const x = (W * i) / (data.length - 1)
    const y = padT + innerH - (innerH * v) / max
    return [x, y] as const
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${W},${padT + innerH} L0,${padT + innerH} Z`
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      {/* Y axis */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '200px', paddingBottom: '22px', flexShrink: 0 }}>
        {ticks.map((t) => <span key={t} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textAlign: 'right', lineHeight: 1 }}>{Math.round(t)} €</span>)}
      </div>
      {/* Plot */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200" preserveAspectRatio="none" role="img" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="spendG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6b9eff" stopOpacity="0.35" />
              <stop offset="1" stopColor="#6b9eff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* gridlines */}
          {ticks.map((t) => {
            const y = padT + innerH - (innerH * t) / max
            return <line key={t} x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          })}
          {!empty && <>
            <path d={area} fill="url(#spendG)" />
            <path d={line} fill="none" stroke="#6b9eff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {pts.map((p, i) => data[i] > 0 && <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#6b9eff" />)}
          </>}
        </svg>
        {/* empty overlay */}
        {empty && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
            <svg width="40" height="26" viewBox="0 0 40 26" fill="none" style={{ marginBottom: '12px' }} aria-hidden>
              <path d="M2 22 L13 12 L20 17 L30 5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24 5 H30 V11" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 6px' }}>Aucune donnée pour le moment</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>Vos dépenses apparaîtront ici.</p>
          </div>
        )}
        {/* X axis */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          {MONTHS.map((m) => <span key={m} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{m}</span>)}
        </div>
      </div>
    </div>
  )
}

const InvoicesList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { user }: { user: User } = useRootAppSelector((state: RootState) => state.auth.user);
  const customer = useRootAppSelector((state: RootState) => state.auth.user.user?.customer);
  const isAdmin: boolean = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const isPremium = !!customer?.premium;
  const { invoices, total, loading, selectedInvoice, editInvoiceDialog, printInvoiceDialog } = useAppSelector((state) => state.invoices.data);

  useEffect(() => {
    dispatch(getInvoices({ request: { pagination: { page: currentPage, pageSize }, searchTerm }, user }));
  }, [currentPage, searchTerm]);

  const filtered = invoices.filter((inv) => activeTab === 'all' || inv.state === activeTab);
  const tabCount = (key: string) => key === 'all' ? invoices.length : invoices.filter((i) => i.state === key).length;

  /* ── Stats KPI ── */
  const stats = useMemo(() => {
    let billed = 0, pending = 0, paid = 0, savingsHT = 0
    for (const inv of invoices) {
      if (inv.state === 'canceled') continue
      const ttc = inv.totalAmount ?? 0
      billed += ttc
      if (inv.paymentState === 'fulfilled') paid += ttc
      else pending += ttc
      savingsHT += inv.amount ?? 0
    }
    // Économie premium = surcoût évité (15% que le client n'a pas payé sur le HT déjà remisé)
    const premiumSavings = isPremium ? savingsHT * (PREMIUM_DISCOUNT_RATE / (1 - PREMIUM_DISCOUNT_RATE)) : 0
    return { billed, pending, paid, premiumSavings }
  }, [invoices, isPremium]);

  /* ── Années disponibles + données dépenses ── */
  const years = useMemo(() => {
    const set = new Set<number>(invoices.map((i) => dayjs(i.date).year()).filter(Boolean))
    set.add(dayjs().year())
    return Array.from(set).sort((a, b) => b - a)
  }, [invoices]);
  const [year, setYear] = useState<number>(dayjs().year());

  const spending = useMemo(() => {
    const months = new Array(12).fill(0)
    for (const inv of invoices) {
      if (inv.state === 'canceled') continue
      const d = dayjs(inv.date)
      if (d.year() === year) months[d.month()] += inv.totalAmount ?? 0
    }
    return months
  }, [invoices, year]);
  const hasSpending = spending.some((v) => v > 0);

  /* ── Activité financière (5 dernières factures) ── */
  const activity = useMemo(() =>
    [...invoices].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()).slice(0, 5)
  , [invoices]);

  /* ── Export CSV ── */
  const handleExport = () => {
    const rows = [['Référence', 'Client', 'Date', 'Statut', 'Paiement', 'HT', 'TVA', 'TTC']]
    for (const inv of filtered) {
      rows.push([
        inv.name ?? '', inv.customer?.name ?? '', dayjs(inv.date).format('DD/MM/YYYY'),
        STATE_CFG[inv.state]?.label ?? inv.state, PAY_CFG[inv.paymentState]?.label ?? inv.paymentState,
        fmtNum(inv.amount ?? 0), fmtNum(inv.vatAmount ?? 0), fmtNum(inv.totalAmount ?? 0),
      ])
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `factures-${dayjs().format('YYYY-MM-DD')}.csv`; a.click()
    URL.revokeObjectURL(url)
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Bannière ── */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)',
        padding: '34px 36px', marginTop: '24px', marginBottom: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px',
        background: 'radial-gradient(120% 150% at 82% 0%, rgba(124,107,255,0.30) 0%, rgba(91,71,224,0.10) 38%, rgba(13,16,28,0.3) 72%), linear-gradient(160deg, #15172b 0%, #0d1018 100%)',
      }}>
        <div style={{ position: 'relative', zIndex: 2, minWidth: 0, maxWidth: '560px' }}>
          <p style={{ color: '#a99bff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', margin: '0 0 12px' }}>FINANCE</p>
          <h1 style={{ color: '#fff', fontSize: '34px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, margin: 0 }}>
            FACTURES. PAIEMENTS. <span style={{ color: '#a78bfa' }}>SÉRÉNITÉ.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '14px 0 0', lineHeight: 1.5 }}>
            Retrouvez l'ensemble de vos factures, paiements et documents comptables en un seul endroit.
          </p>
        </div>
        <HeroArt />
      </div>

      {/* ── KPI ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
        <KpiCard icon={<HiDocumentText size={24} />} iconBg="rgba(139,125,255,0.12)" iconBorder="rgba(139,125,255,0.28)" iconColor="#a99bff"
          label="Total facturé" value={fmtEur(stats.billed)} hint="Toutes factures confondues" />
        <KpiCard icon={<HiClock size={24} />} iconBg="rgba(251,191,36,0.12)" iconBorder="rgba(251,191,36,0.28)" iconColor="#fbbf24"
          label="En attente" value={fmtEur(stats.pending)} hint="Factures à régler" />
        <KpiCard icon={<HiCheckCircle size={24} />} iconBg="rgba(52,211,153,0.12)" iconBorder="rgba(52,211,153,0.28)" iconColor="#34d399"
          label="Payées" value={fmtEur(stats.paid)} hint="Factures réglées" />
        <KpiCard icon={<FaPiggyBank size={22} />} iconBg="rgba(107,158,255,0.12)" iconBorder="rgba(107,158,255,0.28)" iconColor="#6b9eff"
          label="Économies Premium" value={fmtEur(stats.premiumSavings)} hint="Grâce à vos avantages" />
      </div>

      {/* ── Tabs + Search + Export ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TAB_STATES.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '6px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: activeTab === tab.key ? 'rgba(47,111,237,0.2)' : 'transparent', color: activeTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}
            >
              {tab.label}
              <span style={{ marginLeft: '5px', background: activeTab === tab.key ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)', borderRadius: '100px', padding: '1px 6px', fontSize: '10px', color: activeTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.55)' }}>
                {tabCount(tab.key)}
              </span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '340px' }}>
          <HiOutlineSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Rechercher une facture…" value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '8px 14px 8px 33px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
          />
        </div>
        <button onClick={handleExport} title="Exporter en CSV"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 16px', borderRadius: '10px', background: 'rgba(139,125,255,0.1)', border: '1px solid rgba(139,125,255,0.3)', cursor: 'pointer', color: '#a99bff', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,125,255,0.2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,125,255,0.1)' }}
        >
          <HiDownload size={15} /> Exporter
        </button>
      </div>

      {/* ── Grille principale : liste + activité ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '18px', marginBottom: '18px' }}>
        {/* Liste factures */}
        <Panel style={{ padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '68px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: '74px', height: '74px', borderRadius: '18px', border: '2px dashed rgba(139,125,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <HiDocumentText size={34} style={{ color: '#8b7dff' }} />
              </div>
              <p style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>Aucune facture disponible</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 20px', maxWidth: '320px', lineHeight: 1.5 }}>
                Vos factures apparaîtront ici automatiquement après vos premières commandes.
              </p>
              {!isAdmin && (
                <button onClick={() => navigate('/customer/catalogue')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 22px', borderRadius: '11px', background: 'linear-gradient(135deg, #6d5dfc, #5a47e0)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 14px rgba(109,93,252,0.35)', transition: 'transform 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  Découvrir le catalogue →
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map((inv: Invoice) => {
                const stateCfg = STATE_CFG[inv.state] ?? STATE_CFG.pending
                const payCfg = PAY_CFG[inv.paymentState] ?? PAY_CFG.pending
                const customerName = inv.customer?.name ?? '—'
                return (
                  <div key={inv.documentId}
                    style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <HiDocumentText size={20} style={{ color: '#6b9eff' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', fontFamily: 'monospace' }}>{inv.name}</span>
                        <span style={{ background: stateCfg.bg, border: `1px solid ${stateCfg.border}`, borderRadius: '100px', padding: '1px 8px', color: stateCfg.color, fontSize: '11px', fontWeight: 700 }}>{stateCfg.label}</span>
                        <span style={{ background: payCfg.bg, border: payCfg.border ? `1px solid ${payCfg.border}` : 'none', borderRadius: '100px', padding: '1px 8px', color: payCfg.color, fontSize: '11px', fontWeight: 600 }}>{payCfg.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                          <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(customerName)}</span>
                          {customerName}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>{dayjs(inv.date).format('DD/MM/YYYY')}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{fmtTTC(inv.totalAmount ?? 0)}</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{fmtHT(inv.amount ?? 0)}</div>
                      {inv.vatAmount > 0 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>TVA {fmtPrice(inv.vatAmount ?? 0)}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0, alignItems: 'center' }}>
                      <Btn onClick={() => { dispatch(setSelectedInvoice(inv)); dispatch(setPrintInvoiceDialog(true)) }} icon={<HiPrinter size={13} />} hoverBg="rgba(107,158,255,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(107,158,255,0.4)" title="Imprimer" />
                      {!isAdmin && inv.state !== 'canceled' && inv.paymentState !== 'fulfilled' && (
                        <button
                          onClick={() => navigate(`/customer/invoice/${inv.documentId}/virement`)}
                          title="Payer par virement"
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '30px', padding: '0 10px', borderRadius: '8px', background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.3)', cursor: 'pointer', color: '#6b9eff', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(47,111,237,0.22)'; e.currentTarget.style.borderColor = 'rgba(47,111,237,0.5)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(47,111,237,0.12)'; e.currentTarget.style.borderColor = 'rgba(47,111,237,0.3)' }}
                        >
                          <HiCreditCard size={13} /> Payer par virement
                        </button>
                      )}
                      {isAdmin && <Btn onClick={() => { dispatch(setSelectedInvoice(inv)); dispatch(setEditInvoiceDialog(true)) }} icon={<HiPencil size={13} />} hoverBg="rgba(47,111,237,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(47,111,237,0.4)" title="Modifier" />}
                      {isAdmin && <Btn onClick={() => dispatch(updateInvoice({ documentId: inv.documentId, state: 'canceled' }))} icon={<HiBan size={13} />} hoverBg="rgba(239,68,68,0.12)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.3)" title="Annuler" disabled={inv.state === 'canceled'} />}
                      {isAdmin && <Btn onClick={() => { if (window.confirm(`Supprimer définitivement la facture ${inv.name} ?`)) dispatch(deleteInvoice(inv.documentId)) }} icon={<HiTrash size={13} />} hoverBg="rgba(239,68,68,0.15)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.4)" title="Supprimer" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        {/* Activité financière */}
        <Panel title="Activité financière" action={<a onClick={(e) => { e.preventDefault(); setActiveTab('all') }} href="#" style={{ color: '#6b9eff', fontSize: '13px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>Voir tout</a>}>
          {activity.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 8px' }}>
              {/* colonne d'icônes déco */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                {[
                  { c: '#34d399', bg: 'rgba(52,211,153,0.12)', Icon: HiDocumentReport },
                  { c: '#a99bff', bg: 'rgba(139,125,255,0.12)', Icon: HiDocumentText },
                  { c: '#6b9eff', bg: 'rgba(107,158,255,0.12)', Icon: HiDocumentDuplicate },
                  { c: '#6b9eff', bg: 'rgba(107,158,255,0.12)', Icon: HiClipboardCheck },
                ].map((it, i) => (
                  <div key={i} style={{ width: '34px', height: '34px', borderRadius: '10px', background: it.bg, border: `1px solid ${it.c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: it.c }}>
                    <it.Icon size={16} />
                  </div>
                ))}
              </div>
              {/* empty state centré */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <svg width="40" height="22" viewBox="0 0 40 22" fill="none" style={{ marginBottom: '14px' }} aria-hidden>
                  <path d="M1 11 H10 L14 3 L20 19 L25 11 H39" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 6px' }}>Aucune activité financière récente</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>Vos activités liées aux factures et paiements apparaîtront ici.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activity.map((inv) => {
                const payCfg = PAY_CFG[inv.paymentState] ?? PAY_CFG.pending
                return (
                  <div key={inv.documentId} style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: payCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: payCfg.color }}>
                      <HiDocumentText size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: '0 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0 }}>{dayjs(inv.date).format('DD/MM/YYYY')} · {payCfg.label}</p>
                    </div>
                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{fmtEur(inv.totalAmount ?? 0)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Grille basse : dépenses + avantages premium ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '18px', paddingBottom: '40px' }}>
        {/* Dépenses */}
        <Panel title={`Dépenses ${year}`} action={
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '6px 12px', color: '#fff', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none' }}>
            {years.map((y) => <option key={y} value={y} style={{ background: '#16263d' }}>Année {y}</option>)}
          </select>
        }>
          <SpendingChart data={spending} empty={!hasSpending} />
        </Panel>

        {/* Avantages Premium */}
        <Panel title="Vos avantages Premium" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', zIndex: 1 }}>
            {PREMIUM_PERKS.map((perk) => (
              <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#34d399' }}>
                  <HiCheckCircle size={16} />
                </span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500 }}>{perk}</span>
              </div>
            ))}
          </div>
          {/* diamant déco */}
          <svg width="150" height="150" viewBox="0 0 100 100" style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.9, pointerEvents: 'none' }} aria-hidden>
            <defs>
              <linearGradient id="diamG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8b7dff" /><stop offset="1" stopColor="#5a47e0" />
              </linearGradient>
            </defs>
            <path d="M30 38 L50 24 L70 38 L50 80 Z" fill="url(#diamG)" />
            <path d="M30 38 L50 50 L50 24 Z" fill="#a99bff" opacity="0.8" />
            <path d="M70 38 L50 50 L50 24 Z" fill="#6d5dfc" />
            <path d="M30 38 L50 50 L50 80 Z" fill="#7a6bf0" />
          </svg>
        </Panel>
      </div>

      {isAdmin && selectedInvoice && editInvoiceDialog && (
        <ModalEditInvoice editInvoiceDialog={editInvoiceDialog} selectedInvoice={selectedInvoice} setEditInvoiceDialog={setEditInvoiceDialog} setSelectedInvoice={setSelectedInvoice} updateInvoice={updateInvoice} dispatch={dispatch} loading={loading} />
      )}
      {selectedInvoice && printInvoiceDialog && (
        <Suspense fallback={null}>
          <ModalPrintInvoice printInvoiceDialog={printInvoiceDialog} selectedInvoice={selectedInvoice} setPrintInvoiceDialog={setPrintInvoiceDialog} setSelectedInvoice={setSelectedInvoice} dispatch={dispatch} />
        </Suspense>
      )}
    </Container>
  );
};

export default InvoicesList;
