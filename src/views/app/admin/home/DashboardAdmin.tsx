/**
 * COMPOSANT PROTEGE — NE PAS MODIFIER SANS DEMANDE EXPLICITE DE NOVA
 * Contient : banniere admin (hero), pense-bete (TodoListWidget), layout widgets
 * Derniere validation : 2026-04-18
 * Ajout 2026-09-02 (demande Nova) : detail du widget « Reste a encaisser » (PendingBreakdownModal)
 * Ajout 2026-09-25 (demande explicite) : rendu TELEPHONE (< md) style « app de paiement »
 *   → DashboardAdminMobile, composant d'affichage : memes calculs (ceux de ce fichier), memes
 *   libelles, banniere / pense-bete / widgets conserves. Rendu ordinateur inchange.
 * Ajout 2026-11-22 (demande explicite) : rendu « hub », meme design que la page Master Print, sur TOUS
 *   les ecrans → DashboardAdminHub, composant d'affichage : memes calculs, banniere / pense-bete /
 *   widgets (ordre, masquage, glisser-deposer) conserves ; DashboardAdminMobile retire.
 * Reference : GLOSSARY.md + PROTECTED_COMPONENTS.md
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAppSelector } from '@/store'
import { apiGetDashboardSuperAdminInformations, apiGetProjectsAdditionalSales } from '@/services/DashboardSuperAdminService'
import { apiGetAdminPreference, apiCreateAdminPreference, apiUpdateAdminPreference, apiUploadBanner } from '@/services/AdminPreferenceService'
import { env } from '@/configs/env.config'
import { toHT } from '@/utils/priceHelpers'
import { shrinkImage } from '@/utils/imageShrink'
import { areDashboardFiguresHidden, toggleDashboardFiguresHidden, DASHBOARD_FIGURES_EVENT, HIDDEN_FIGURE } from './dashboardFigures'
import { statusTextData } from '@/views/app/common/projects/lists/constants'
import DashboardAdminHub, { AlertRows, Empty, Rows, StateBars, WidgetHead, WidgetLink, type HubTone } from './DashboardAdminHub'
import RevenueWidget from './RevenueWidget'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  HiOutlineCurrencyEuro, HiOutlineCheckCircle, HiOutlineClock, HiOutlineChartBar,
  HiOutlineCube, HiOutlineExclamation, HiOutlineShoppingCart,
  HiOutlineTicket, HiOutlineSwitchHorizontal,
  HiOutlineCalendar, HiOutlineClipboardList,
  HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineLightningBolt, HiOutlineX,
} from 'react-icons/hi'

dayjs.extend(isoWeek); dayjs.extend(relativeTime); dayjs.locale('fr')

/* ═══════════════════════════════════════════════ */
/*  UTILS                                         */
/* ═══════════════════════════════════════════════ */
function safeDate(s?: string) { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d }
// Masquage : chiffres de CE tableau de bord seulement (dashboardFigures.ts), jamais le reste de l'app
function eur(n: number) { if (areDashboardFiguresHidden()) return HIDDEN_FIGURE; try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n) } catch { return `${Math.round(n)} €` } }
// « En cours (payé) » (pending_paid) : projet en production dont le prix est réglé → compté comme encaissé
// même si paidPrice n'a pas été synchronisé (le serveur l'aligne aussi, ceinture et bretelles).
const PAID_IN_PROGRESS_STATE = 'pending_paid'
function effectivePaid(p: any) { const price = Number(p?.price) || 0; const paid = Number(p?.paidPrice) || 0; return String(p?.state ?? '') === PAID_IN_PROGRESS_STATE ? Math.max(paid, price) : paid }
// Vente additionnelle encaissée : drapeau `paid` posé dans l'onglet Ventes add. du projet, ou projet « En cours (payé) » (toutes ses ventes sont réglées)
function isSalePaid(s: any) { return s?.paid === true || String(s?.projectState ?? '') === PAID_IN_PROGRESS_STATE }
function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function monthLabel(key: string) { const m = Number(key.split('-')[1]) - 1; return ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][m] ?? key }

