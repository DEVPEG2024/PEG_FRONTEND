/**
 * COMPOSANT PROTEGE — NE PAS MODIFIER SANS DEMANDE EXPLICITE DE NOVA
 * Contient : banniere admin (hero), pense-bete (TodoListWidget), layout widgets
 * Derniere validation : 2026-04-18
 * Reference : GLOSSARY.md + PROTECTED_COMPONENTS.md
 */
import Container from '@/components/shared/Container'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '@/store'
import { apiGetDashboardSuperAdminInformations } from '@/services/DashboardSuperAdminService'
import { apiGetAdminPreference, apiCreateAdminPreference, apiUpdateAdminPreference, apiUploadBanner } from '@/services/AdminPreferenceService'
import { env } from '@/configs/env.config'
import { toHT, arePricesHidden, togglePricesHidden } from '@/utils/priceHelpers'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  HiOutlineCurrencyEuro, HiOutlineCheckCircle, HiOutlineClock, HiOutlineChartBar,
  HiOutlineDocumentText, HiOutlineCube, HiOutlineExclamation, HiOutlineShoppingCart,
  HiOutlineTicket, HiOutlineUserGroup, HiOutlineOfficeBuilding, HiOutlineSwitchHorizontal,
  HiOutlineCalendar, HiOutlineClipboardList, HiOutlineRefresh, HiOutlinePhotograph,
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineArrowSmUp, HiOutlineArrowSmDown,
  HiOutlineDocumentDuplicate, HiOutlineLightningBolt, HiOutlineSelector,
  HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineX, HiOutlinePlus, HiOutlineEye, HiOutlineEyeOff,
} from 'react-icons/hi'

dayjs.extend(isoWeek); dayjs.extend(relativeTime); dayjs.locale('fr')

/* ═══════════════════════════════════════════════ */
/*  UTILS                                         */
/* ═══════════════════════════════════════════════ */
function safeDate(s?: string) { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d }
function eur(n: number) { if (arePricesHidden()) return '•••••'; try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n) } catch { return `${Math.round(n)} €` } }
function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function monthLabel(key: string) { const m = Number(key.split('-')[1]) - 1; return ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][m] ?? key }

/* ═══════════════════════════════════════════════ */
/*  FRAMER MOTION                                 */
/* ═══════════════════════════════════════════════ */
const fadeInUp = { hidden: { opacity: 0, y: 18 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } }) }
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={staggerContainer} className={className}>{children}</motion.div>
}

/* ═══════════════════════════════════════════════ */
/*  ANIMATED COUNTER                              */
/* ═══════════════════════════════════════════════ */
function AnimatedValue({ value, format }: { value: number; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(0); const prevRef = useRef(0); const formatter = format ?? String
  useEffect(() => { const start = prevRef.current; const end = value; const dur = 800; const t0 = performance.now(); const tick = (now: number) => { const p = Math.min((now - t0) / dur, 1); setDisplay(start + (end - start) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick) }; requestAnimationFrame(tick); prevRef.current = end }, [value])
  if (arePricesHidden()) return <>{'•••••'}</>
  return <>{formatter(Math.round(display))}</>
}

/* ═══════════════════════════════════════════════ */
/*  BACKGROUND                                    */
/* ═══════════════════════════════════════════════ */
function MeshBackground() {
  return <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden"><div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.05 }} /><div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.045]" style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }} /><div className="absolute top-1/2 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.035]" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} /></div>
}

function HeroIllustration() {
  return <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" fill="none"><defs><linearGradient id="heroG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" /></linearGradient></defs><rect width="1200" height="300" fill="url(#heroG)" /><polyline points="0,250 100,220 200,180 350,200 500,120 650,150 800,80 950,110 1100,60 1200,90" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.2" fill="none" /><polyline points="0,270 100,250 200,230 350,240 500,180 650,200 800,140 950,170 1100,120 1200,140" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.15" fill="none" />{[{cx:200,cy:180,r:4},{cx:500,cy:120,r:5},{cx:800,cy:80,r:4},{cx:650,cy:150,r:3},{cx:950,cy:110,r:4}].map((n,i)=><g key={i}><circle cx={n.cx} cy={n.cy} r={n.r} fill="#22d3ee" fillOpacity="0.3" /><circle cx={n.cx} cy={n.cy} r={n.r*2.5} fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeOpacity="0.15" /></g>)}<circle cx="1050" cy="80" r="60" fill="none" stroke="#8b5cf6" strokeWidth="0.8" strokeOpacity="0.08" /></svg>
}

/* ═══════════════════════════════════════════════ */
/*  EMPTY STATES                                  */
/* ═══════════════════════════════════════════════ */
function EmptyClipboard() { return <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-2 opacity-20"><rect x="10" y="6" width="28" height="36" rx="4" stroke="white" strokeWidth="1.5" /><rect x="17" y="2" width="14" height="8" rx="3" stroke="white" strokeWidth="1.5" fill="rgba(139,92,246,0.15)" /><path d="M18 22l4 4 8-8" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function EmptyTicket() { return <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-2 opacity-20"><rect x="6" y="12" width="36" height="24" rx="4" stroke="white" strokeWidth="1.5" /><circle cx="24" cy="24" r="6" stroke="#22d3ee" strokeWidth="1.5" fill="rgba(34,211,238,0.1)" /><path d="M22 24l1.5 1.5L27 23" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function EmptyCalendar() { return <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-2 opacity-20"><rect x="8" y="10" width="32" height="30" rx="4" stroke="white" strokeWidth="1.5" /><line x1="8" y1="18" x2="40" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.3" /><line x1="16" y1="6" x2="16" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" /><line x1="32" y1="6" x2="32" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" /><circle cx="24" cy="28" r="5" stroke="#f59e0b" strokeWidth="1.5" fill="rgba(245,158,11,0.1)" /></svg> }

/* ═══════════════════════════════════════════════ */
/*  UI PRIMITIVES                                 */
/* ═══════════════════════════════════════════════ */
function PulseDot({ color = 'rose' }: { color?: 'rose' | 'amber' | 'sky' }) { const bg = { rose: 'bg-rose-500', amber: 'bg-amber-500', sky: 'bg-sky-500' }; const ring = { rose: 'bg-rose-400', amber: 'bg-amber-400', sky: 'bg-sky-400' }; return <span className="relative flex h-2.5 w-2.5 shrink-0"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ring[color]} opacity-50`} /><span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${bg[color]}`} /></span> }

