import Container from '@/components/shared/Container'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiGetDashboardSuperAdminInformations } from '@/services/DashboardSuperAdminService'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
import {
  HiOutlineCurrencyEuro,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineCube,
  HiOutlineExclamation,
  HiOutlineShoppingCart,
  HiOutlineTicket,
  HiOutlineUserGroup,
  HiOutlineOfficeBuilding,
  HiOutlineSwitchHorizontal,
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineRefresh,
  HiOutlinePhotograph,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineEmojiHappy,
  HiOutlineSupport,
} from 'react-icons/hi'

dayjs.extend(isoWeek)
dayjs.locale('fr')

/* ═══════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════ */

function safeDate(s?: string) {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function eur(n: number) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${Math.round(n)} \u20AC`
  }
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const m = Number(key.split('-')[1]) - 1
  return ['Jan', 'F\u00E9v', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Ao\u00FB', 'Sep', 'Oct', 'Nov', 'D\u00E9c'][m] ?? key
}

/* ═══════════════════════════════════════════════════════════
   #6 — DOT GRID BACKGROUND
   ═══════════════════════════════════════════════════════════ */

function DotGridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-cyan-500/[0.04] via-transparent to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-gradient-radial from-violet-500/[0.03] via-transparent to-transparent blur-3xl" />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   #2 — HERO ILLUSTRATION SVG (banni\u00E8re par d\u00E9faut)
   ═══════════════════════════════════════════════════════════ */

function HeroIllustration() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" fill="none">
      {/* Grid perspective lines */}
      <defs>
        <linearGradient id="heroGrad1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="heroGrad2" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="1200" height="300" fill="url(#heroGrad1)" />

      {/* Abstract data lines */}
      <polyline points="0,250 100,220 200,180 350,200 500,120 650,150 800,80 950,110 1100,60 1200,90" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.2" fill="none" />
      <polyline points="0,270 100,250 200,230 350,240 500,180 650,200 800,140 950,170 1100,120 1200,140" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.15" fill="none" />
      <polyline points="0,280 100,260 200,250 350,255 500,220 650,230 800,190 950,200 1100,170 1200,185" stroke="#34d399" strokeWidth="1" strokeOpacity="0.12" fill="none" />

      {/* Floating nodes */}
      {[
        { cx: 200, cy: 180, r: 4 }, { cx: 500, cy: 120, r: 5 }, { cx: 800, cy: 80, r: 4 },
        { cx: 350, cy: 200, r: 3 }, { cx: 650, cy: 150, r: 3 }, { cx: 950, cy: 110, r: 4 },
        { cx: 1100, cy: 60, r: 3 },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.cx} cy={n.cy} r={n.r} fill="#22d3ee" fillOpacity="0.3" />
          <circle cx={n.cx} cy={n.cy} r={n.r * 2.5} fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.15" />
        </g>
      ))}

      {/* Connection lines between nodes */}
      <line x1="200" y1="180" x2="350" y2="200" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.1" />
      <line x1="350" y1="200" x2="500" y2="120" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.1" />
      <line x1="500" y1="120" x2="650" y2="150" stroke="#8b5cf6" strokeWidth="0.5" strokeOpacity="0.1" />
      <line x1="650" y1="150" x2="800" y2="80" stroke="#8b5cf6" strokeWidth="0.5" strokeOpacity="0.1" />
      <line x1="800" y1="80" x2="950" y2="110" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.1" />

      {/* Decorative circles */}
      <circle cx="1050" cy="80" r="60" fill="none" stroke="#8b5cf6" strokeWidth="0.8" strokeOpacity="0.08" />
      <circle cx="1050" cy="80" r="40" fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.06" />
      <circle cx="150" cy="60" r="45" fill="none" stroke="#34d399" strokeWidth="0.8" strokeOpacity="0.06" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   #3 — EMPTY STATE ILLUSTRATIONS
   ═══════════════════════════════════════════════════════════ */

function EmptyClipboard() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-2 opacity-20">
      <rect x="10" y="6" width="28" height="36" rx="4" stroke="white" strokeWidth="1.5" />
      <rect x="17" y="2" width="14" height="8" rx="3" stroke="white" strokeWidth="1.5" fill="rgba(139,92,246,0.15)" />
      <path d="M18 22l4 4 8-8" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="18" y1="32" x2="30" y2="32" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="18" y1="36" x2="26" y2="36" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
    </svg>
  )
}

function EmptyTicket() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-2 opacity-20">
      <rect x="6" y="12" width="36" height="24" rx="4" stroke="white" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="6" stroke="#22d3ee" strokeWidth="1.5" fill="rgba(34,211,238,0.1)" />
      <path d="M22 24l1.5 1.5L27 23" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="6" y1="18" x2="14" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="2 2" />
      <line x1="34" y1="18" x2="42" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="2 2" />
      <path d="M21 8l3 4 3-4" stroke="white" strokeWidth="1" strokeOpacity="0.15" strokeLinecap="round" />
    </svg>
  )
}

function EmptyCalendar() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-2 opacity-20">
      <rect x="8" y="10" width="32" height="30" rx="4" stroke="white" strokeWidth="1.5" />
      <line x1="8" y1="18" x2="40" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="16" y1="6" x2="16" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="6" x2="32" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="28" r="5" stroke="#f59e0b" strokeWidth="1.5" fill="rgba(245,158,11,0.1)" />
      <path d="M22 28h4M24 26v4" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   #4 — PULSE DOT (alertes)
   ═══════════════════════════════════════════════════════════ */

function PulseDot({ color = 'rose' }: { color?: 'rose' | 'amber' | 'sky' }) {
  const colors = {
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
  }
  const rings = {
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
  }
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${rings[color]} opacity-50`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[color]}`} />
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════
   #5 — MEDAL BADGES
   ═══════════════════════════════════════════════════════════ */

function MedalBadge({ rank, color }: { rank: number; color: 'emerald' | 'violet' }) {
  if (rank <= 3) {
    const medals = [
      { fill: '#FFD700', stroke: '#B8860B', label: '1' },
      { fill: '#C0C0C0', stroke: '#808080', label: '2' },
      { fill: '#CD7F32', stroke: '#8B4513', label: '3' },
    ]
    const m = medals[rank - 1]
    return (
      <div className="relative flex h-7 w-7 items-center justify-center shrink-0">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" fill={m.fill} fillOpacity="0.15" stroke={m.fill} strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="14" cy="14" r="8" fill={m.fill} fillOpacity="0.1" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black" style={{ color: m.fill }}>{m.label}</span>
      </div>
    )
  }

  const cfg = color === 'emerald'
    ? 'from-emerald-500/20 to-teal-500/10 text-emerald-400 ring-emerald-500/20'
    : 'from-violet-500/20 to-purple-500/10 text-violet-400 ring-violet-500/20'

  return (
    <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${cfg} text-[10px] font-bold ring-1 shrink-0`}>
      {rank}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   #7 — SECTION HEADER with micro-illustration
   ═══════════════════════════════════════════════════════════ */