/* Pense-bête vide (illustration) */
function EmptyClipboard() { return <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-2 opacity-20"><rect x="10" y="6" width="28" height="36" rx="4" stroke="white" strokeWidth="1.5" /><rect x="17" y="2" width="14" height="8" rx="3" stroke="white" strokeWidth="1.5" fill="rgba(139,92,246,0.15)" /><path d="M18 22l4 4 8-8" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> }

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
      {[...pending, ...done].map(t => <motion.div key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: t.done ? 0.4 : 1, x: 0 }} className="group flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/[0.03]"><button onClick={() => toggleTodo(t.id)} className={['flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition', t.done ? 'bg-violet-500/30 border-violet-500/40 text-violet-300' : 'border-white/15 hover:border-violet-500/40'].join(' ')}>{t.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}</button>{editId === t.id ? <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null) }} onBlur={saveEdit} className="flex-1 bg-transparent text-sm text-white outline-none border-b border-violet-500/30" /> : <span onDoubleClick={() => { setEditId(t.id); setEditText(t.text) }} className={['flex-1 text-sm cursor-default', t.done ? 'line-through text-white/50' : 'text-white/80'].join(' ')}>{t.text}</span>}<button onClick={() => deleteTodo(t.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-white/25 hover:text-rose-400 transition text-xs shrink-0 peg-tap-target">{'✕'}</button></motion.div>)}
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

// Bannière : jusqu'à 30 Mo acceptés (photos de téléphone) ; au-delà de 2 Mo elle
// est réduite dans le navigateur avant envoi (utils/imageShrink.ts) — affichage
// rapide, et pas d'envoi de 15 Mo en 4G qui dépasserait les 30 s d'Heroku.
const MAX_BANNER_INPUT = 30 * 1024 * 1024

/* ═══════════════════════════════════════════════ */
/*  DÉTAIL « RESTE À ENCAISSER »                    */
/* ═══════════════════════════════════════════════ */
type PendingProjectLine = { documentId?: string; name: string; customer: string; state: string; price: number; paid: number; remaining: number }
type PendingSaleLine = { label: string; projectName: string; projectId?: string; date?: string; amount: number }
type PendingBreakdown = { projectLines: PendingProjectLine[]; saleLines: PendingSaleLine[]; projectsTotal: number; salesTotal: number; total: number; paidSalesCount: number; paidSalesTotal: number }

function Row({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return <div role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() } }} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] ${onClick ? 'cursor-pointer hover:bg-white/[0.07] hover:border-white/15 transition-colors' : ''}`}>{children}</div>
}

function PendingBreakdownModal({ open, onClose, breakdown, displayed, onOpenProject, onOpenInvoices }: { open: boolean; onClose: () => void; breakdown: PendingBreakdown; displayed: number; onOpenProject: (documentId?: string) => void; onOpenInvoices: () => void }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [open, onClose])
  if (!open) return null
  const { projectLines, saleLines, projectsTotal, salesTotal, total, paidSalesCount, paidSalesTotal } = breakdown
  const stateLabel = (st: string) => (statusTextData as Record<string, string>)[st] ?? (st || '—')
  const stateClass = (st: string) => st === 'canceled' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : st === PAID_IN_PROGRESS_STATE ? 'bg-teal-500/15 text-teal-300 border-teal-500/30' : st === 'fulfilled' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Détail du reste à encaisser">
      <div className="w-full max-w-2xl max-h-[85dvh] flex flex-col rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 to-orange-500 opacity-80" />
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/[0.08]">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">Reste à encaisser · détail</div>
            <div className="mt-1 text-2xl font-black text-white tracking-tight">{eur(displayed)} <span className="text-sm font-medium text-white/40">TTC · {eur(toHT(displayed))} HT</span></div>
            <div className="mt-1 text-[11px] text-white/35">Calcul : CA total (prix des projets + ventes additionnelles) − Encaissé (montants payés des projets + ventes additionnelles encaissées)</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors peg-tap-target"><HiOutlineX className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold uppercase tracking-wider text-white/50">Projets avec un solde</div><div className="text-xs font-bold text-amber-300">{projectLines.length} · {eur(projectsTotal)}</div></div>
            {projectLines.length === 0 ? <div className="text-xs text-white/30 py-2">Aucun projet avec un solde</div> : <div className="space-y-1.5">{projectLines.map((l, i) => <Row key={l.documentId ?? i} onClick={l.documentId ? () => onOpenProject(l.documentId) : undefined}>
              <div className="min-w-0"><div className="text-sm text-white/85 truncate">{l.customer} <span className="text-white/35">·</span> {l.name}</div><div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/40"><span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${stateClass(l.state)}`}>{stateLabel(l.state)}</span><span>{eur(l.price)} − payé {eur(l.paid)}</span></div></div>
              <div className={`shrink-0 text-sm font-bold ${l.remaining < 0 ? 'text-emerald-400' : 'text-amber-300'}`}>{l.remaining < 0 ? `− ${eur(Math.abs(l.remaining))}` : eur(l.remaining)}{l.remaining < 0 && <div className="text-[10px] font-medium text-emerald-400/70 text-right">trop-perçu</div>}</div>
            </Row>)}</div>}
          </section>
          <section>
            <div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold uppercase tracking-wider text-white/50">Ventes additionnelles à encaisser</div><div className="text-xs font-bold text-amber-300">{saleLines.length} · {eur(salesTotal)}</div></div>
            <div className="text-[11px] text-white/35 mb-2">Une vente passe en « payée » depuis l'onglet Ventes add. du projet, ou automatiquement quand le projet passe « En cours (payé) ».{paidSalesCount > 0 && <> {paidSalesCount} vente(s) déjà encaissée(s) ({eur(paidSalesTotal)}) ne sont pas listées.</>}</div>
            {saleLines.length === 0 ? <div className="text-xs text-white/30 py-2">Aucune vente additionnelle à encaisser</div> : <div className="space-y-1.5">{saleLines.map((l, i) => <Row key={`${l.projectId ?? 'p'}-${i}`} onClick={l.projectId ? () => onOpenProject(l.projectId) : undefined}>
              <div className="min-w-0"><div className="text-sm text-white/85 truncate">{l.label}</div><div className="mt-0.5 text-[11px] text-white/40 truncate">{l.projectName}{l.date ? ` · ${dayjs(l.date).format('DD/MM/YY')}` : ''}</div></div>
              <div className="shrink-0 text-sm font-bold text-amber-300">{eur(l.amount)}</div>
            </Row>)}</div>}
          </section>
          {Math.round(total * 100) !== Math.round(displayed * 100) && <div className="text-[11px] text-rose-300/80 border border-rose-500/20 bg-rose-500/10 rounded-xl px-3 py-2">Somme des lignes : {eur(total)}. Le widget affiche {eur(displayed)} car un solde négatif est ramené à 0 €.</div>}
        </div>
        <div className="flex items-center justify-between gap-3 p-4 border-t border-white/[0.08] bg-white/[0.02]">
          <div className="text-sm text-white/60">Total <span className="font-black text-white ml-1">{eur(displayed)}</span></div>
          <button type="button" onClick={onOpenInvoices} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-white/80 hover:bg-white/10 transition-colors peg-tap-target">Voir les factures →</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// `onOpenCity` : bouton « Ville PEG » (accueil ordinateur, AdminHome) — absent sous 1024 px.