function MedalBadge({ rank, color }: { rank: number; color: 'emerald' | 'violet' }) {
  if (rank <= 3) { const m = [{ fill: '#FFD700', l: '1' }, { fill: '#C0C0C0', l: '2' }, { fill: '#CD7F32', l: '3' }][rank - 1]; return <div className="relative flex h-7 w-7 items-center justify-center shrink-0"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" fill={m.fill} fillOpacity="0.15" stroke={m.fill} strokeWidth="1.5" strokeOpacity="0.5" /><circle cx="14" cy="14" r="8" fill={m.fill} fillOpacity="0.1" /></svg><span className="absolute inset-0 flex items-center justify-center text-[10px] font-black" style={{ color: m.fill }}>{m.l}</span></div> }
  const cfg = color === 'emerald' ? 'from-emerald-500/20 to-teal-500/10 text-emerald-400 ring-emerald-500/20' : 'from-violet-500/20 to-purple-500/10 text-violet-400 ring-violet-500/20'
  return <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${cfg} text-[10px] font-bold ring-1 shrink-0`}>{rank}</div>
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) { if (!previous) return null; const pct = Math.round(((current - previous) / previous) * 100); if (pct === 0) return null; const up = pct > 0; return <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>{up ? <HiOutlineArrowSmUp className="w-3 h-3" /> : <HiOutlineArrowSmDown className="w-3 h-3" />}{up ? '+' : ''}{pct}%</span> }

function ProgressRing({ pct, size = 44, strokeW = 4, color = '#34d399' }: { pct: number; size?: number; strokeW?: number; color?: string }) { const r = (size - strokeW) / 2; const circ = 2 * Math.PI * r; const off = circ * (1 - Math.min(Math.max(pct, 0), 100) / 100); return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0"><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} /><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: 'stroke-dashoffset 1s ease-out' }} /></svg> }

function Skeleton({ className = '' }: { className?: string }) { return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} /> }
function KPISkeleton() { return <div className="rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.06] p-5"><Skeleton className="h-3 w-16 mb-3" /><Skeleton className="h-8 w-24 mb-2" /><Skeleton className="h-3 w-20" /></div> }
function ChartSkeleton({ height = 'h-[220px]' }: { height?: string }) { return <div className={`flex items-end gap-2 ${height} px-4 pb-4`}>{[45,65,35,80,55,70,40,60].map((h, i) => <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />)}</div> }

function GlassCard({ children, className = '', onClick, glow }: { children: React.ReactNode; className?: string; onClick?: () => void; glow?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' }) {
  const gs: Record<string, string> = { cyan: 'shadow-cyan-500/5 hover:shadow-cyan-500/10', emerald: 'shadow-emerald-500/5 hover:shadow-emerald-500/10', amber: 'shadow-amber-500/5 hover:shadow-amber-500/10', rose: 'shadow-rose-500/5 hover:shadow-rose-500/10', violet: 'shadow-violet-500/5 hover:shadow-violet-500/10', sky: 'shadow-sky-500/5 hover:shadow-sky-500/10' }
  const cg: Record<string, string> = { cyan: 'radial-gradient(ellipse at top left, rgba(34,211,238,0.08) 0%, transparent 50%)', emerald: 'radial-gradient(ellipse at top left, rgba(52,211,153,0.08) 0%, transparent 50%)', amber: 'radial-gradient(ellipse at top left, rgba(251,191,36,0.06) 0%, transparent 50%)', rose: 'radial-gradient(ellipse at top left, rgba(251,113,133,0.06) 0%, transparent 50%)', violet: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.08) 0%, transparent 50%)', sky: 'radial-gradient(ellipse at top left, rgba(56,189,248,0.07) 0%, transparent 50%)' }
  return <div onClick={onClick} role={onClick ? 'button' : undefined} className={['relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/[0.08] shadow-xl transition-all duration-300', glow ? gs[glow] : '', onClick ? 'cursor-pointer hover:border-white/[0.15] active:scale-[0.98]' : '', className].join(' ')}>{glow && <div className="absolute inset-0 pointer-events-none" style={{ background: cg[glow] }} />}{children}</div>
}

function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) { return <div className="flex items-end justify-between gap-4 mb-4"><div><h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>{subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}</div>{right}</div> }

type KpiVariant = 'default' | 'success' | 'warning' | 'danger'
const vc = { default: { gradient: 'from-cyan-500 to-blue-600', bg: 'from-cyan-500/15 to-blue-600/5', text: 'text-cyan-400', ring: 'ring-cyan-500/20' }, success: { gradient: 'from-emerald-500 to-teal-600', bg: 'from-emerald-500/15 to-teal-600/5', text: 'text-emerald-400', ring: 'ring-emerald-500/20' }, warning: { gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-500/15 to-orange-600/5', text: 'text-amber-400', ring: 'ring-amber-500/20' }, danger: { gradient: 'from-rose-500 to-red-600', bg: 'from-rose-500/15 to-red-600/5', text: 'text-rose-400', ring: 'ring-rose-500/20' } }

function KPI({ title, value, subtitle, icon, variant = 'default', onClick, sparkData, delta }: { title: string; value: string; subtitle?: string; icon?: React.ReactNode; variant?: KpiVariant; onClick?: () => void; sparkData?: number[]; delta?: React.ReactNode }) {
  const c = vc[variant]; return <GlassCard onClick={onClick} glow={variant === 'success' ? 'emerald' : variant === 'warning' ? 'amber' : variant === 'danger' ? 'rose' : 'cyan'}><div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.gradient} opacity-80`} /><div className="relative p-5"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="text-[11px] font-medium uppercase tracking-wider text-white/40">{title}</div><div className="mt-2 text-2xl lg:text-3xl font-black text-white tracking-tight truncate">{value}</div>{(subtitle || delta) && <div className="flex items-center gap-2 mt-1">{subtitle && <span className="text-xs text-white/45">{subtitle}</span>}{delta}</div>}</div><div className={`flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.bg} ring-1 ${c.ring} shrink-0 ${c.text}`}>{icon ?? <HiOutlineChartBar className="w-5 h-5" />}</div></div>{sparkData && sparkData.length > 1 && <div className="mt-3"><Sparkline data={sparkData} color={variant === 'success' ? '#34d399' : variant === 'warning' ? '#fbbf24' : variant === 'danger' ? '#fb7185' : '#22d3ee'} /></div>}{onClick && <div className={`mt-3 text-[11px] font-medium ${c.text} opacity-70`}>Voir détails →</div>}</div></GlassCard>
}

let _sparkId = 0
function Sparkline({ data, color = '#22d3ee', height = 32 }: { data: number[]; color?: string; height?: number }) {
  const idRef = useRef(`spark-${++_sparkId}`); const W = 120; const max = Math.max(...data, 1); const min = Math.min(...data, 0); const range = max - min || 1
  const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * W},${height - ((v - min) / range) * (height - 4) - 2}`); const pathD = `M${pts.join(' L')}`
  return <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none"><defs><linearGradient id={idRef.current} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs><path d={`${pathD} L${W},${height} L0,${height} Z`} fill={`url(#${idRef.current})`} /><path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

const DC = ['#22d3ee', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#3b82f6', '#f97316']
function DonutChart({ data, size = 150, thickness = 20, centerLabel, centerValue }: { data: { label: string; value: number }[]; size?: number; thickness?: number; centerLabel?: string; centerValue?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1; const r = (size - thickness) / 2; const circ = 2 * Math.PI * r
  const segs = useMemo(() => { let cum = 0; return data.map((d, i) => { const pct = d.value / total; const dash = pct * circ; const gap = circ - dash; const rot = (cum / total) * 360 - 90; cum += d.value; return { dash, gap, rot, color: DC[i % DC.length], label: d.label, value: d.value, pct } }) }, [data, total, circ])
  return <div className="flex flex-col sm:flex-row items-center gap-4"><div className="relative shrink-0" style={{ width: size, height: size }}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{segs.map((s, i) => <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${s.dash} ${s.gap}`} strokeLinecap="round" transform={`rotate(${s.rot} ${size/2} ${size/2})`} style={{ filter: `drop-shadow(0 0 6px ${s.color}40)` }} />)}</svg>{centerValue && <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-xl font-black text-white">{centerValue}</div>{centerLabel && <div className="text-[9px] text-white/40 uppercase tracking-wide">{centerLabel}</div>}</div>}</div><div className="space-y-1.5 flex-1 min-w-0 w-full">{segs.map((s, i) => <div key={i} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} /><span className="text-[11px] text-white/55 truncate flex-1">{s.label}</span><span className="text-[11px] font-semibold text-white/75">{s.value}</span><span className="text-[10px] text-white/30 w-8 text-right">{Math.round(s.pct * 100)}%</span></div>)}</div></div>
}

function AreaChart({ data }: { data: { label: string; ca: number; marge: number; depenses?: number }[] }) {
  const [hi, setHi] = useState<number | null>(null); const W = 700, H = 220, pL = 50, pR = 20, pT = 20, pB = 35
  const mx = useMemo(() => { let m = 1; for (const p of data) m = Math.max(m, p.ca, p.marge, p.depenses ?? 0); return m * 1.1 }, [data])
  const pW = W - pL - pR, pH = H - pT - pB, dv = Math.max(data.length - 1, 1); const x = (i: number) => pL + (i / dv) * pW; const y = (v: number) => pT + (1 - v / mx) * pH
  const caP = data.map((d, i) => `${x(i)},${y(d.ca)}`).join(' '); const mgP = data.map((d, i) => `${x(i)},${y(d.marge)}`).join(' '); const dpP = data.map((d, i) => `${x(i)},${y(d.depenses ?? 0)}`).join(' ')
  const caA = `M${pL},${pT + pH} L${caP.split(' ').join(' L')} L${x(data.length - 1)},${pT + pH} Z`; const mgA = `M${pL},${pT + pH} L${mgP.split(' ').join(' L')} L${x(data.length - 1)},${pT + pH} Z`; const dpA = `M${pL},${pT + pH} L${dpP.split(' ').join(' L')} L${x(data.length - 1)},${pT + pH} Z`
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((mx / 4) * i))
  const hasDepenses = data.some(d => (d.depenses ?? 0) > 0)
  return <div><div className="mb-3 flex items-center gap-5 text-xs"><span className="flex items-center gap-2 text-cyan-400"><span className="inline-block h-2 w-6 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600" />CA</span><span className="flex items-center gap-2 text-emerald-400"><span className="inline-block h-2 w-6 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />Marge</span>{hasDepenses && <span className="flex items-center gap-2 text-rose-400"><span className="inline-block h-2 w-6 rounded-full bg-gradient-to-r from-rose-400 to-rose-600" />Dépenses</span>}</div><svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 220 }} onMouseLeave={() => setHi(null)}><defs><linearGradient id="caG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient><linearGradient id="mgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity="0.2" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></linearGradient><linearGradient id="dpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185" stopOpacity="0.2" /><stop offset="100%" stopColor="#fb7185" stopOpacity="0" /></linearGradient></defs>{ticks.map((v, i) => <g key={i}><line x1={pL} x2={W - pR} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" /><text x={pL - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.55)">{v >= 1000 ? `${Math.round(v / 1000)}k` : v}</text></g>)}<path d={caA} fill="url(#caG)" /><path d={mgA} fill="url(#mgG)" />{hasDepenses && <path d={dpA} fill="url(#dpG)" />}<polyline points={caP} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.4))' }} /><polyline points={mgP} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.4))' }} />{hasDepenses && <polyline points={dpP} fill="none" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" style={{ filter: 'drop-shadow(0 0 8px rgba(251,113,133,0.4))' }} />}{data.map((d, i) => { const cx = x(i); const zw = pW / Math.max(data.length, 1); const hov = hi === i; const dp = d.depenses ?? 0; const ttW = 130; const ttH = dp > 0 ? 50 : 36; const ttX = Math.max(pL, Math.min(cx - ttW / 2, W - pR - ttW)); return <g key={i}><rect x={cx - zw / 2} y={pT} width={zw} height={pH} fill="transparent" onMouseEnter={() => setHi(i)} />{hov && <line x1={cx} x2={cx} y1={pT} y2={pT + pH} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />}<circle cx={cx} cy={y(d.ca)} r={hov ? 6 : 4} fill="#22d3ee" stroke="#0f172a" strokeWidth="2" /><circle cx={cx} cy={y(d.marge)} r={hov ? 6 : 4} fill="#34d399" stroke="#0f172a" strokeWidth="2" />{dp > 0 && <circle cx={cx} cy={y(dp)} r={hov ? 6 : 4} fill="#fb7185" stroke="#0f172a" strokeWidth="2" />}<text x={cx} y={H - 12} textAnchor="middle" fontSize="11" fill={hov ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)'}>{d.label}</text>{hov && <g><rect x={ttX} y={pT - 2} width={ttW} height={ttH} rx={8} fill="rgba(15,23,42,0.92)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" /><text x={ttX + ttW / 2} y={pT + 13} textAnchor="middle" fontSize="10" fill="#22d3ee">CA: {eur(d.ca)}</text><text x={ttX + ttW / 2} y={pT + 27} textAnchor="middle" fontSize="10" fill="#34d399">Marge: {eur(d.marge)}</text>{dp > 0 && <text x={ttX + ttW / 2} y={pT + 41} textAnchor="middle" fontSize="10" fill="#fb7185">Dépenses: {eur(dp)}</text>}</g>}</g> })}</svg></div>
}

const BC = ['#22d3ee', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#3b82f6', '#f97316']
function HorizontalBars({ items, onClick }: { items: { label: string; value: number }[]; onClick?: (l: string) => void }) {
  const max = useMemo(() => Math.max(...items.map(i => i.value), 1), [items])
  return <div className="space-y-3">{items.map((it, idx) => { const pct = Math.round((it.value / max) * 100); return <div key={it.label}><div className="flex items-center justify-between mb-1"><button type="button" onClick={() => onClick?.(it.label)} className={['text-xs text-white/65 truncate', onClick ? 'hover:text-white transition' : ''].join(' ')}>{it.label}</button><span className="text-xs font-semibold text-white/70">{it.value}</span></div><div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${BC[idx % BC.length]}, ${BC[idx % BC.length]}88)`, boxShadow: `0 0 10px ${BC[idx % BC.length]}40` }} /></div></div> })}</div>
}