function SectionDeco({ variant }: { variant: 'finances' | 'operations' | 'entities' | 'default' }) {
  const colors = {
    finances: '#22d3ee',
    operations: '#f59e0b',
    entities: '#8b5cf6',
    default: '#64748b',
  }
  const c = colors[variant]
  return (
    <svg width="32" height="16" viewBox="0 0 32 16" fill="none" className="opacity-40">
      <circle cx="4" cy="8" r="2" fill={c} fillOpacity="0.5" />
      <line x1="8" y1="8" x2="16" y2="8" stroke={c} strokeWidth="1" strokeOpacity="0.3" />
      <circle cx="18" cy="8" r="1.5" fill={c} fillOpacity="0.3" />
      <line x1="21" y1="8" x2="26" y2="8" stroke={c} strokeWidth="1" strokeOpacity="0.2" />
      <circle cx="28" cy="8" r="1" fill={c} fillOpacity="0.2" />
    </svg>
  )
}

function SectionHeader({ title, subtitle, right, deco }: { title: string; subtitle?: string; right?: React.ReactNode; deco?: 'finances' | 'operations' | 'entities' }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        {deco && <SectionDeco variant={deco} />}
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════════════════════ */

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} style={style} />
}

function KPISkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/[0.06] p-5">
      <Skeleton className="h-3 w-16 mb-3" />
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

function ChartSkeleton({ height = 'h-[260px]' }: { height?: string }) {
  return (
    <div className={`flex items-end gap-2 ${height} px-4 pb-4`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${30 + Math.random() * 60}%` }} />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   GLASSMORPHISM CARD
   ═══════════════════════════════════════════════════════════ */

function GlassCard({
  children,
  className = '',
  onClick,
  glow,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  glow?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky'
}) {
  const glowMap: Record<string, string> = {
    cyan: 'shadow-cyan-500/5 hover:shadow-cyan-500/10',
    emerald: 'shadow-emerald-500/5 hover:shadow-emerald-500/10',
    amber: 'shadow-amber-500/5 hover:shadow-amber-500/10',
    rose: 'shadow-rose-500/5 hover:shadow-rose-500/10',
    violet: 'shadow-violet-500/5 hover:shadow-violet-500/10',
    sky: 'shadow-sky-500/5 hover:shadow-sky-500/10',
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={[
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-white/[0.07] to-white/[0.02]',
        'backdrop-blur-xl border border-white/[0.08]',
        'shadow-xl transition-all duration-300',
        glow ? glowMap[glow] : '',
        onClick ? 'cursor-pointer hover:border-white/[0.15] hover:from-white/[0.09] hover:to-white/[0.04] active:scale-[0.98]' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   KPI STAT CARD — #1: react-icons instead of emojis
   ═══════════════════════════════════════════════════════════ */

type KpiVariant = 'default' | 'success' | 'warning' | 'danger'

const variantConfig = {
  default: { gradient: 'from-cyan-500 to-blue-600', bg: 'from-cyan-500/15 to-blue-600/5', text: 'text-cyan-400', ring: 'ring-cyan-500/20' },
  success: { gradient: 'from-emerald-500 to-teal-600', bg: 'from-emerald-500/15 to-teal-600/5', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
  warning: { gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-500/15 to-orange-600/5', text: 'text-amber-400', ring: 'ring-amber-500/20' },
  danger: { gradient: 'from-rose-500 to-red-600', bg: 'from-rose-500/15 to-red-600/5', text: 'text-rose-400', ring: 'ring-rose-500/20' },
}

function KPI({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  onClick,
  sparkData,
}: {
  title: string
  value: string
  subtitle?: string
  icon?: React.ReactNode
  variant?: KpiVariant
  onClick?: () => void
  sparkData?: number[]
}) {
  const cfg = variantConfig[variant]

  return (
    <GlassCard onClick={onClick} glow={variant === 'success' ? 'emerald' : variant === 'warning' ? 'amber' : variant === 'danger' ? 'rose' : 'cyan'}>
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${cfg.gradient} opacity-60`} />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">{title}</div>
            <div className="mt-2 text-2xl lg:text-3xl font-black text-white tracking-tight truncate">{value}</div>
            {subtitle && <div className="mt-1 text-xs text-white/45">{subtitle}</div>}
          </div>

          <div className={`flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.bg} ring-1 ${cfg.ring} shrink-0 ${cfg.text}`}>
            {icon ?? <HiOutlineChartBar className="w-5 h-5" />}
          </div>
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="mt-3">
            <Sparkline data={sparkData} color={variant === 'success' ? '#34d399' : variant === 'warning' ? '#fbbf24' : variant === 'danger' ? '#fb7185' : '#22d3ee'} />
          </div>
        )}

        {onClick && (
          <div className={`mt-3 text-[11px] font-medium ${cfg.text} opacity-70`}>
            Voir d\u00E9tails \u2192
          </div>
        )}
      </div>
    </GlassCard>
  )
}

/* ═══════════════════════════════════════════════════════════
   SPARKLINE — unique gradient IDs
   ═══════════════════════════════════════════════════════════ */

let sparkIdCounter = 0