export default function DashboardAdmin({ onOpenCity }: { onOpenCity?: () => void } = {}) {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const { user } = useAppSelector((state) => state.auth.user)

  const [hidePrices, setHidePrices] = useState(areDashboardFiguresHidden)
  useEffect(() => {
    const onToggle = () => setHidePrices(areDashboardFiguresHidden())
    window.addEventListener(DASHBOARD_FIGURES_EVENT, onToggle)
    return () => window.removeEventListener(DASHBOARD_FIGURES_EVENT, onToggle)
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

  const fetchDashboard = async () => {
    try {
      setLoading(true); setError(null)
      const res = await apiGetDashboardSuperAdminInformations()
      const body = (res as any)?.data
      const gqlErrors = body?.errors
      const gqlData = body?.data
      if (gqlErrors?.length) console.warn('[Dashboard] GraphQL errors:', gqlErrors.map((e: any) => e.message))
      if (!gqlData || (!gqlData.projects_connection && !gqlData.invoices_connection)) throw new Error(gqlErrors?.[0]?.message ?? 'Réponse vide')
      setGql(gqlData); setLastUpdated(new Date())
    } catch (e: any) { setError(e?.message ?? 'Erreur') } finally { setLoading(false) }
  }
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

  // Ventes additionnelles — requête séparée (isolée pour ne pas bloquer le dashboard si le champ n'existe pas encore côté Strapi)
  const [additionalSalesData, setAdditionalSalesData] = useState<any[]>([])
  useEffect(() => {
    apiGetProjectsAdditionalSales()
      .then(res => {
        const nodes = res?.data?.data?.projects_connection?.nodes ?? []
        const sales: any[] = []
        for (const p of nodes) {
          if (!Array.isArray(p?.additionalSales)) continue
          for (const s of p.additionalSales) sales.push({ ...s, projectName: p.name ?? '—', projectId: p.documentId, projectState: p.state })
        }
        setAdditionalSalesData(sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      })
      .catch(() => { /* champ pas encore déployé côté Strapi — pas grave, on ignore */ })
  }, [refreshTick])
  const allAdditionalSales = additionalSalesData
  const totalAdditionalSales = useMemo(() => allAdditionalSales.reduce((a, s) => a + (Number(s.amount) || 0), 0), [allAdditionalSales])
  const paidAdditionalSales = useMemo(() => allAdditionalSales.reduce((a, s) => a + (isSalePaid(s) ? (Number(s.amount) || 0) : 0), 0), [allAdditionalSales])

  const projectsTotal = gql?.projects_connection?.pageInfo?.total ?? 0; const customersTotal = gql?.customers_connection?.pageInfo?.total ?? 0; const producersTotal = gql?.producers_connection?.pageInfo?.total ?? 0; const ticketsTotal = gql?.tickets_connection?.pageInfo?.total ?? 0; const orderItemsTotal = gql?.orderItems_connection?.pageInfo?.total ?? 0

  // CA = somme des prix projets + ventes additionnelles (source de vérité = projet, pas factures)
  // CA = somme des prix projets + ventes additionnelles (source de vérité = projet, pas factures)
  const invoiceTotal = useMemo(() => projects.reduce((a: number, p: any) => a + (Number(p?.price) || 0), 0) + totalAdditionalSales, [projects, totalAdditionalSales])
  // Encaissé = montants payés des projets + ventes additionnelles encaissées
  const invoicePaid = useMemo(() => projects.reduce((a: number, p: any) => a + effectivePaid(p), 0) + paidAdditionalSales, [projects, paidAdditionalSales])
  const invoicePending = Math.max(0, invoiceTotal - invoicePaid)
  // Détail du « Reste à encaisser » : projets dont le prix diffère du montant payé + ventes additionnelles
  // (celles-ci entrent dans le CA mais jamais dans « Encaissé », elles pèsent donc en totalité)
  const pendingBreakdown = useMemo<PendingBreakdown>(() => {
    const projectLines: PendingProjectLine[] = []
    for (const p of projects) {
      const price = Number(p?.price) || 0; const paid = effectivePaid(p); const remaining = Math.round((price - paid) * 100) / 100
      if (remaining === 0) continue
      projectLines.push({ documentId: p?.documentId, name: p?.name ?? '—', customer: p?.customer?.name ?? '—', state: String(p?.state ?? ''), price, paid, remaining })
    }
    projectLines.sort((a, b) => b.remaining - a.remaining)
    const unpaidSales = allAdditionalSales.filter(sl => !isSalePaid(sl)); const paidSales = allAdditionalSales.filter(sl => isSalePaid(sl))
    const saleLines: PendingSaleLine[] = unpaidSales.map(sl => ({ label: sl.label ?? '—', projectName: sl.projectName ?? '—', projectId: sl.projectId, date: sl.date, amount: Number(sl.amount) || 0 })).filter(sl => sl.amount !== 0).sort((a, b) => b.amount - a.amount)
    const projectsTotal = projectLines.reduce((a, l) => a + l.remaining, 0); const salesTotal = saleLines.reduce((a, l) => a + l.amount, 0)
    return { projectLines, saleLines, projectsTotal, salesTotal, total: projectsTotal + salesTotal, paidSalesCount: paidSales.length, paidSalesTotal: paidSales.reduce((a, sl) => a + (Number(sl.amount) || 0), 0) }
  }, [projects, allAdditionalSales])
  const [showPendingDetails, setShowPendingDetails] = useState(false)
  const overdueInvoices = useMemo(() => { const now = new Date(); return invoices.filter((x: any) => { const d = safeDate(x?.dueDate) ?? safeDate(x?.date); if (!d) return false; const ps = (x?.paymentState ?? '').toString().toLowerCase(); const st = (x?.state ?? '').toString().toLowerCase(); return d.getTime() < now.getTime() && !(ps === 'fulfilled' || st === 'fulfilled' || ps.includes('paid') || ps === 'paye') }).length }, [invoices])
  const atRiskProjects = useMemo(() => { const now = new Date(); return projects.filter((p: any) => { const end = safeDate(p?.endDate); if (!end) return false; const s = (p?.state ?? '').toString().toLowerCase(); return end.getTime() < now.getTime() && !(s.includes('done') || s.includes('closed') || s.includes('term') || s.includes('livr')) }).length }, [projects])
  const avgDeliveryDays = useMemo(() => { const p2 = projects.map((p: any) => ({ s: safeDate(p?.startDate), e: safeDate(p?.endDate) })).filter((x: any) => x.s && x.e); if (!p2.length) return 0; return Math.round(p2.reduce((a: number, x: any) => a + Math.max(0, (x.e.getTime() - x.s.getTime()) / 86400000), 0) / p2.length) }, [projects])
  const totalCosts = useMemo(() => transactions.reduce((a: number, x: any) => a + (Number(x?.amount) || 0), 0), [transactions])
  const totalProducerCosts = useMemo(() => projects.reduce((a: number, p: any) => a + Math.max(Number(p?.producerPrice) || 0, Number(p?.producerPaidPrice) || 0), 0), [projects])
  const margeBrute = Math.max(0, invoiceTotal - totalCosts - totalProducerCosts - totalExpensesGlobal); const margePct = invoiceTotal > 0 ? Math.round((margeBrute / invoiceTotal) * 100) : 0
  const TAX_RATE = 0.15; const beneficeNet = margeBrute * (1 - TAX_RATE); const impotEstime = margeBrute * TAX_RATE
  const openTickets = useMemo(() => tickets.filter((t: any) => !String(t?.state ?? '').toLowerCase().includes('closed')).length, [tickets])

  // 24 mois (widget « Chiffre d'affaires » : 6 ou 12 mois comparés à la période précédente) ; les 6 derniers = revenue6m, inchangé.
  const revenueMonths = useMemo(() => {
    const now = new Date(); const months: string[] = []; for (let i = 23; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
    const by = new Map<string, { ca: number; costs: number; paid: number; depenses: number }>(); months.forEach(k => by.set(k, { ca: 0, costs: 0, paid: 0, depenses: 0 }))
    // CA par mois = prix des projets (source de vérité)
    for (const p of projects) { const price = Number(p?.price) || 0; if (!price) continue; const d = safeDate(p?.startDate) ?? safeDate(p?.createdAt); if (!d) continue; const k = monthKey(d); if (!by.has(k)) continue; by.get(k)!.ca += price; const paidPrice = effectivePaid(p); if (paidPrice) by.get(k)!.paid += paidPrice }
    for (const tx of transactions) { const d = safeDate(tx?.date); if (!d) continue; const k = monthKey(d); if (by.has(k)) by.get(k)!.costs += (Number(tx?.amount) || 0) }
    // Ajouter les coûts producteur par mois
    for (const p of projects) { const cost = Math.max(Number(p?.producerPrice) || 0, Number(p?.producerPaidPrice) || 0); if (!cost) continue; const d = safeDate(p?.startDate) ?? safeDate(p?.createdAt); if (!d) continue; const k = monthKey(d); if (by.has(k)) by.get(k)!.costs += cost }
    // Ajouter les dépenses par mois
    for (const exp of allExpenses) { const d = safeDate(exp?.date); if (!d) continue; const k = monthKey(d); if (by.has(k)) { by.get(k)!.costs += (Number(exp?.totalAmount) || 0); by.get(k)!.depenses += (Number(exp?.totalAmount) || 0) } }
    // Ajouter les ventes additionnelles au CA par mois
    for (const s of allAdditionalSales) { const d = safeDate(s.date); if (!d) continue; const k = monthKey(d); if (!by.has(k)) continue; const amt = Number(s.amount) || 0; by.get(k)!.ca += amt; if (isSalePaid(s)) by.get(k)!.paid += amt }
    return months.map(k => { const b = by.get(k)!; return { key: k, label: monthLabel(k), ca: b.ca, marge: Math.max(0, b.ca - b.costs), paid: b.paid, depenses: b.depenses } })
  }, [invoices, transactions, projects, allExpenses, allAdditionalSales])
  const revenue6m = useMemo(() => revenueMonths.slice(-6), [revenueMonths])
  const caSparkData = revenue6m.map(d => d.ca); const caLastMonth = revenue6m.length >= 2 ? revenue6m[revenue6m.length - 2].ca : 0
  const paidLastMonth = revenue6m.length >= 2 ? revenue6m[revenue6m.length - 2].paid : 0; const paidThisMonth = revenue6m.length >= 1 ? revenue6m[revenue6m.length - 1].paid : 0

  const pipeline = useMemo(() => { const m = new Map<string, number>(); for (const p of projects) m.set((p?.state ?? 'unknown').toString(), (m.get((p?.state ?? 'unknown').toString()) ?? 0) + 1); return Array.from(m.entries()).map(([l, v]) => ({ label: l, value: v })).sort((a, b) => b.value - a.value).slice(0, 8) }, [projects])
  const topProducers = useMemo(() => { const m = new Map<string, { projects: number; revenue: number }>(); for (const p of projects) { const n = p?.producer?.name ?? '—'; const c = m.get(n) ?? { projects: 0, revenue: 0 }; m.set(n, { projects: c.projects + 1, revenue: c.revenue + (Number(p?.price) || 0) }) }; return Array.from(m.entries()).map(([n, v]) => ({ name: n, ...v })).sort((a, b) => b.projects - a.projects || b.revenue - a.revenue).slice(0, 6) }, [projects])
  const topClients = useMemo(() => { const m = new Map<string, number>(); for (const p of projects) { const n = p?.customer?.name ?? '—'; m.set(n, (m.get(n) ?? 0) + (Number(p?.price) || 0)) }; return Array.from(m.entries()).map(([n, r]) => ({ name: n, revenue: r })).sort((a, b) => b.revenue - a.revenue).slice(0, 6) }, [projects])
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
  const onBannerFile = async (picked?: File | null) => {
    if (fileRef.current) fileRef.current.value = '' // la même image peut être choisie à nouveau
    if (!picked) return;
    if (picked.size > MAX_BANNER_INPUT) { setError('Image trop lourde. Max 30 Mo.'); return }
    let file: File
    try { file = await shrinkImage(picked) } catch { setError('Image illisible : choisissez un JPG, un PNG ou un WebP.'); return }
    setError(null)
    // Preview immediately (l'aperçu s'affiche même si le stockage local est plein)
    const r = new FileReader(); r.onload = e => { const b = e.target?.result as string; setBannerUrl(b); try { localStorage.setItem('peg:dashboardBanner', b) } catch {} }; r.readAsDataURL(file);
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

  /* ── Widget renderer (rendu « hub », mêmes données) ── */
  const stateName = (st: string) => (statusTextData as Record<string, string>)[st] ?? st
  const renderWidget = (id: WidgetId) => {
    if (!dataReady) return <Empty>Chargement…</Empty>

    switch (id) {
      case 'chart-ca': return <RevenueWidget months={revenueMonths} format={eur} hidden={hidePrices} toHT={toHT} />
      case 'chart-tickets': return <><WidgetHead title="Tickets" note={`${ticketsTotal} au total`} right={<WidgetLink onClick={() => navigate('/support')}>Ouvrir</WidgetLink>} />{ticketsByState.length > 0 ? <StateBars items={ticketsByState.map(t => ({ key: t.label, label: t.label, value: t.value }))} color="#9d92ff" /> : <Empty>Aucun ticket</Empty>}</>
      case 'pipeline': return <><WidgetHead title="Pipeline" note="Projets par statut" right={<WidgetLink onClick={() => navigate('/common/projects')}>Ouvrir</WidgetLink>} />{pipeline.length > 0 ? <StateBars items={pipeline.map(it => ({ key: it.label, label: stateName(it.label), value: it.value }))} color="#7c6cf0" onClick={l => navigate(`/common/projects?state=${encodeURIComponent(l)}`)} /> : <Empty>Aucun projet</Empty>}</>
      case 'orders': return <><WidgetHead title="Commandes" note={`${orderItemsTotal} au total`} right={<WidgetLink onClick={() => navigate('/admin/order-items')}>Ouvrir</WidgetLink>} />{ordersByState.length > 0 ? <StateBars items={ordersByState.map(o => ({ key: o.label, label: o.label, value: o.value }))} color="#1f9cc6" /> : <Empty>Aucune commande</Empty>}</>
      case 'todo': return <TodoListWidget />
      case 'calendar': return <CalendarContent />
      case 'alerts': return <><WidgetHead title="Alertes" note="Points d'attention" /><AlertRows items={[
        overdueInvoices > 0 ? { key: 'invoices', tone: 'danger' as HubTone, text: `${overdueInvoices} facture(s) en retard` } : { key: 'invoices', tone: 'ok' as HubTone, text: 'Aucune facture en retard' },
        ...(atRiskProjects > 0 ? [{ key: 'risk', tone: 'warning' as HubTone, text: `${atRiskProjects} projet(s) à risque` }] : []),
        ...(openTickets > 0 ? [{ key: 'tickets', tone: 'info' as HubTone, text: `${openTickets} ticket(s) ouvert(s)` }] : []),
        ...(upcomingDeadlines.length > 0 ? [{ key: 'deadlines', tone: 'warning' as HubTone, text: `${upcomingDeadlines.length} échéance(s) dans 14j` }] : []),
      ]} /></>
      case 'deadlines': return <><WidgetHead title="Échéances (14j)" note="Projets non terminés" right={<WidgetLink onClick={() => navigate('/common/projects')}>Tous</WidgetLink>} />{upcomingDeadlines.length === 0 ? <Empty>Aucune échéance dans les 14 jours</Empty> : <Rows items={upcomingDeadlines.map((d: any, i: number) => ({ key: String(i), title: d.left, sub: d.sub, tag: { text: d.right, tone: (d.urgent ? 'danger' : 'warning') as HubTone } }))} />}</>
      case 'top-clients': return <><WidgetHead title="Top clients" note="Par CA facturé" right={<WidgetLink onClick={() => navigate('/admin/customers/list')}>Voir tous</WidgetLink>} />{topClients.length === 0 ? <Empty>Aucun client</Empty> : <Rows items={topClients.map((c, i) => ({ key: `${i}-${c.name}`, title: c.name, value: eur(c.revenue), rank: { n: i + 1, color: '#34d399' } }))} />}</>
      case 'top-producers': return <><WidgetHead title="Top producteurs" note="Par projets" right={<WidgetLink onClick={() => navigate('/admin/producers/list')}>Voir tous</WidgetLink>} />{topProducers.length === 0 ? <Empty>Aucun producteur</Empty> : <Rows items={topProducers.map((pr, i) => ({ key: `${i}-${pr.name}`, title: pr.name, sub: `${pr.projects} projet(s)`, value: pr.revenue ? eur(pr.revenue) : '—', rank: { n: i + 1, color: '#9d92ff' } }))} />}</>
      case 'activity': return <><WidgetHead title="Activité récente" note="Projets & factures" />{activity.length === 0 ? <Empty>Aucune activité</Empty> : <Rows items={activity.map((a, i) => ({ key: String(i), title: a.left, sub: a.sub, value: a.right }))} />}</>
      case 'additional-sales': return <><WidgetHead title="Ventes additionnelles" note={`${allAdditionalSales.length} vente(s) · ${eur(totalAdditionalSales)} · encaissé ${eur(paidAdditionalSales)}`} />{allAdditionalSales.length === 0 ? <Empty>Aucune vente additionnelle</Empty> : <div style={{ maxHeight: 300, overflowY: 'auto' }}><Rows items={allAdditionalSales.slice(0, 15).map((sl, i) => ({ key: String(i), title: sl.label, sub: `${sl.projectName} · ${dayjs(sl.date).format('DD/MM/YY')}`, value: eur(sl.amount), tag: isSalePaid(sl) ? { text: 'payée', tone: 'ok' as HubTone } : { text: 'à encaisser', tone: 'warning' as HubTone } }))} /></div>}</>
      default: return null
    }
  }

  const pendingModal = <PendingBreakdownModal open={showPendingDetails} onClose={() => setShowPendingDetails(false)} breakdown={pendingBreakdown} displayed={invoicePending} onOpenProject={(documentId) => { if (documentId) { setShowPendingDetails(false); navigate(`/common/projects/details/${documentId}`) } }} onOpenInvoices={() => { setShowPendingDetails(false); navigate('/admin/invoices') }} />

  /* ── Rendu « hub » (ordinateur, tablette, téléphone), mêmes valeurs et libellés ── */
  const thisMonthCa = revenue6m.length >= 1 ? revenue6m[revenue6m.length - 1].ca : 0
  const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null)
  const paidDelta = hidePrices ? null : pct(paidThisMonth, paidLastMonth)
  const marginInk = margePct >= 30 ? '#34d399' : margePct >= 15 ? '#fbbf24' : '#f87171'
  const attentionChips: { key: string; tone: HubTone; label: string; onClick?: () => void }[] = []
  if (dataReady) {
    if (overdueInvoices > 0) attentionChips.push({ key: 'invoices', tone: 'danger', label: `${overdueInvoices} facture${overdueInvoices > 1 ? 's' : ''} en retard`, onClick: () => navigate('/admin/invoices') })
    if (atRiskProjects > 0) attentionChips.push({ key: 'risk', tone: 'warning', label: `${atRiskProjects} projet${atRiskProjects > 1 ? 's' : ''} à risque`, onClick: () => navigate('/common/projects') })
    if (upcomingDeadlines.length > 0) attentionChips.push({ key: 'deadlines', tone: 'warning', label: `${upcomingDeadlines.length} échéance${upcomingDeadlines.length > 1 ? 's' : ''} dans 14 jours`, onClick: () => navigate('/common/projects') })
    if (openTickets > 0) attentionChips.push({ key: 'tickets', tone: 'info', label: `${openTickets} ticket${openTickets > 1 ? 's' : ''} ouvert${openTickets > 1 ? 's' : ''}`, onClick: () => navigate('/support') })
    if (!attentionChips.length) attentionChips.push({ key: 'ok', tone: 'ok', label: 'Tout est en ordre' })
  }
  const today = dayjs().format('dddd D MMMM YYYY')

  return (
    <>
      <DashboardAdminHub
        greeting={`${greeting}${firstName ? `, ${firstName}` : ''}`}
        dateLabel={today.charAt(0).toUpperCase() + today.slice(1)}
        attention={attentionChips}
        bannerUrl={bannerUrl}
        onPickBanner={onPickBanner}
        hidePrices={hidePrices}
        onTogglePrices={() => toggleDashboardFiguresHidden()}
        onRefresh={() => setRefreshTick(t => t + 1)}
        refreshing={loading}
        lastUpdatedText={lastUpdatedText}
        onOpenCity={onOpenCity}
        error={error}
        dataReady={dataReady}
        hero={{
          label: 'CA total TTC',
          value: eur(invoiceTotal),
          sub: `${eur(toHT(invoiceTotal))} HT · ce mois-ci ${eur(thisMonthCa)}`,
          delta: hidePrices ? null : pct(thisMonthCa, caLastMonth),
          series: caSparkData,
          onClick: () => navigate('/admin/invoices'),
        }}
        finance={[
          { key: 'paid', label: 'Encaissé TTC', value: eur(invoicePaid), foot: <>{eur(toHT(invoicePaid))} HT{paidDelta != null && <span className={`hx-delta ${paidDelta >= 0 ? 'hx-delta--good' : 'hx-delta--bad'}`} style={{ marginLeft: 8 }}>{paidDelta >= 0 ? '+' : ''}{paidDelta} %</span>}</>, icon: <HiOutlineCheckCircle />, accent: '#34d399', onClick: () => navigate('/admin/invoices') },
          { key: 'pending', label: 'Reste à encaisser', value: eur(invoicePending), foot: `${eur(toHT(invoicePending))} HT, voir le détail`, icon: <HiOutlineClock />, accent: invoicePending > 0 ? '#fbbf24' : '#34d399', onClick: () => setShowPendingDetails(true) },
          { key: 'margin', label: 'Marge brute', value: `${margePct} %`, foot: `${eur(margeBrute)} TTC`, icon: <HiOutlineChartBar />, accent: marginInk, ring: { value: margePct, color: marginInk } },
          { key: 'sales', label: 'Ventes add.', value: eur(totalAdditionalSales), foot: `${allAdditionalSales.length} vente(s), ${eur(toHT(totalAdditionalSales))} HT`, icon: <HiOutlineLightningBolt />, accent: '#1f9cc6' },
          { key: 'net', label: 'Bénéfice net estimé', value: eur(beneficeNet), foot: `Impôt 15 % : −${eur(impotEstime)}`, icon: <HiOutlineCurrencyEuro />, accent: '#34d399' },
          { key: 'expenses', label: 'Dépenses totales', value: eur(totalExpensesGlobal), foot: `${eur(toHT(totalExpensesGlobal))} HT`, icon: <HiOutlineSwitchHorizontal />, accent: '#d95926' },
        ]}
        ops={[
          { key: 'projects', label: 'Projets', value: String(projectsTotal), icon: <HiOutlineCube />, accent: '#9d92ff', onClick: () => navigate('/common/projects') },
          { key: 'risk', label: 'Projets à risque', value: String(atRiskProjects), icon: <HiOutlineExclamation />, accent: atRiskProjects > 0 ? '#f87171' : '#34d399', onClick: () => navigate('/common/projects') },
          { key: 'orders', label: 'Commandes', value: String(orderItemsTotal), icon: <HiOutlineShoppingCart />, accent: '#1f9cc6', onClick: () => navigate('/admin/order-items') },
          { key: 'delay', label: 'Délai moyen', value: `${avgDeliveryDays} j`, foot: 'Livraison', icon: <HiOutlineClock />, accent: '#c98500' },
          { key: 'tickets', label: 'Tickets', value: `${openTickets}/${ticketsTotal}`, foot: 'ouverts', icon: <HiOutlineTicket />, accent: openTickets > 0 ? '#fbbf24' : '#34d399', onClick: () => navigate('/support') },
        ]}
        widgets={visibleWidgets.map(id => { const def = WIDGET_DEFS.find(w => w.id === id); return { id, label: def?.label ?? id, wide: def?.span === 2, content: renderWidget(id) } })}
        edit={{
          on: editMode,
          toggle: () => setEditMode(!editMode),
          reset: resetLayout,
          hidden: hiddenWidgets.map(id => ({ id, label: WIDGET_DEFS.find(w => w.id === id)?.label ?? id })),
          show: id => showWidget(id as WidgetId),
          hide: id => hideWidget(id as WidgetId),
          draggingIdx,
          overIdx: dragOverIdx,
          onDragStart: handleDragStart,
          onDragOver: handleDragOver,
          onDrop: handleDrop,
          onDragEnd: handleDragEnd,
        }}
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onBannerFile(e.target.files?.[0])} />
      {pendingModal}
    </>
  )
}