function AlertCard({ variant, children, pulse }: { variant: 'danger' | 'warning' | 'success' | 'info'; children: React.ReactNode; pulse?: boolean }) {
  const c = { danger: 'from-rose-500/15 to-rose-500/5 border-rose-500/20 text-rose-200', warning: 'from-amber-500/15 to-amber-500/5 border-amber-500/20 text-amber-200', success: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/20 text-emerald-200', info: 'from-sky-500/15 to-sky-500/5 border-sky-500/20 text-sky-200' }
  return <div className={`rounded-xl bg-gradient-to-r ${c[variant]} border px-3.5 py-2.5 text-sm flex items-center gap-2.5`}>{pulse && <PulseDot color={variant === 'danger' ? 'rose' : variant === 'warning' ? 'amber' : 'sky'} />}<span>{children}</span></div>
}

function ActivityFeed({ items }: { items: { left: string; right: string; sub?: string; type?: 'invoice' | 'project' }[] }) {
  return <div className="space-y-2">{items.length === 0 && <div className="text-xs text-white/30 text-center py-4">Aucune activité</div>}{items.map((item, i) => <div key={i} className="flex items-start gap-3"><div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg shrink-0 ${item.type === 'invoice' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'}`}>{item.type === 'invoice' ? <HiOutlineDocumentDuplicate className="w-3.5 h-3.5" /> : <HiOutlineCube className="w-3.5 h-3.5" />}</div><div className="flex-1 min-w-0"><div className="text-sm text-white/75 truncate">{item.left}</div>{item.sub && <div className="text-[11px] text-white/35 truncate">{item.sub}</div>}</div><div className="text-xs text-white/45 shrink-0 font-medium">{item.right}</div></div>)}</div>
}

/* ═══════════════════════════════════════════════ */
/*  TODO LIST                                     */
/* ═══════════════════════════════════════════════ */
const TK = 'peg:dashboardTodos'
interface TodoItem { id: number; text: string; done: boolean; createdAt: string }
function TodoListWidget() {
  const userId = useAppSelector((state) => state.auth.user.user?.documentId || '');
  const [todos, setTodos] = useState<TodoItem[]>(() => { try { const r = localStorage.getItem(TK); if (r) return JSON.parse(r) } catch {} return [] }); const [input, setInput] = useState(''); const [editId, setEditId] = useState<number | null>(null); const [editText, setEditText] = useState(''); const inputRef = useRef<HTMLInputElement>(null)
  const prefDocRef = useRef<string | null>(null);
  // Restore from Strapi if localStorage is empty
  useEffect(() => {
    if (!userId) return;
    apiGetAdminPreference(userId).then(pref => {
      if (pref) {
        prefDocRef.current = pref.documentId;
        if (todos.length === 0 && pref.todos?.length > 0) {
          setTodos(pref.todos);
          localStorage.setItem(TK, JSON.stringify(pref.todos));
        }
      }
    }).catch(() => {});
  }, [userId]);
  const persist = useCallback((updater: (prev: TodoItem[]) => TodoItem[]) => { setTodos(prev => { const n = updater(prev); localStorage.setItem(TK, JSON.stringify(n)); if (prefDocRef.current) { apiUpdateAdminPreference(prefDocRef.current, { todos: n }).catch(() => {}) } else if (userId) { apiCreateAdminPreference(userId, { todos: n }).then(r => { if (r?.documentId) prefDocRef.current = r.documentId }).catch(() => {}) }; return n }) }, [userId])
  const addTodo = () => { const t = input.trim(); if (!t) return; persist(prev => [{ id: Date.now(), text: t, done: false, createdAt: new Date().toISOString() }, ...prev]); setInput(''); inputRef.current?.focus() }
  const toggleTodo = (id: number) => persist(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const deleteTodo = (id: number) => persist(prev => prev.filter(t => t.id !== id))
  const saveEdit = () => { if (editId === null) return; const t = editText.trim(); if (!t) { deleteTodo(editId); setEditId(null); return }; persist(prev => prev.map(x => x.id === editId ? { ...x, text: t } : x)); setEditId(null) }
  const pending = todos.filter(t => !t.done), done = todos.filter(t => t.done)
  return <>
    <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/10 ring-1 ring-violet-500/20 text-violet-400"><HiOutlineClipboardList className="w-4 h-4" /></div><div><h3 className="text-sm font-bold text-white">Pense-bête</h3><p className="text-[10px] text-white/35">{pending.length} en cours · {done.length} terminé(s)</p></div></div>{done.length > 0 && <button onClick={() => persist(prev => prev.filter(t => !t.done))} className="text-[10px] text-white/30 hover:text-white/50 transition">Vider</button>}</div>
    <div className="flex gap-2 mb-4"><input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="Nouvelle tâche..." className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition" /><button onClick={addTodo} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-lg shadow-violet-500/20">+</button></div>
    <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
      {todos.length === 0 && <div className="text-center py-4"><EmptyClipboard /><div className="text-xs text-white/25">Aucune tâche</div></div>}
      {[...pending, ...done].map(t => <motion.div key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: t.done ? 0.4 : 1, x: 0 }} className="group flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/[0.03]"><button onClick={() => toggleTodo(t.id)} className={['flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition', t.done ? 'bg-violet-500/30 border-violet-500/40 text-violet-300' : 'border-white/15 hover:border-violet-500/40'].join(' ')}>{t.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>{editId === t.id ? <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null) }} onBlur={saveEdit} className="flex-1 bg-transparent text-sm text-white outline-none border-b border-violet-500/30" /> : <span onDoubleClick={() => { setEditId(t.id); setEditText(t.text) }} className={['flex-1 text-sm cursor-default', t.done ? 'line-through text-white/50' : 'text-white/80'].join(' ')}>{t.text}</span>}<button onClick={() => deleteTodo(t.id)} className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-rose-400 transition text-xs shrink-0">{'✕'}</button></motion.div>)}
    </div>
  </>
}

/* ═══════════════════════════════════════════════ */
/*  CALENDAR                                      */
/* ═══════════════════════════════════════════════ */
const CK = 'peg:calendarEvents'; const CCo: Record<string, { dot: string; bg: string; text: string }> = { production: { dot: 'bg-orange-500', bg: 'bg-orange-500/10 border border-orange-500/20', text: 'text-orange-300' }, reunion: { dot: 'bg-sky-500', bg: 'bg-sky-500/10 border border-sky-500/20', text: 'text-sky-300' }, réunion: { dot: 'bg-sky-500', bg: 'bg-sky-500/10 border border-sky-500/20', text: 'text-sky-300' }, livraison: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 border border-emerald-500/20', text: 'text-emerald-300' }, autre: { dot: 'bg-violet-500', bg: 'bg-violet-500/10 border border-violet-500/20', text: 'text-violet-300' } }
interface RawCalEvent { id: number; title: string; start: string; end: string; category: string }
function CalendarContent() {
  const [events, setEvents] = useState<RawCalEvent[]>([]); const [mOff, setMOff] = useState(0); const today = dayjs(); const vm = today.add(mOff, 'month')
  useEffect(() => {
    // Try Strapi API first, fallback to localStorage
    import('@/services/CalendarEventService').then(({ apiGetCalendarEvents }) =>
      import('@/utils/serviceHelper').then(({ unwrapData }) =>
        unwrapData(apiGetCalendarEvents()).then((data) => {
          const evts = (data.calendarEvents_connection?.nodes ?? []).map((e: any) => ({
            id: e.documentId, title: e.title, start: e.startDate, end: e.endDate, category: e.category,
          }))
          setEvents(evts)
        })
      )
    ).catch(() => {
      const r = localStorage.getItem(CK); if (r) { try { setEvents(JSON.parse(r)) } catch {} }
    })
  }, [])
  const todayEv = events.filter(e => dayjs(e.start).isSame(today, 'day')).sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())
  const dim = vm.daysInMonth(); const sd = vm.startOf('month').day() === 0 ? 6 : vm.startOf('month').day() - 1
  return <>
    <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-blue-600/10 ring-1 ring-sky-500/20 text-sky-400"><HiOutlineCalendar className="w-4 h-4" /></div><div><h3 className="text-sm font-bold text-white capitalize">{vm.format('MMMM YYYY')}</h3><p className="text-[10px] text-white/35">{todayEv.length} aujourd'hui</p></div></div><div className="flex items-center gap-1"><button onClick={() => setMOff(o => o - 1)} className="text-white/30 hover:text-white/60 transition p-1"><HiOutlineChevronLeft className="w-3.5 h-3.5" /></button><button onClick={() => setMOff(0)} className="text-[10px] text-sky-400/50 hover:text-sky-300 transition px-1">Auj.</button><button onClick={() => setMOff(o => o + 1)} className="text-white/30 hover:text-white/60 transition p-1"><HiOutlineChevronRight className="w-3.5 h-3.5" /></button><Link to="/admin/calendar" className="text-[11px] text-sky-400/70 hover:text-sky-300 transition ml-2">Ouvrir →</Link></div></div>
    <div className="grid grid-cols-7 gap-1 mb-4">{['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d => <div key={d} className="text-[9px] text-center text-white/25 font-medium">{d}</div>)}{Array.from({ length: sd }).map((_, i) => <div key={`e-${i}`} />)}{Array.from({ length: dim }).map((_, i) => { const day = i + 1; const isT = mOff === 0 && day === today.date(); const cd = vm.date(day); const he = events.some(e => dayjs(e.start).isSame(cd, 'day')); return <div key={day} className={['text-[10px] text-center py-1 rounded-md relative', isT ? 'bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/30' : 'text-white/40', he && !isT ? 'text-white/70 font-semibold' : ''].join(' ')}>{day}{he && !isT && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400" />}</div> })}</div>
    {mOff === 0 && todayEv.length > 0 && <div className="space-y-1.5"><div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Aujourd'hui</div>{todayEv.map(ev => { const c = CCo[ev.category] ?? CCo.autre; return <div key={ev.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${c.bg}`}><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} /><span className={`text-xs font-medium truncate ${c.text}`}>{ev.title}</span><span className="text-[10px] text-white/30 ml-auto shrink-0">{dayjs(ev.start).format('HH:mm')}</span></div> })}</div>}
  </>
}

/* ═══════════════════════════════════════════════════════════ */
/*  DRAG & DROP WIDGET SYSTEM                                 */
/* ═══════════════════════════════════════════════════════════ */

const LAYOUT_KEY = 'peg:dashboardLayout'

type WidgetId = 'chart-ca' | 'chart-tickets' | 'pipeline' | 'orders' | 'todo' | 'calendar' | 'alerts' | 'deadlines' | 'top-clients' | 'top-producers' | 'activity' | 'additional-sales'

interface WidgetDef {
  id: WidgetId
  label: string
  glow: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky'
  accentGradient: string
  /** Number of columns this widget spans in the 3-col grid */
  span: 1 | 2
}

const WIDGET_DEFS: WidgetDef[] = [
  { id: 'chart-ca', label: "Chiffre d'affaires", glow: 'cyan', accentGradient: 'from-cyan-500 to-blue-600', span: 2 },
  { id: 'chart-tickets', label: 'Tickets', glow: 'violet', accentGradient: 'from-violet-500 to-purple-600', span: 1 },
  { id: 'pipeline', label: 'Pipeline', glow: 'cyan', accentGradient: 'from-cyan-500 to-blue-500', span: 1 },
  { id: 'orders', label: 'Commandes', glow: 'amber', accentGradient: 'from-amber-500 to-orange-500', span: 1 },
  { id: 'todo', label: 'Pense-bête', glow: 'violet', accentGradient: 'from-violet-500 to-purple-600', span: 1 },
  { id: 'calendar', label: 'Calendrier', glow: 'sky', accentGradient: 'from-sky-500 to-blue-600', span: 1 },
  { id: 'alerts', label: 'Alertes', glow: 'rose', accentGradient: 'from-rose-500 to-red-500', span: 1 },
  { id: 'deadlines', label: 'Échéances', glow: 'amber', accentGradient: 'from-amber-500 to-yellow-500', span: 1 },
  { id: 'top-clients', label: 'Top clients', glow: 'emerald', accentGradient: 'from-emerald-500 to-teal-500', span: 1 },
  { id: 'top-producers', label: 'Top producteurs', glow: 'violet', accentGradient: 'from-violet-500 to-purple-500', span: 1 },
  { id: 'activity', label: 'Activité récente', glow: 'sky', accentGradient: 'from-sky-500 to-blue-500', span: 1 },
  { id: 'additional-sales', label: 'Ventes add.', glow: 'emerald', accentGradient: 'from-emerald-500 to-cyan-500', span: 1 },
]

const ALL_WIDGET_IDS: WidgetId[] = ['chart-ca', 'chart-tickets', 'pipeline', 'orders', 'todo', 'calendar', 'alerts', 'deadlines', 'top-clients', 'top-producers', 'activity', 'additional-sales']
const HIDDEN_KEY = 'peg:dashboardHidden'

function loadLayout(): WidgetId[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetId[]
      const missing = ALL_WIDGET_IDS.filter(id => !parsed.includes(id) && !loadHidden().includes(id))
      return [...parsed, ...missing]
    }
  } catch {}
  return [...ALL_WIDGET_IDS]
}

function loadHidden(): WidgetId[] {
  try { const raw = localStorage.getItem(HIDDEN_KEY); if (raw) return JSON.parse(raw) } catch {}
  return []
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN DASHBOARD                                            */
/* ═══════════════════════════════════════════════════════════ */

const MAX_BANNER = 2 * 1024 * 1024

export default function DashboardAdmin() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const { user } = useAppSelector((state) => state.auth.user)

  const [hidePrices, setHidePrices] = useState(arePricesHidden)
  useEffect(() => {
    const onToggle = () => setHidePrices(arePricesHidden())
    window.addEventListener('peg:pricesToggled', onToggle)
    return () => window.removeEventListener('peg:pricesToggled', onToggle)
  }, [])

  const [bannerUrl, setBannerUrl] = useState<string>(() => localStorage.getItem('peg:dashboardBanner') || '')
  const prefDocIdRef = useRef<string | null>(null);
  // Restore banner from Strapi if localStorage is empty
  useEffect(() => {
    if (!user?.documentId) return;
    apiGetAdminPreference(user.documentId).then(pref => {
      if (pref) {
        prefDocIdRef.current = pref.documentId;
        if (!bannerUrl && pref.bannerImage?.url) {
          const url = pref.bannerImage.url.startsWith('http') ? pref.bannerImage.url : (env?.API_ENDPOINT_URL ?? '') + pref.bannerImage.url;
          setBannerUrl(url);
          try { localStorage.setItem('peg:dashboardBanner', url) } catch {}
        }
      }
    }).catch(() => {});
  }, [user?.documentId]);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gql, setGql] = useState<any>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [lastUpdatedText, setLastUpdatedText] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(loadLayout)
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>(loadHidden)

  const fetchDashboard = async () => { try { setLoading(true); setError(null); const res = await apiGetDashboardSuperAdminInformations(); const data = (res as any)?.data?.data ?? (res as any)?.data ?? null; if (!data) throw new Error('Réponse vide'); setGql(data); setLastUpdated(new Date()) } catch (e: any) { setError(e?.message ?? 'Erreur') } finally { setLoading(false) } }
  useEffect(() => { fetchDashboard() }, [refreshTick])
  useEffect(() => { const fn = () => { if (document.visibilityState === 'visible') setRefreshTick(t => t + 1) }; document.addEventListener('visibilitychange', fn); return () => document.removeEventListener('visibilitychange', fn) }, [])
  useEffect(() => { const up = () => { if (lastUpdated) setLastUpdatedText(dayjs(lastUpdated).fromNow()) }; up(); const iv = setInterval(up, 30000); return () => clearInterval(iv) }, [lastUpdated])

  const projects = gql?.projects_connection?.nodes ?? []; const invoices = gql?.invoices_connection?.nodes ?? []; const tickets = gql?.tickets_connection?.nodes ?? []; const orderItems = gql?.orderItems_connection?.nodes ?? []; const transactions = gql?.transactions_connection?.nodes ?? []

  // Fetch expenses for margin calculations
  const [allExpenses, setAllExpenses] = useState<any[]>([])
  useEffect(() => {
    import('@/services/ExpenseServices').then(({ apiGetExpenses }) => {
      import('@/utils/serviceHelper').then(({ unwrapData }) => {
        unwrapData(apiGetExpenses({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' }))
          .then(({ expenses_connection }) => setAllExpenses(expenses_connection?.nodes ?? []))
          .catch(() => {})
      })
    })
  }, [refreshTick])
  const totalExpensesGlobal = useMemo(() => allExpenses.reduce((a: number, e: any) => a + (Number(e?.totalAmount) || 0), 0), [allExpenses])

  // Ventes additionnelles — agrégées depuis les projets
  const allAdditionalSales = useMemo(() => {
    const sales: { label: string; amount: number; date: string; note?: string; projectName: string; projectId: string }[] = []
    for (const p of projects) {
      if (!Array.isArray(p?.additionalSales)) continue
      for (const s of p.additionalSales) sales.push({ ...s, projectName: p.name ?? '—', projectId: p.documentId })
    }
    return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [projects])
  const totalAdditionalSales = useMemo(() => allAdditionalSales.reduce((a, s) => a + (Number(s.amount) || 0), 0), [allAdditionalSales])

  const projectsTotal = gql?.projects_connection?.pageInfo?.total ?? 0; const customersTotal = gql?.customers_connection?.pageInfo?.total ?? 0; const producersTotal = gql?.producers_connection?.pageInfo?.total ?? 0; const ticketsTotal = gql?.tickets_connection?.pageInfo?.total ?? 0; const orderItemsTotal = gql?.orderItems_connection?.pageInfo?.total ?? 0

  const invoiceTotal = useMemo(() => invoices.reduce((a: number, x: any) => a + (Number(x?.totalAmount) || 0), 0) + projects.reduce((a: number, p: any) => a + (Array.isArray(p?.invoices) && p.invoices.length > 0 ? 0 : (Number(p?.price) || 0)), 0) + totalAdditionalSales, [invoices, projects, totalAdditionalSales])
  const invoicePaid = useMemo(() => { const fi = invoices.reduce((a: number, x: any) => { const ps = (x?.paymentState ?? '').toString().toLowerCase(); const st = (x?.state ?? '').toString().toLowerCase(); return a + ((ps === 'fulfilled' || st === 'fulfilled' || ps.includes('paid') || ps === 'paye' || st.includes('paid')) ? (Number(x?.totalAmount) || 0) : 0) }, 0); return fi + projects.reduce((a: number, p: any) => a + (Array.isArray(p?.invoices) && p.invoices.length > 0 ? 0 : (Number(p?.paidPrice) || 0)), 0) }, [invoices, projects])
  const invoicePending = Math.max(0, invoiceTotal - invoicePaid)
  const overdueInvoices = useMemo(() => { const now = new Date(); return invoices.filter((x: any) => { const d = safeDate(x?.dueDate) ?? safeDate(x?.date); if (!d) return false; const ps = (x?.paymentState ?? '').toString().toLowerCase(); const st = (x?.state ?? '').toString().toLowerCase(); return d.getTime() < now.getTime() && !(ps === 'fulfilled' || st === 'fulfilled' || ps.includes('paid') || ps === 'paye') }).length }, [invoices])
  const atRiskProjects = useMemo(() => { const now = new Date(); return projects.filter((p: any) => { const end = safeDate(p?.endDate); if (!end) return false; const s = (p?.state ?? '').toString().toLowerCase(); return end.getTime() < now.getTime() && !(s.includes('done') || s.includes('closed') || s.includes('term') || s.includes('livr')) }).length }, [projects])
  const avgDeliveryDays = useMemo(() => { const p2 = projects.map((p: any) => ({ s: safeDate(p?.startDate), e: safeDate(p?.endDate) })).filter((x: any) => x.s && x.e); if (!p2.length) return 0; return Math.round(p2.reduce((a: number, x: any) => a + Math.max(0, (x.e.getTime() - x.s.getTime()) / 86400000), 0) / p2.length) }, [projects])
  const totalCosts = useMemo(() => transactions.reduce((a: number, x: any) => a + (Number(x?.amount) || 0), 0), [transactions])
  const totalProducerCosts = useMemo(() => projects.reduce((a: number, p: any) => a + Math.max(Number(p?.producerPrice) || 0, Number(p?.producerPaidPrice) || 0), 0), [projects])
  const margeBrute = Math.max(0, invoiceTotal - totalCosts - totalProducerCosts - totalExpensesGlobal); const margePct = invoiceTotal > 0 ? Math.round((margeBrute / invoiceTotal) * 100) : 0
  const TAX_RATE = 0.15; const beneficeNet = margeBrute * (1 - TAX_RATE); const impotEstime = margeBrute * TAX_RATE
  const openTickets = useMemo(() => tickets.filter((t: any) => !String(t?.state ?? '').toLowerCase().includes('closed')).length, [tickets])

  const revenue6m = useMemo(() => {
    const now = new Date(); const months: string[] = []; for (let i = 5; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
    const by = new Map<string, { ca: number; costs: number; paid: number; depenses: number }>(); months.forEach(k => by.set(k, { ca: 0, costs: 0, paid: 0, depenses: 0 }))
    for (const inv of invoices) { const d = safeDate(inv?.date); if (!d) continue; const k = monthKey(d); if (!by.has(k)) continue; const e = by.get(k)!; e.ca += (Number(inv?.totalAmount) || 0); const ps = (inv?.paymentState ?? '').toString().toLowerCase(); const st = (inv?.state ?? '').toString().toLowerCase(); if (ps === 'fulfilled' || st === 'fulfilled' || ps.includes('paid') || ps === 'paye' || st.includes('paid')) e.paid += (Number(inv?.totalAmount) || 0) }
    // Ajouter les projets sans facture au CA du mois correspondant
    for (const p of projects) { if (Array.isArray(p?.invoices) && p.invoices.length > 0) continue; const price = Number(p?.price) || 0; if (!price) continue; const d = safeDate(p?.startDate) ?? safeDate(p?.createdAt); if (!d) continue; const k = monthKey(d); if (!by.has(k)) continue; by.get(k)!.ca += price; const paidPrice = Number(p?.paidPrice) || 0; if (paidPrice) by.get(k)!.paid += paidPrice }
    for (const tx of transactions) { const d = safeDate(tx?.date); if (!d) continue; const k = monthKey(d); if (by.has(k)) by.get(k)!.costs += (Number(tx?.amount) || 0) }
    // Ajouter les coûts producteur par mois
    for (const p of projects) { const cost = Math.max(Number(p?.producerPrice) || 0, Number(p?.producerPaidPrice) || 0); if (!cost) continue; const d = safeDate(p?.startDate) ?? safeDate(p?.createdAt); if (!d) continue; const k = monthKey(d); if (by.has(k)) by.get(k)!.costs += cost }
    // Ajouter les dépenses par mois
    for (const exp of allExpenses) { const d = safeDate(exp?.date); if (!d) continue; const k = monthKey(d); if (by.has(k)) { by.get(k)!.costs += (Number(exp?.totalAmount) || 0); by.get(k)!.depenses += (Number(exp?.totalAmount) || 0) } }
    // Ajouter les ventes additionnelles au CA par mois
    for (const s of allAdditionalSales) { const d = safeDate(s.date); if (!d) continue; const k = monthKey(d); if (by.has(k)) by.get(k)!.ca += (Number(s.amount) || 0) }
    return months.map(k => { const b = by.get(k)!; return { label: monthLabel(k), ca: b.ca, marge: Math.max(0, b.ca - b.costs), paid: b.paid, depenses: b.depenses } })
  }, [invoices, transactions, projects, allExpenses, allAdditionalSales])
  const caSparkData = revenue6m.map(d => d.ca); const caLastMonth = revenue6m.length >= 2 ? revenue6m[revenue6m.length - 2].ca : 0
  const paidLastMonth = revenue6m.length >= 2 ? revenue6m[revenue6m.length - 2].paid : 0; const paidThisMonth = revenue6m.length >= 1 ? revenue6m[revenue6m.length - 1].paid : 0

  const pipeline = useMemo(() => { const m = new Map<string, number>(); for (const p of projects) m.set((p?.state ?? 'unknown').toString(), (m.get((p?.state ?? 'unknown').toString()) ?? 0) + 1); return Array.from(m.entries()).map(([l, v]) => ({ label: l, value: v })).sort((a, b) => b.value - a.value).slice(0, 8) }, [projects])
  const topProducers = useMemo(() => { const m = new Map<string, { projects: number; revenue: number }>(); for (const p of projects) { const n = p?.producer?.name ?? '—'; const c = m.get(n) ?? { projects: 0, revenue: 0 }; m.set(n, { projects: c.projects + 1, revenue: c.revenue + (Number(p?.price) || 0) }) }; return Array.from(m.entries()).map(([n, v]) => ({ name: n, ...v })).sort((a, b) => b.projects - a.projects || b.revenue - a.revenue).slice(0, 6) }, [projects])
  const topClients = useMemo(() => { const m = new Map<string, number>(); for (const inv of invoices) { const n = inv?.customer?.name ?? '—'; m.set(n, (m.get(n) ?? 0) + (Number(inv?.totalAmount) || 0)) }; for (const p of projects) { if (Array.isArray(p?.invoices) && p.invoices.length > 0) continue; const n = p?.customer?.name ?? '—'; m.set(n, (m.get(n) ?? 0) + (Number(p?.price) || 0)) }; return Array.from(m.entries()).map(([n, r]) => ({ name: n, revenue: r })).sort((a, b) => b.revenue - a.revenue).slice(0, 6) }, [invoices, projects])
  const activity = useMemo(() => {
    const items: { ts: number; left: string; right: string; sub?: string; type?: 'invoice' | 'project' }[] = []
    for (const inv of invoices.slice(0, 20)) { const d = safeDate(inv?.date); if (d) items.push({ ts: d.getTime(), left: `${inv?.customer?.name ?? 'Client'} — ${inv?.name ?? 'Facture'}`, right: eur(Number(inv?.totalAmount) || 0), sub: dayjs(d).fromNow(), type: 'invoice' }) }
    for (const p of projects.slice(0, 20)) { const d = safeDate(p?.startDate) ?? safeDate(p?.endDate); if (d) items.push({ ts: d.getTime(), left: `${p?.customer?.name ?? 'Client'} — ${p?.name ?? 'Projet'}`, right: (p?.state ?? '').toString(), sub: dayjs(d).fromNow(), type: 'project' }) }
    return items.sort((a, b) => b.ts - a.ts).slice(0, 8)
  }, [invoices, projects])
  const upcomingDeadlines = useMemo(() => { const now = new Date(); const in14 = new Date(now.getTime() + 14 * 86400000); return projects.filter((p: any) => { const end = safeDate(p?.endDate); if (!end) return false; const s = (p?.state ?? '').toString().toLowerCase(); return !(s.includes('done') || s.includes('closed') || s.includes('term') || s.includes('livr')) && end.getTime() >= now.getTime() && end.getTime() <= in14.getTime() }).sort((a: any, b: any) => (safeDate(a?.endDate)?.getTime() ?? 0) - (safeDate(b?.endDate)?.getTime() ?? 0)).slice(0, 6).map((p: any) => { const end = safeDate(p?.endDate)!; const dl = Math.ceil((end.getTime() - new Date().getTime()) / 86400000); return { left: p?.name ?? '—', sub: `${p?.customer?.name ?? '—'} · ${p?.producer?.name ?? '—'}`, right: `J-${dl}`, urgent: dl <= 3 } }) }, [projects])
  const ordersByState = useMemo(() => { const m = new Map<string, number>(); for (const o of orderItems) m.set((o?.state ?? 'inconnu').toString(), (m.get((o?.state ?? 'inconnu').toString()) ?? 0) + 1); return Array.from(m.entries()).map(([l, v]) => ({ label: l, value: v })).sort((a, b) => b.value - a.value) }, [orderItems])
  const ticketsByState = useMemo(() => { const m = new Map<string, number>(); for (const t of tickets) m.set((t?.state ?? 'inconnu').toString(), (m.get((t?.state ?? 'inconnu').toString()) ?? 0) + 1); return Array.from(m.entries()).map(([l, v]) => ({ label: l, value: v })).sort((a, b) => b.value - a.value) }, [tickets])

  const onPickBanner = () => fileRef.current?.click()
  const onBannerFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_BANNER) { setError('Image trop lourde. Max 2MB.'); return }
    // Preview immediately
    const r = new FileReader(); r.onload = e => { const b = e.target?.result as string; try { localStorage.setItem('peg:dashboardBanner', b); setBannerUrl(b) } catch {} }; r.readAsDataURL(file);
    // Upload to Strapi
    try {
      if (!prefDocIdRef.current && user?.documentId) {
        const created = await apiCreateAdminPreference(user.documentId, {});
        if (created?.documentId) prefDocIdRef.current = created.documentId;
      }
      if (prefDocIdRef.current) {
        const uploaded = await apiUploadBanner(file, prefDocIdRef.current);
        if (uploaded?.[0]?.url) {
          const url = uploaded[0].url.startsWith('http') ? uploaded[0].url : (env?.API_ENDPOINT_URL ?? '') + uploaded[0].url;
          setBannerUrl(url);
          try { localStorage.setItem('peg:dashboardBanner', url) } catch {}
        }
      }
    } catch (err) { console.error('[Banner upload]', err) }
  }

  const dataReady = gql !== null
  const greetHour = new Date().getHours()
  const greeting = greetHour < 12 ? 'Bonjour' : greetHour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = user?.firstName || user?.username || ''
  const attentionCount = (overdueInvoices > 0 ? 1 : 0) + (atRiskProjects > 0 ? 1 : 0) + (openTickets > 0 ? 1 : 0) + (upcomingDeadlines.length > 0 ? 1 : 0)

  /* ── Native HTML5 D&D ── */
  const dragFromRef = useRef<number | null>(null)
  const dragOverRef = useRef<number | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    dragFromRef.current = idx
    setDraggingIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    // Transparent drag image (we use visual feedback via state)
    const el = document.createElement('div')
    el.style.opacity = '0'
    document.body.appendChild(el)
    e.dataTransfer.setDragImage(el, 0, 0)
    setTimeout(() => document.body.removeChild(el), 0)
  }

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverRef.current !== idx) {
      dragOverRef.current = idx
      setDragOverIdx(idx)
    }
  }

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    const from = dragFromRef.current
    if (from === null || from === idx) { setDraggingIdx(null); setDragOverIdx(null); return }
    const items = Array.from(widgetOrder)
    const [moved] = items.splice(from, 1)
    items.splice(idx, 0, moved)
    setWidgetOrder(items)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(items))
    dragFromRef.current = null
    dragOverRef.current = null
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  const handleDragEnd = () => {
    dragFromRef.current = null
    dragOverRef.current = null
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  const resetLayout = () => { setWidgetOrder([...ALL_WIDGET_IDS]); setHiddenWidgets([]); localStorage.removeItem(LAYOUT_KEY); localStorage.removeItem(HIDDEN_KEY) }

  const hideWidget = (id: WidgetId) => {
    const newOrder = widgetOrder.filter(w => w !== id)
    const newHidden = [...hiddenWidgets, id]
    setWidgetOrder(newOrder)
    setHiddenWidgets(newHidden)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(newOrder))
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(newHidden))
  }

  const showWidget = (id: WidgetId) => {
    const newOrder = [...widgetOrder, id]
    const newHidden = hiddenWidgets.filter(w => w !== id)
    setWidgetOrder(newOrder)
    setHiddenWidgets(newHidden)
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(newOrder))
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(newHidden))
  }

  const visibleWidgets = widgetOrder.filter(w => !hiddenWidgets.includes(w))

  /* ── Widget renderer ── */
  const renderWidget = (id: WidgetId) => {
    const def = WIDGET_DEFS.find(w => w.id === id)!
    if (!dataReady) return <ChartSkeleton height="h-[180px]" />

    switch (id) {
      case 'chart-ca': return <><SectionHeader title="Chiffre d'affaires" subtitle="CA vs marge sur 6 mois" /><AreaChart data={revenue6m} /></>
      case 'chart-tickets': return <><SectionHeader title="Tickets" subtitle={`${ticketsTotal} au total`} />{ticketsByState.length > 0 ? <DonutChart data={ticketsByState} centerValue={String(ticketsTotal)} centerLabel="total" /> : <div className="text-center py-6"><EmptyTicket /><div className="text-xs text-white/25">Aucun ticket</div></div>}</>
      case 'pipeline': return <><SectionHeader title="Pipeline" subtitle="Par statut" right={<button onClick={() => navigate('/common/projects')} className="text-[11px] text-cyan-400/60 hover:text-cyan-300 transition">Ouvrir →</button>} /><HorizontalBars items={pipeline} onClick={l => navigate(`/common/projects?state=${encodeURIComponent(l)}`)} /></>
      case 'orders': return <><SectionHeader title="Commandes" subtitle={`${orderItemsTotal} au total`} />{ordersByState.length > 0 ? <DonutChart data={ordersByState} centerValue={String(orderItemsTotal)} centerLabel="total" /> : <div className="text-center py-6"><EmptyTicket /><div className="text-xs text-white/25">Aucune commande</div></div>}</>
      case 'todo': return <TodoListWidget />
      case 'calendar': return <CalendarContent />
      case 'alerts': return <><SectionHeader title="Alertes" subtitle="Points d'attention" /><div className="space-y-2">{overdueInvoices > 0 ? <AlertCard variant="danger" pulse>{overdueInvoices} facture(s) en retard</AlertCard> : <AlertCard variant="success">Aucune facture en retard</AlertCard>}{atRiskProjects > 0 && <AlertCard variant="warning" pulse>{atRiskProjects} projet(s) à risque</AlertCard>}{openTickets > 0 && <AlertCard variant="info">{openTickets} ticket(s) ouvert(s)</AlertCard>}{upcomingDeadlines.length > 0 && <AlertCard variant="warning">{upcomingDeadlines.length} échéance(s) dans 14j</AlertCard>}</div></>
      case 'deadlines': return <><SectionHeader title="Échéances (14j)" subtitle="Projets non terminés" right={<button onClick={() => navigate('/common/projects')} className="text-[11px] text-amber-400/60 hover:text-amber-300 transition">Tous →</button>} />{upcomingDeadlines.length === 0 ? <div className="text-center py-4"><EmptyCalendar /><div className="text-xs text-white/25">Aucune échéance</div></div> : <div className="space-y-2">{upcomingDeadlines.map((d, i) => <div key={i} className="flex items-start justify-between gap-3 py-1.5"><div className="min-w-0"><div className="text-sm text-white/75 truncate">{d.left}</div><div className="text-[11px] text-white/35 truncate">{d.sub}</div></div><span className={['text-xs font-bold px-2.5 py-1 rounded-full shrink-0', d.urgent ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/15 text-amber-300'].join(' ')}>{d.right}</span></div>)}</div>}</>
      case 'top-clients': return <><SectionHeader title="Top clients" subtitle="Par CA facturé" right={<button onClick={() => navigate('/admin/customers/list')} className="text-[11px] text-emerald-400/60 hover:text-emerald-300 transition">Voir tous →</button>} /><div className="space-y-3">{topClients.map((c, i) => <div key={i} className="flex items-center gap-3"><MedalBadge rank={i + 1} color="emerald" /><div className="flex-1 min-w-0"><div className="text-sm text-white/75 truncate">{c.name}</div></div><div className="text-sm font-semibold text-emerald-400/80 shrink-0">{eur(c.revenue)}</div></div>)}</div></>
      case 'top-producers': return <><SectionHeader title="Top producteurs" subtitle="Par projets" right={<button onClick={() => navigate('/admin/producers/list')} className="text-[11px] text-violet-400/60 hover:text-violet-300 transition">Voir tous →</button>} /><div className="space-y-3">{topProducers.map((p, i) => <div key={i} className="flex items-center gap-3"><MedalBadge rank={i + 1} color="violet" /><div className="flex-1 min-w-0"><div className="text-sm text-white/75 truncate">{p.name}</div><div className="text-[10px] text-white/30">{p.projects} projet(s)</div></div><div className="text-sm font-semibold text-violet-400/80 shrink-0">{p.revenue ? eur(p.revenue) : '—'}</div></div>)}</div></>
      case 'activity': return <><SectionHeader title="Activité récente" subtitle="Projets & factures" /><ActivityFeed items={activity} /></>
      case 'additional-sales': return <><SectionHeader title="Ventes additionnelles" subtitle={`${allAdditionalSales.length} vente(s) · ${eur(totalAdditionalSales)}`} />{allAdditionalSales.length === 0 ? <div className="text-center py-6"><EmptyClipboard /><div className="text-xs text-white/25">Aucune vente additionnelle</div></div> : <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">{allAdditionalSales.slice(0, 15).map((s, i) => <div key={i} className="flex items-start justify-between gap-3 py-1.5"><div className="min-w-0"><div className="text-sm text-white/75 truncate">{s.label}</div><div className="text-[11px] text-white/35 truncate">{s.projectName} · {dayjs(s.date).format('DD/MM/YY')}</div></div><span className="text-sm font-bold text-emerald-400/80 shrink-0">{eur(s.amount)}</span></div>)}</div>}</>
      default: return null
    }
  }

  return (
    <div className="relative">
      <MeshBackground />
      <Container>
        <div className="relative z-10 space-y-4 pb-8">

          {/* HERO BANNER */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative overflow-hidden rounded-3xl border border-white/[0.08] aspect-[5/1] md:aspect-[6/1]">
            {bannerUrl ? <img src={bannerUrl} alt="" className="h-full w-full object-cover" /> : <><div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" /><HeroIllustration /></>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/0" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
            <div className="absolute left-4 md:left-6 bottom-4 md:bottom-6">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
              <p className="text-white/50 text-xs md:text-sm mt-1">{attentionCount > 0 ? `${attentionCount} point${attentionCount > 1 ? 's' : ''} d'attention` : 'Tout est en ordre'} — {dayjs().format('dddd D MMMM')}</p>
            </div>
            <div className="absolute right-4 md:right-5 top-4 md:top-5 flex items-center gap-2">
              {lastUpdatedText && <span className="text-[10px] text-white/30 hidden md:inline">Mis à jour {lastUpdatedText}</span>}
              <button onClick={() => togglePricesHidden()} title={hidePrices ? 'Afficher les prix' : 'Masquer les prix'} className={`backdrop-blur-md border px-3 py-1.5 rounded-xl transition text-xs flex items-center gap-1.5 ${hidePrices ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' : 'bg-white/10 border-white/15 text-white/80 hover:bg-white/15'}`}>{hidePrices ? <HiOutlineEyeOff className="w-3.5 h-3.5" /> : <HiOutlineEye className="w-3.5 h-3.5" />}<span className="hidden md:inline">{hidePrices ? 'Prix masqués' : 'Prix'}</span></button>
              <button onClick={() => setRefreshTick(t => t + 1)} className="bg-white/10 backdrop-blur-md border border-white/15 text-white/80 px-3 py-1.5 rounded-xl hover:bg-white/15 transition text-xs"><HiOutlineRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
              <button onClick={onPickBanner} className="bg-white/10 backdrop-blur-md border border-white/15 text-white/80 px-3 py-1.5 rounded-xl hover:bg-white/15 transition text-xs"><HiOutlinePhotograph className="w-3.5 h-3.5" /></button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onBannerFile(e.target.files?.[0])} />
            </div>
            {error && <div className="absolute left-4 md:left-6 top-4 md:top-5 text-xs text-rose-300 bg-rose-500/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-rose-500/20">{error}</div>}
          </motion.div>

          {/* FINANCES KPI ROW (fixed, not draggable) */}
          <div>
            <SectionHeader title="Finances" subtitle="Suivi du chiffre d'affaires" right={
              <div className="flex items-center gap-2">
                {editMode && <button onClick={resetLayout} className="text-[11px] text-white/30 hover:text-white/50 transition">Réinitialiser</button>}
                <button onClick={() => setEditMode(!editMode)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition ${editMode ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'}`}>
                  {editMode ? <HiOutlineLockOpen className="w-3.5 h-3.5" /> : <HiOutlineLockClosed className="w-3.5 h-3.5" />}
                  {editMode ? 'Verrouiller' : 'Personnaliser'}
                </button>
              </div>
            } />
            {!dataReady ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)}</div> : (<>
              <AnimatedSection className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <motion.div variants={fadeInUp} custom={0} className="md:col-span-2 lg:col-span-2">
                  <GlassCard onClick={() => navigate('/admin/invoices')} glow="cyan" className="h-full"><div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 opacity-90" /><div className="absolute bottom-0 left-0 right-0 h-24 opacity-20 pointer-events-none"><Sparkline data={caSparkData} color="#22d3ee" height={96} /></div><div className="relative p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-widest text-cyan-400/60 flex items-center gap-2"><HiOutlineLightningBolt className="w-3.5 h-3.5" />CA total TTC</div><div className="mt-2 text-3xl md:text-4xl font-black text-white tracking-tight"><AnimatedValue value={invoiceTotal} format={eur} /></div><div className="text-sm text-white/40 mt-0.5">{eur(toHT(invoiceTotal))} HT</div><div className="flex items-center gap-3 mt-2"><DeltaBadge current={invoiceTotal} previous={caLastMonth} />{caLastMonth > 0 && <span className="text-xs text-white/35">vs mois préc.</span>}</div></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 ring-1 ring-cyan-500/25 shrink-0 text-cyan-400"><HiOutlineCurrencyEuro className="w-6 h-6" /></div></div></div></GlassCard>
                </motion.div>
                <motion.div variants={fadeInUp} custom={1}><KPI title="Encaissé TTC" value={eur(invoicePaid)} subtitle={`${eur(toHT(invoicePaid))} HT`} icon={<HiOutlineCheckCircle className="w-5 h-5" />} variant="success" onClick={() => navigate('/admin/invoices')} delta={<DeltaBadge current={paidThisMonth} previous={paidLastMonth} />} /></motion.div>
                <motion.div variants={fadeInUp} custom={2}><KPI title="Reste à encaisser" value={eur(invoicePending)} subtitle={`${eur(toHT(invoicePending))} HT`} icon={<HiOutlineClock className="w-5 h-5" />} variant={invoicePending > 0 ? 'warning' : 'success'} onClick={() => navigate('/admin/invoices')} /></motion.div>
              </AnimatedSection>
              <AnimatedSection className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                <motion.div variants={fadeInUp} custom={0}>
                  <GlassCard glow={margePct >= 30 ? 'emerald' : margePct >= 15 ? 'amber' : 'rose'} className="h-full"><div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${vc[margePct >= 30 ? 'success' : margePct >= 15 ? 'warning' : 'danger'].gradient} opacity-80`} /><div className="relative p-5"><div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Marge brute</div><div className="flex items-center gap-3 mt-2"><ProgressRing pct={margePct} color={margePct >= 30 ? '#34d399' : margePct >= 15 ? '#fbbf24' : '#fb7185'} /><div><div className="text-2xl font-black text-white">{margePct}%</div><div className="text-xs text-white/45">{eur(margeBrute)} TTC</div><div className="text-[10px] text-white/30">{eur(toHT(margeBrute))} HT</div></div></div></div></GlassCard>
                </motion.div>
                <motion.div variants={fadeInUp} custom={1}>
                  <GlassCard glow="cyan" className="h-full"><div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 to-emerald-500 opacity-80" /><div className="relative p-5"><div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Ventes add.</div><div className="mt-2"><div className="text-2xl font-black text-cyan-400"><AnimatedValue value={totalAdditionalSales} format={eur} /></div><div className="text-xs text-white/45 mt-1">{eur(toHT(totalAdditionalSales))} HT</div><div className="text-[10px] text-white/30 mt-1">{allAdditionalSales.length} vente(s)</div></div></div></GlassCard>
                </motion.div>
                <motion.div variants={fadeInUp} custom={2}>
                  <GlassCard glow="emerald" className="h-full"><div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80" /><div className="relative p-5"><div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Bénéfice net estimé</div><div className="mt-2"><div className="text-2xl font-black text-emerald-400">{eur(beneficeNet)}</div><div className="text-xs text-white/45 mt-1">{eur(toHT(beneficeNet))} HT</div><div className="flex items-center gap-1.5 mt-2"><span className="text-[10px] text-white/30">Impôt 15% :</span><span className="text-[10px] text-rose-400/70 font-semibold">-{eur(impotEstime)}</span></div></div></div></GlassCard>
                </motion.div>
                <motion.div variants={fadeInUp} custom={3}>
                  <GlassCard glow="rose" className="h-full"><div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-400 to-orange-500 opacity-80" /><div className="relative p-5"><div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Dépenses totales</div><div className="mt-2"><div className="text-2xl font-black text-rose-400">{eur(totalExpensesGlobal)}</div><div className="text-xs text-white/45 mt-1">{eur(toHT(totalExpensesGlobal))} HT</div></div></div></GlassCard>
                </motion.div>
              </AnimatedSection>
            </>)}
          </div>

          {/* OPERATIONS KPI (fixed) */}
          {dataReady && (
            <AnimatedSection className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <motion.div variants={fadeInUp} custom={0}><KPI title="Projets" value={String(projectsTotal)} icon={<HiOutlineCube className="w-5 h-5" />} onClick={() => navigate('/common/projects')} /></motion.div>
              <motion.div variants={fadeInUp} custom={1}><KPI title="Projets à risque" value={String(atRiskProjects)} icon={<HiOutlineExclamation className="w-5 h-5" />} variant={atRiskProjects > 0 ? 'danger' : 'default'} onClick={() => navigate('/common/projects')} /></motion.div>
              <motion.div variants={fadeInUp} custom={2}><KPI title="Commandes" value={String(orderItemsTotal)} icon={<HiOutlineShoppingCart className="w-5 h-5" />} onClick={() => navigate('/admin/order-items')} /></motion.div>
              <motion.div variants={fadeInUp} custom={3}><KPI title="Délai moyen" value={`${avgDeliveryDays}j`} subtitle="Livraison" icon={<HiOutlineClock className="w-5 h-5" />} /></motion.div>
              <motion.div variants={fadeInUp} custom={4}><KPI title="Tickets" value={`${openTickets}/${ticketsTotal}`} subtitle="ouverts" icon={<HiOutlineTicket className="w-5 h-5" />} variant={openTickets > 0 ? 'warning' : 'default'} onClick={() => navigate('/support')} /></motion.div>
            </AnimatedSection>
          )}

          {/* DRAGGABLE WIDGETS GRID */}
          {editMode && (
            <div className="space-y-3">
              <div className="text-center text-xs text-cyan-400/60 bg-cyan-500/5 border border-cyan-500/10 rounded-xl py-2 px-4 flex items-center justify-center gap-2">
                <HiOutlineSelector className="w-4 h-4" />
                Glisse les widgets pour réorganiser · Clique ✕ pour masquer
              </div>

              {/* Hidden widgets — click to restore */}
              {hiddenWidgets.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-white/30 flex items-center gap-1"><HiOutlineEyeOff className="w-3.5 h-3.5" />Masqués :</span>
                  {hiddenWidgets.map(hid => {
                    const hDef = WIDGET_DEFS.find(w => w.id === hid)
                    if (!hDef) return null
                    return (
                      <button
                        key={hid}
                        onClick={() => showWidget(hid)}
                        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/15 transition"
                      >
                        <HiOutlinePlus className="w-3 h-3" />
                        {hDef.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleWidgets.map((wid, index) => {
              const def = WIDGET_DEFS.find(w => w.id === wid)
              if (!def) return null
              const isDragging = draggingIdx === index
              const isOver = dragOverIdx === index && draggingIdx !== index

              return (
                <div
                  key={wid}
                  draggable={editMode}
                  onDragStart={editMode ? handleDragStart(index) : undefined}
                  onDragOver={editMode ? handleDragOver(index) : undefined}
                  onDrop={editMode ? handleDrop(index) : undefined}
                  onDragEnd={editMode ? handleDragEnd : undefined}
                  className={[
                    def.span === 2 ? 'md:col-span-2' : '',
                    'transition-all duration-200',
                    isDragging ? 'opacity-40 scale-[0.97]' : '',
                    isOver ? 'scale-[1.01]' : '',
                  ].join(' ')}
                >
                  <GlassCard glow={def.glow} className={[
                    'p-4 md:p-5 h-full',
                    editMode ? 'ring-1 ring-cyan-500/20 cursor-grab active:cursor-grabbing' : '',
                    isOver ? 'ring-2 ring-cyan-400/50 shadow-2xl shadow-cyan-500/20' : '',
                  ].join(' ')}>
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${def.accentGradient} opacity-80`} />

                    {editMode && (
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                        <div className="flex items-center gap-1 bg-white/[0.08] backdrop-blur-md border border-white/10 rounded-lg px-2 py-1">
                          <HiOutlineSelector className="w-3.5 h-3.5 text-white/40" />
                          <span className="text-[10px] text-white/30">{def.label}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); hideWidget(wid) }}
                          className="flex items-center justify-center h-6 w-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition"
                          title="Masquer ce widget"
                        >
                          <HiOutlineX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className={`relative ${editMode ? 'pt-5' : ''}`}>
                      {renderWidget(wid)}
                    </div>
                  </GlassCard>
                </div>
              )
            })}
          </div>

        </div>
      </Container>
    </div>
  )
}