function Sparkline({ data, color = '#22d3ee', height = 32 }: { data: number[]; color?: string; height?: number }) {
  const gradId = useMemo(() => `spark-${++sparkIdCounter}`, [])
  const W = 120
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })
  const pathD = `M${points.join(' L')}`
  const areaD = `${pathD} L${W},${height} L0,${height} Z`

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   DONUT CHART — pre-computed offsets
   ═══════════════════════════════════════════════════════════ */

const DONUT_COLORS = ['#22d3ee', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#3b82f6', '#f97316']

function DonutChart({
  data,
  size = 160,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  const segments = useMemo(() => {
    let cumulative = 0
    return data.map((d, i) => {
      const pct = d.value / total
      const dash = pct * circumference
      const gap = circumference - dash
      const rot = (cumulative / total) * 360 - 90
      cumulative += d.value
      return { dash, gap, rot, color: DONUT_COLORS[i % DONUT_COLORS.length], label: d.label, value: d.value, pct }
    })
  }, [data, total, circumference])

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeLinecap="round"
              transform={`rotate(${seg.rot} ${size / 2} ${size / 2})`}
              style={{ filter: `drop-shadow(0 0 6px ${seg.color}40)` }}
            />
          ))}
        </svg>
        {centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-black text-white">{centerValue}</div>
            {centerLabel && <div className="text-[9px] text-white/40 uppercase tracking-wide">{centerLabel}</div>}
          </div>
        )}
      </div>

      <div className="space-y-1.5 flex-1 min-w-0 w-full">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[11px] text-white/55 truncate flex-1">{seg.label}</span>
            <span className="text-[11px] font-semibold text-white/75">{seg.value}</span>
            <span className="text-[10px] text-white/30 w-8 text-right">{Math.round(seg.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   AREA CHART — with tooltips
   ═══════════════════════════════════════════════════════════ */

function AreaChart({ data }: { data: { label: string; ca: number; marge: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const W = 700
  const H = 220
  const padL = 50
  const padR = 20
  const padT = 20
  const padB = 35

  const maxVal = useMemo(() => {
    let m = 1
    for (const p of data) m = Math.max(m, p.ca, p.marge)
    return m * 1.1
  }, [data])

  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const divisor = Math.max(data.length - 1, 1)
  const x = (i: number) => padL + (i / divisor) * plotW
  const y = (v: number) => padT + (1 - v / maxVal) * plotH

  const caPoints = data.map((d, i) => `${x(i)},${y(d.ca)}`).join(' ')
  const margePoints = data.map((d, i) => `${x(i)},${y(d.marge)}`).join(' ')

  const caAreaD = `M${padL},${padT + plotH} L${caPoints.split(' ').join(' L')} L${x(data.length - 1)},${padT + plotH} Z`
  const margeAreaD = `M${padL},${padT + plotH} L${margePoints.split(' ').join(' L')} L${x(data.length - 1)},${padT + plotH} Z`

  const ticks = 5
  const tickVals = Array.from({ length: ticks }, (_, i) => Math.round((maxVal / (ticks - 1)) * i))

  return (
    <div>
      <div className="mb-3 flex items-center gap-5 text-xs">
        <span className="flex items-center gap-2 text-cyan-400">
          <span className="inline-block h-2 w-6 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600" />
          Chiffre d'affaires
        </span>
        <span className="flex items-center gap-2 text-emerald-400">
          <span className="inline-block h-2 w-6 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
          Marge brute
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 220 }} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="margeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>

        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
            <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.3)">
              {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
            </text>
          </g>
        ))}

        <path d={caAreaD} fill="url(#caGrad)" />
        <path d={margeAreaD} fill="url(#margeGrad)" />

        <polyline points={caPoints} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.4))' }} />
        <polyline points={margePoints} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.4))' }} />

        {data.map((d, i) => {
          const cx = x(i)
          const zoneW = plotW / Math.max(data.length, 1)
          const isHovered = hoverIdx === i
          return (
            <g key={i}>
              <rect x={cx - zoneW / 2} y={padT} width={zoneW} height={plotH} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
              {isHovered && <line x1={cx} x2={cx} y1={padT} y2={padT + plotH} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />}
              <circle cx={cx} cy={y(d.ca)} r={isHovered ? 6 : 4} fill="#22d3ee" stroke="#0f172a" strokeWidth="2" style={{ transition: 'r 0.15s' }} />
              <circle cx={cx} cy={y(d.marge)} r={isHovered ? 6 : 4} fill="#34d399" stroke="#0f172a" strokeWidth="2" style={{ transition: 'r 0.15s' }} />
              <text x={cx} y={H - 12} textAnchor="middle" fontSize="11" fill={isHovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)'}>{d.label}</text>
              {isHovered && (
                <g>
                  <rect x={cx - 55} y={padT - 2} width={110} height={36} rx={8} fill="rgba(15,23,42,0.92)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  <text x={cx} y={padT + 13} textAnchor="middle" fontSize="10" fill="#22d3ee">CA: {eur(d.ca)}</text>
                  <text x={cx} y={padT + 27} textAnchor="middle" fontSize="10" fill="#34d399">Marge: {eur(d.marge)}</text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   HORIZONTAL BAR
   ═══════════════════════════════════════════════════════════ */

const BAR_COLORS = ['#22d3ee', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#3b82f6', '#f97316']

function HorizontalBars({ items, onClick }: { items: { label: string; value: number }[]; onClick?: (label: string) => void }) {
  const max = useMemo(() => Math.max(...items.map((i) => i.value), 1), [items])

  return (
    <div className="space-y-3">
      {items.map((it, idx) => {
        const pct = Math.round((it.value / max) * 100)
        return (
          <div key={it.label}>
            <div className="flex items-center justify-between mb-1">
              <button type="button" onClick={() => onClick?.(it.label)} className={['text-xs text-white/65 truncate', onClick ? 'hover:text-white transition' : ''].join(' ')}>
                {it.label}
              </button>
              <span className="text-xs font-semibold text-white/70">{it.value}</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${BAR_COLORS[idx % BAR_COLORS.length]}, ${BAR_COLORS[idx % BAR_COLORS.length]}88)`,
                  boxShadow: `0 0 10px ${BAR_COLORS[idx % BAR_COLORS.length]}40`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   TODO LIST WIDGET
   ═══════════════════════════════════════════════════════════ */

const TODO_STORAGE_KEY = 'peg:dashboardTodos'

interface TodoItem {
  id: number
  text: string
  done: boolean
  createdAt: string
}

function TodoListWidget() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [input, setInput] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem(TODO_STORAGE_KEY)
    if (raw) { try { setTodos(JSON.parse(raw)) } catch { /* noop */ } }
  }, [])

  const persist = useCallback((next: TodoItem[]) => {
    setTodos(next)
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(next))
  }, [])

  const addTodo = () => {
    const txt = input.trim()
    if (!txt) return
    persist([{ id: Date.now(), text: txt, done: false, createdAt: new Date().toISOString() }, ...todos])
    setInput('')
    inputRef.current?.focus()
  }

  const toggleTodo = (id: number) => persist(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const deleteTodo = (id: number) => persist(todos.filter(t => t.id !== id))

  const startEdit = (t: TodoItem) => { setEditId(t.id); setEditText(t.text) }
  const saveEdit = () => {
    if (editId === null) return
    const txt = editText.trim()
    if (!txt) { deleteTodo(editId); setEditId(null); return }
    persist(todos.map(t => t.id === editId ? { ...t, text: txt } : t))
    setEditId(null)
  }

  const pending = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  return (
    <GlassCard className="p-5" glow="violet">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-purple-600 opacity-60" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/10 ring-1 ring-violet-500/20 text-violet-400">
            <HiOutlineClipboardList className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Pense-b\u00EAte</h3>
            <p className="text-[10px] text-white/35">{pending.length} en cours \u00B7 {done.length} termin\u00E9(s)</p>
          </div>
        </div>
        {done.length > 0 && (
          <button onClick={() => persist(todos.filter(t => !t.done))} className="text-[10px] text-white/30 hover:text-white/50 transition">
            Vider termin\u00E9s
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef} type="text" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Nouvelle t\u00E2che..."
          className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition"
        />
        <button onClick={addTodo} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-lg shadow-violet-500/20">
          +
        </button>
      </div>

      <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {todos.length === 0 && (
          <div className="text-center py-4">
            <EmptyClipboard />
            <div className="text-xs text-white/25">Aucune t\u00E2che pour le moment</div>
          </div>
        )}

        {[...pending, ...done].map((t) => (
          <div key={t.id} className={['group flex items-center gap-3 rounded-xl px-3 py-2 transition', t.done ? 'opacity-40' : 'hover:bg-white/[0.03]'].join(' ')}>
            <button
              onClick={() => toggleTodo(t.id)}
              className={['flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition', t.done ? 'bg-violet-500/30 border-violet-500/40 text-violet-300' : 'border-white/15 hover:border-violet-500/40'].join(' ')}
            >
              {t.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </button>

            {editId === t.id ? (
              <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null) }} onBlur={saveEdit} className="flex-1 bg-transparent text-sm text-white outline-none border-b border-violet-500/30" />
            ) : (
              <span onDoubleClick={() => startEdit(t)} className={['flex-1 text-sm cursor-default', t.done ? 'line-through text-white/50' : 'text-white/80'].join(' ')}>{t.text}</span>
            )}

            <button onClick={() => deleteTodo(t.id)} className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-rose-400 transition text-xs shrink-0">\u2715</button>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

/* ═══════════════════════════════════════════════════════════
   CALENDAR WIDGET
   ═══════════════════════════════════════════════════════════ */

const CAL_STORAGE_KEY = 'peg:calendarEvents'
const CAT_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  production: { dot: 'bg-orange-500', bg: 'bg-orange-500/10 border border-orange-500/20', text: 'text-orange-300' },
  r\u00E9union: { dot: 'bg-sky-500', bg: 'bg-sky-500/10 border border-sky-500/20', text: 'text-sky-300' },
  livraison: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 border border-emerald-500/20', text: 'text-emerald-300' },
  autre: { dot: 'bg-violet-500', bg: 'bg-violet-500/10 border border-violet-500/20', text: 'text-violet-300' },
}

interface RawCalEvent { id: number; title: string; start: string; end: string; category: string }

function CalendarMiniWidget() {
  const [events, setEvents] = useState<RawCalEvent[]>([])
  const [monthOffset, setMonthOffset] = useState(0)
  const today = dayjs()
  const viewMonth = today.add(monthOffset, 'month')

  useEffect(() => {
    const raw = localStorage.getItem(CAL_STORAGE_KEY)
    if (raw) { try { setEvents(JSON.parse(raw)) } catch { /* */ } }
  }, [])

  const todayEvents = events.filter((e) => dayjs(e.start).isSame(today, 'day')).sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())
  const weekStart = today.startOf('isoWeek')
  const weekEnd = today.endOf('isoWeek')
  const weekEvents = events.filter((e) => { const s = dayjs(e.start); return s.isAfter(weekStart) && s.isBefore(weekEnd) && !s.isSame(today, 'day') }).sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf()).slice(0, 5)

  const startOfMonth = viewMonth.startOf('month')
  const daysInMonth = viewMonth.daysInMonth()
  const startDay = startOfMonth.day() === 0 ? 6 : startOfMonth.day() - 1

  return (
    <GlassCard className="p-5" glow="sky">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 to-blue-600 opacity-60" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-blue-600/10 ring-1 ring-sky-500/20 text-sky-400">
            <HiOutlineCalendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white capitalize">{viewMonth.format('MMMM YYYY')}</h3>
            <p className="text-[10px] text-white/35">{todayEvents.length} aujourd'hui</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonthOffset(o => o - 1)} className="text-white/30 hover:text-white/60 transition p-1 rounded"><HiOutlineChevronLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => setMonthOffset(0)} className="text-[10px] text-sky-400/50 hover:text-sky-300 transition px-1">Auj.</button>
          <button onClick={() => setMonthOffset(o => o + 1)} className="text-white/30 hover:text-white/60 transition p-1 rounded"><HiOutlineChevronRight className="w-3.5 h-3.5" /></button>
          <Link to="/admin/calendar" className="text-[11px] text-sky-400/70 hover:text-sky-300 transition ml-2">Ouvrir \u2192</Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => (<div key={d} className="text-[9px] text-center text-white/25 font-medium">{d}</div>))}
        {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const isToday = monthOffset === 0 && day === today.date()
          const cellDate = viewMonth.date(day)
          const hasEvent = events.some(e => dayjs(e.start).isSame(cellDate, 'day'))
          return (
            <div key={day} className={['text-[10px] text-center py-1 rounded-md relative', isToday ? 'bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/30' : 'text-white/40', hasEvent && !isToday ? 'text-white/70 font-semibold' : ''].join(' ')}>
              {day}
              {hasEvent && !isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400" />}
            </div>
          )
        })}
      </div>

      {monthOffset === 0 && todayEvents.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Aujourd'hui</div>
          {todayEvents.map(ev => {
            const cat = CAT_COLORS[ev.category] ?? CAT_COLORS.autre
            return (
              <div key={ev.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${cat.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dot}`} />
                <span className={`text-xs font-medium truncate ${cat.text}`}>{ev.title}</span>
                <span className="text-[10px] text-white/30 ml-auto shrink-0">{dayjs(ev.start).format('HH:mm')}</span>
              </div>
            )
          })}
        </div>
      )}

      {monthOffset === 0 && weekEvents.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Cette semaine</div>
          {weekEvents.map(ev => (
            <div key={ev.id} className="flex items-center gap-2 text-xs text-white/50">
              <span className="text-[10px] text-white/25 w-10 shrink-0">{dayjs(ev.start).format('ddd')}</span>
              <span className="truncate">{ev.title}</span>
              <span className="text-[10px] text-white/20 ml-auto shrink-0">{dayjs(ev.start).format('HH:mm')}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY FEED
   ═══════════════════════════════════════════════════════════ */

function ActivityFeed({ items }: { items: { left: string; right: string; sub?: string }[] }) {
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-xs text-white/30 text-center py-4">Aucune activit\u00E9 r\u00E9cente</div>}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 group">
          <div className="mt-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shrink-0 shadow-sm shadow-cyan-500/30" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white/75 truncate">{item.left}</div>
            {item.sub && <div className="text-[11px] text-white/35 truncate">{item.sub}</div>}
          </div>
          <div className="text-xs text-white/45 shrink-0 font-medium">{item.right}</div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ALERT CARD — #4: with pulse dot
   ═══════════════════════════════════════════════════════════ */

function AlertCard({ variant, children, pulse }: { variant: 'danger' | 'warning' | 'success' | 'info'; children: React.ReactNode; pulse?: boolean }) {
  const colors = {
    danger: 'from-rose-500/15 to-rose-500/5 border-rose-500/20 text-rose-200',
    warning: 'from-amber-500/15 to-amber-500/5 border-amber-500/20 text-amber-200',
    success: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/20 text-emerald-200',
    info: 'from-sky-500/15 to-sky-500/5 border-sky-500/20 text-sky-200',
  }
  const pulseColor = variant === 'danger' ? 'rose' : variant === 'warning' ? 'amber' : 'sky'

  return (
    <div className={`rounded-xl bg-gradient-to-r ${colors[variant]} border px-3.5 py-2.5 text-sm flex items-center gap-2.5`}>
      {pulse && <PulseDot color={pulseColor} />}
      <span>{children}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */

const MAX_BANNER_SIZE = 2 * 1024 * 1024

export default function DashboardAdmin() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [bannerUrl, setBannerUrl] = useState<string>(() => localStorage.getItem('peg:dashboardBanner') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gql, setGql] = useState<any>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGetDashboardSuperAdminInformations()
      const data = (res as any)?.data?.data ?? (res as any)?.data ?? null
      if (!data) throw new Error('R\u00E9ponse GraphQL vide')
      setGql(data)
    } catch (e: any) {
      setError(e?.message ?? 'Erreur dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [refreshTick])
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setRefreshTick(t => t + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  /* ---- Derived data ---- */
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

  const invoiceTotal = useMemo(() => {
    const fromInv = invoices.reduce((a: number, x: any) => a + (Number(x?.totalAmount) || 0), 0)
    const fromProj = projects.reduce((a: number, p: any) => a + (Array.isArray(p?.invoices) && p.invoices.length > 0 ? 0 : (Number(p?.price) || 0)), 0)
    return fromInv + fromProj
  }, [invoices, projects])

  const invoicePaid = useMemo(() => {
    const fromInv = invoices.reduce((a: number, x: any) => {
      const ps = (x?.paymentState ?? '').toString().toLowerCase()
      const st = (x?.state ?? '').toString().toLowerCase()
      const paid = ps === 'fulfilled' || st === 'fulfilled' || ps.includes('paid') || ps === 'paye' || st.includes('paid')
      return a + (paid ? (Number(x?.totalAmount) || 0) : 0)
    }, 0)
    const fromProj = projects.reduce((a: number, p: any) => a + (Array.isArray(p?.invoices) && p.invoices.length > 0 ? 0 : (Number(p?.paidPrice) || 0)), 0)
    return fromInv + fromProj
  }, [invoices, projects])

  const invoicePending = Math.max(0, invoiceTotal - invoicePaid)

  const overdueInvoices = useMemo(() => {
    const now = new Date()
    return invoices.filter((x: any) => {
      const d = safeDate(x?.dueDate) ?? safeDate(x?.date)
      if (!d) return false
      const ps = (x?.paymentState ?? '').toString().toLowerCase()
      const st = (x?.state ?? '').toString().toLowerCase()
      return d.getTime() < now.getTime() && !(ps === 'fulfilled' || st === 'fulfilled' || ps.includes('paid') || ps === 'paye')
    }).length
  }, [invoices])

  const atRiskProjects = useMemo(() => {
    const now = new Date()
    return projects.filter((p: any) => {
      const end = safeDate(p?.endDate)
      if (!end) return false
      const s = (p?.state ?? '').toString().toLowerCase()
      return end.getTime() < now.getTime() && !(s.includes('done') || s.includes('closed') || s.includes('term') || s.includes('livr'))
    }).length
  }, [projects])

  const avgDeliveryDays = useMemo(() => {
    const pairs = projects.map((p: any) => ({ s: safeDate(p?.startDate), e: safeDate(p?.endDate) })).filter((x: any) => x.s && x.e)
    if (!pairs.length) return 0
    return Math.round(pairs.reduce((a: number, x: any) => a + Math.max(0, (x.e.getTime() - x.s.getTime()) / 86400000), 0) / pairs.length)
  }, [projects])

  const totalCosts = useMemo(() => transactions.reduce((a: number, x: any) => a + (Number(x?.amount) || 0), 0), [transactions])
  const margeBrute = Math.max(0, invoiceTotal - totalCosts)
  const margePct = invoiceTotal > 0 ? Math.round((margeBrute / invoiceTotal) * 100) : 0
  const openTickets = useMemo(() => tickets.filter((t: any) => !String(t?.state ?? '').toLowerCase().includes('closed')).length, [tickets])

  const revenue6m = useMemo(() => {
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
    const by = new Map<string, { ca: number; costs: number }>()
    months.forEach(k => by.set(k, { ca: 0, costs: 0 }))
    for (const inv of invoices) { const d = safeDate(inv?.date); if (!d) continue; const k = monthKey(d); if (by.has(k)) by.set(k, { ...by.get(k)!, ca: by.get(k)!.ca + (Number(inv?.totalAmount) || 0) }) }
    for (const tx of transactions) { const d = safeDate(tx?.date); if (!d) continue; const k = monthKey(d); if (by.has(k)) by.set(k, { ...by.get(k)!, costs: by.get(k)!.costs + (Number(tx?.amount) || 0) }) }
    return months.map(k => { const b = by.get(k)!; return { label: monthLabel(k), ca: b.ca, marge: Math.max(0, b.ca - b.costs) } })
  }, [invoices, transactions])

  const caSparkData = revenue6m.map(d => d.ca)
  const margeSparkData = revenue6m.map(d => d.marge)

  const pipeline = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of projects) m.set((p?.state ?? 'unknown').toString(), (m.get((p?.state ?? 'unknown').toString()) ?? 0) + 1)
    return Array.from(m.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [projects])

  const topProducers = useMemo(() => {
    const map = new Map<string, { projects: number; revenue: number }>()
    for (const p of projects) { const n = p?.producer?.name ?? '\u2014'; const c = map.get(n) ?? { projects: 0, revenue: 0 }; map.set(n, { projects: c.projects + 1, revenue: c.revenue + (Number(p?.price) || 0) }) }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.projects - a.projects || b.revenue - a.revenue).slice(0, 6)
  }, [projects])

  const topClients = useMemo(() => {
    const map = new Map<string, number>()
    for (const inv of invoices) { const n = inv?.customer?.name ?? '\u2014'; map.set(n, (map.get(n) ?? 0) + (Number(inv?.totalAmount) || 0)) }
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 6)
  }, [invoices])

  const activity = useMemo(() => {
    const items: { ts: number; left: string; right: string; sub?: string }[] = []
    for (const inv of invoices.slice(0, 20)) { const d = safeDate(inv?.date); if (d) items.push({ ts: d.getTime(), left: `${inv?.customer?.name ?? 'Client'} \u2014 Facture ${inv?.name ?? ''}`, right: eur(Number(inv?.totalAmount) || 0), sub: `${inv?.paymentState ?? inv?.state ?? ''} \u00B7 ${d.toLocaleDateString('fr-FR')}` }) }
    for (const p of projects.slice(0, 20)) { const d = safeDate(p?.startDate) ?? safeDate(p?.endDate); if (d) items.push({ ts: d.getTime(), left: `${p?.customer?.name ?? 'Client'} \u2014 Projet ${p?.name ?? ''}`, right: (p?.state ?? '').toString(), sub: `${p?.producer?.name ?? '\u2014'} \u00B7 ${d.toLocaleDateString('fr-FR')}` }) }
    return items.sort((a, b) => b.ts - a.ts).slice(0, 8)
  }, [invoices, projects])

  const upcomingDeadlines = useMemo(() => {
    const now = new Date(); const in14 = new Date(now.getTime() + 14 * 86400000)
    return projects
      .filter((p: any) => { const end = safeDate(p?.endDate); if (!end) return false; const s = (p?.state ?? '').toString().toLowerCase(); return !(s.includes('done') || s.includes('closed') || s.includes('term') || s.includes('livr')) && end.getTime() >= now.getTime() && end.getTime() <= in14.getTime() })
      .sort((a: any, b: any) => (safeDate(a?.endDate)?.getTime() ?? 0) - (safeDate(b?.endDate)?.getTime() ?? 0))
      .slice(0, 6)
      .map((p: any) => { const end = safeDate(p?.endDate)!; const dl = Math.ceil((end.getTime() - new Date().getTime()) / 86400000); return { left: p?.name ?? '\u2014', sub: `${p?.customer?.name ?? '\u2014'} \u00B7 ${p?.producer?.name ?? '\u2014'}`, right: `J-${dl}`, urgent: dl <= 3 } })
  }, [projects])

  const ordersByState = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of orderItems) m.set((o?.state ?? 'inconnu').toString(), (m.get((o?.state ?? 'inconnu').toString()) ?? 0) + 1)
    return Array.from(m.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [orderItems])

  const ticketsByState = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tickets) m.set((t?.state ?? 'inconnu').toString(), (m.get((t?.state ?? 'inconnu').toString()) ?? 0) + 1)
    return Array.from(m.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [tickets])

  const onPickBanner = () => fileRef.current?.click()
  const onBannerFile = (file?: File | null) => {
    if (!file) return
    if (file.size > MAX_BANNER_SIZE) { setError(`Image trop lourde (${Math.round(file.size / 1024 / 1024)}MB). Max 2MB.`); return }
    const reader = new FileReader()
    reader.onload = (e) => { const b64 = e.target?.result as string; try { localStorage.setItem('peg:dashboardBanner', b64); setBannerUrl(b64) } catch { setError('Image trop lourde pour le stockage local.') } }
    reader.readAsDataURL(file)
  }

  const dataReady = gql !== null

  /* ---- RENDER ---- */
  return (
    <>
      <DotGridBackground />
      <Container>
        <div className="relative z-10 space-y-6 pb-10">

          {/* ══════════ HERO BANNER ══════════ */}
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] aspect-[4/1] md:aspect-[5/1]">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Dashboard banner" className="h-full w-full object-cover" />
            ) : (
              <>
                <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                <HeroIllustration />
              </>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/0" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

            <div className="absolute left-4 md:left-6 bottom-4 md:bottom-6">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Tableau de bord</h1>
              <p className="text-white/50 text-xs md:text-sm mt-1">Vue d'ensemble \u2014 {dayjs().format('dddd D MMMM YYYY')}</p>
            </div>

            <div className="absolute right-4 md:right-5 top-4 md:top-5 flex items-center gap-2">
              <button onClick={() => setRefreshTick(t => t + 1)} className="bg-white/10 backdrop-blur-md border border-white/15 text-white/80 px-3 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-white/15 transition text-xs md:text-sm flex items-center gap-1.5">
                <HiOutlineRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Rafra\u00EEchir</span>
              </button>
              <button onClick={onPickBanner} className="bg-white/10 backdrop-blur-md border border-white/15 text-white/80 px-3 md:px-4 py-1.5 md:py-2 rounded-xl hover:bg-white/15 transition text-xs md:text-sm flex items-center gap-1.5">
                <HiOutlinePhotograph className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Banni\u00E8re</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onBannerFile(e.target.files?.[0] ?? null)} />
            </div>

            {error && (
              <div className="absolute left-4 md:left-6 top-4 md:top-5 text-xs text-rose-300 bg-rose-500/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-rose-500/20">{error}</div>
            )}
          </div>

          {/* ══════════ KPI FINANCES ══════════ */}
          <div>
            <SectionHeader title="Finances" subtitle="Suivi du chiffre d'affaires et de la tr\u00E9sorerie" deco="finances" />
            {!dataReady ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <KPISkeleton key={i} />)}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPI title="CA total" value={eur(invoiceTotal)} icon={<HiOutlineCurrencyEuro className="w-5 h-5" />} onClick={() => navigate('/admin/invoices')} sparkData={caSparkData} />
                <KPI title="Encaiss\u00E9" value={eur(invoicePaid)} icon={<HiOutlineCheckCircle className="w-5 h-5" />} variant="success" onClick={() => navigate('/admin/invoices')} />
                <KPI title="En attente" value={eur(invoicePending)} icon={<HiOutlineClock className="w-5 h-5" />} variant={invoicePending > 0 ? 'warning' : 'default'} onClick={() => navigate('/admin/invoices')} />
                <KPI title="Marge brute" value={eur(margeBrute)} subtitle={`${margePct}% du CA`} icon={<HiOutlineTrendingUp className="w-5 h-5" />} variant={margePct >= 30 ? 'success' : margePct >= 15 ? 'warning' : 'danger'} sparkData={margeSparkData} />
                <KPI title="Factures retard" value={String(overdueInvoices)} icon={<HiOutlineDocumentText className="w-5 h-5" />} variant={overdueInvoices > 0 ? 'danger' : 'default'} onClick={() => navigate('/admin/invoices')} />
              </div>
            )}
          </div>

          {/* ══════════ KPI OPERATIONS ══════════ */}
          <div>
            <SectionHeader title="Op\u00E9rations" subtitle="Projets, commandes et support" deco="operations" />
            {!dataReady ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <KPISkeleton key={i} />)}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPI title="Projets" value={String(projectsTotal)} icon={<HiOutlineCube className="w-5 h-5" />} onClick={() => navigate('/common/projects')} />
                <KPI title="Projets \u00E0 risque" value={String(atRiskProjects)} icon={<HiOutlineExclamation className="w-5 h-5" />} variant={atRiskProjects > 0 ? 'danger' : 'default'} onClick={() => navigate('/common/projects')} />
                <KPI title="Commandes" value={String(orderItemsTotal)} icon={<HiOutlineShoppingCart className="w-5 h-5" />} onClick={() => navigate('/admin/order-items')} />
                <KPI title="D\u00E9lai moyen" value={`${avgDeliveryDays}j`} subtitle="Livraison" icon={<HiOutlineClock className="w-5 h-5" />} />
                <KPI title="Tickets ouverts" value={String(openTickets)} icon={<HiOutlineTicket className="w-5 h-5" />} variant={openTickets > 0 ? 'warning' : 'default'} onClick={() => navigate('/support')} />
              </div>
            )}
          </div>

          {/* ══════════ KPI ENTITIES ══════════ */}
          <div>
            <SectionHeader title="Entit\u00E9s" subtitle="Clients, producteurs et transactions" deco="entities" />
            {!dataReady ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI title="Clients" value={String(customersTotal)} icon={<HiOutlineUserGroup className="w-5 h-5" />} onClick={() => navigate('/admin/customers/list')} />
                <KPI title="Producteurs" value={String(producersTotal)} icon={<HiOutlineOfficeBuilding className="w-5 h-5" />} onClick={() => navigate('/admin/producers/list')} />
                <KPI title="Transactions" value={String(transactions.length)} subtitle={eur(totalCosts)} icon={<HiOutlineSwitchHorizontal className="w-5 h-5" />} />
                <KPI title="Tickets total" value={String(ticketsTotal)} icon={<HiOutlineTicket className="w-5 h-5" />} />
              </div>
            )}
          </div>

          {/* ══════════ CHARTS ROW ══════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="lg:col-span-2 p-5 md:p-6" glow="cyan">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-600 opacity-60" />
              <SectionHeader title="Chiffre d'affaires" subtitle="CA vs marge brute sur 6 mois" />
              {!dataReady ? <ChartSkeleton /> : <AreaChart data={revenue6m} />}
            </GlassCard>

            <GlassCard className="p-5 md:p-6" glow="violet">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-purple-600 opacity-60" />
              <SectionHeader title="Tickets" subtitle={`${ticketsTotal} tickets au total`} />
              {!dataReady ? <ChartSkeleton height="h-[180px]" /> : ticketsByState.length > 0 ? (
                <DonutChart data={ticketsByState} centerValue={String(ticketsTotal)} centerLabel="total" />
              ) : (
                <div className="text-center py-6"><EmptyTicket /><div className="text-xs text-white/25">Aucun ticket</div></div>
              )}
            </GlassCard>
          </div>

          {/* ══════════ PIPELINE + ORDERS + TODO ══════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="p-5 md:p-6" glow="cyan">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-500 opacity-60" />
              <SectionHeader title="Pipeline" subtitle="R\u00E9partition par statut" right={<button onClick={() => navigate('/common/projects')} className="text-[11px] text-cyan-400/60 hover:text-cyan-300 transition">Ouvrir \u2192</button>} />
              {!dataReady ? <ChartSkeleton height="h-[160px]" /> : <HorizontalBars items={pipeline} onClick={(label) => navigate(`/common/projects?state=${encodeURIComponent(label)}`)} />}
            </GlassCard>

            <GlassCard className="p-5 md:p-6" glow="amber">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 opacity-60" />
              <SectionHeader title="Commandes par \u00E9tat" subtitle={`${orderItemsTotal} commandes`} />
              {!dataReady ? <ChartSkeleton height="h-[180px]" /> : ordersByState.length > 0 ? (
                <DonutChart data={ordersByState} centerValue={String(orderItemsTotal)} centerLabel="total" />
              ) : (
                <div className="text-center py-6"><EmptyTicket /><div className="text-xs text-white/25">Aucune commande</div></div>
              )}
            </GlassCard>

            <TodoListWidget />
          </div>

          {/* ══════════ CALENDAR + ALERTS + DEADLINES ══════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CalendarMiniWidget />

            <GlassCard className="p-5 md:p-6" glow="rose">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 to-red-500 opacity-60" />
              <SectionHeader title="Alertes" subtitle="Points d'attention" />
              {!dataReady ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-2">
                  {overdueInvoices > 0 ? (
                    <AlertCard variant="danger" pulse>{overdueInvoices} facture(s) en retard</AlertCard>
                  ) : (
                    <AlertCard variant="success">Aucune facture en retard</AlertCard>
                  )}
                  {atRiskProjects > 0 && <AlertCard variant="warning" pulse>{atRiskProjects} projet(s) \u00E0 risque</AlertCard>}
                  {openTickets > 0 && <AlertCard variant="info">{openTickets} ticket(s) ouvert(s)</AlertCard>}
                  {upcomingDeadlines.length > 0 && <AlertCard variant="warning">{upcomingDeadlines.length} \u00E9ch\u00E9ance(s) dans 14j</AlertCard>}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5 md:p-6" glow="amber">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-yellow-500 opacity-60" />
              <SectionHeader title="\u00C9ch\u00E9ances (14j)" subtitle="Projets non termin\u00E9s" right={<button onClick={() => navigate('/common/projects')} className="text-[11px] text-amber-400/60 hover:text-amber-300 transition">Tous \u2192</button>} />
              {!dataReady ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : upcomingDeadlines.length === 0 ? (
                <div className="text-center py-4"><EmptyCalendar /><div className="text-xs text-white/25">Aucune \u00E9ch\u00E9ance prochaine</div></div>
              ) : (
                <div className="space-y-2">
                  {upcomingDeadlines.map((d, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-1.5">
                      <div className="min-w-0">
                        <div className="text-sm text-white/75 truncate">{d.left}</div>
                        <div className="text-[11px] text-white/35 truncate">{d.sub}</div>
                      </div>
                      <span className={['text-xs font-bold px-2.5 py-1 rounded-full shrink-0', d.urgent ? 'bg-rose-500/20 text-rose-300 shadow-sm shadow-rose-500/20' : 'bg-amber-500/15 text-amber-300'].join(' ')}>{d.right}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* ══════════ BOTTOM: TOP CLIENTS + PRODUCERS + ACTIVITY ══════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="p-5 md:p-6" glow="emerald">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60" />
              <SectionHeader title="Top clients" subtitle="Par CA factur\u00E9" right={<button onClick={() => navigate('/admin/customers/list')} className="text-[11px] text-emerald-400/60 hover:text-emerald-300 transition">Voir tous \u2192</button>} />
              {!dataReady ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : (
                <div className="space-y-3">
                  {topClients.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <MedalBadge rank={i + 1} color="emerald" />
                      <div className="flex-1 min-w-0"><div className="text-sm text-white/75 truncate">{c.name}</div></div>
                      <div className="text-sm font-semibold text-emerald-400/80 shrink-0">{eur(c.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5 md:p-6" glow="violet">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-purple-500 opacity-60" />
              <SectionHeader title="Top producteurs" subtitle="Par nombre de projets" right={<button onClick={() => navigate('/admin/producers/list')} className="text-[11px] text-violet-400/60 hover:text-violet-300 transition">Voir tous \u2192</button>} />
              {!dataReady ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-3">
                  {topProducers.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <MedalBadge rank={i + 1} color="violet" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/75 truncate">{p.name}</div>
                        <div className="text-[10px] text-white/30">{p.projects} projet(s)</div>
                      </div>
                      <div className="text-sm font-semibold text-violet-400/80 shrink-0">{p.revenue ? eur(p.revenue) : '\u2014'}</div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5 md:p-6" glow="sky">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 to-blue-500 opacity-60" />
              <SectionHeader title="Activit\u00E9 r\u00E9cente" subtitle="Projets & factures" />
              {!dataReady ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : (
                <ActivityFeed items={activity} />
              )}
            </GlassCard>
          </div>

        </div>
      </Container>
    </>
  )
}
