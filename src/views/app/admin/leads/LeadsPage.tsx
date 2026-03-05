import { useState, useMemo, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { motion, AnimatePresence } from 'framer-motion'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import {
    HiOutlinePlus, HiOutlineX, HiOutlineTrash, HiOutlineSearch,
    HiOutlineChevronDown, HiOutlineMail, HiOutlinePhone,
    HiOutlineCurrencyEuro, HiOutlineCalendar, HiOutlineLightningBolt,
    HiOutlineFilter, HiOutlineViewBoards, HiOutlineViewList,
    HiOutlineUser, HiOutlineOfficeBuilding, HiOutlineExternalLink,
} from 'react-icons/hi'

dayjs.locale('fr')

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = 'nouveau' | 'contacté' | 'qualification' | 'proposition' | 'négociation' | 'gagné' | 'perdu'
type Priority = 'basse' | 'normale' | 'haute' | 'urgente'
type Source = 'linkedin' | 'referral' | 'inbound' | 'cold_call' | 'event' | 'site_web' | 'autre'

interface Lead {
    id: string
    company: string
    contact: string
    email: string
    phone: string
    source: Source
    stage: Stage
    value: number
    probability: number
    priority: Priority
    notes: string
    nextAction: string
    nextActionDate: string
    createdAt: string
}

// ─── Config ────────────────────────────────────────────────────────────────────
const STAGES: { key: Stage; label: string; color: string; bg: string; border: string; dot: string }[] = [
    { key: 'nouveau',       label: 'Nouveau',       color: 'text-sky-700 dark:text-sky-300',     bg: 'bg-sky-50 dark:bg-sky-900/30',     border: 'border-sky-200 dark:border-sky-700',    dot: 'bg-sky-500' },
    { key: 'contacté',      label: 'Contacté',      color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-700', dot: 'bg-indigo-500' },
    { key: 'qualification', label: 'Qualification', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/30',   border: 'border-amber-200 dark:border-amber-700',  dot: 'bg-amber-500' },
    { key: 'proposition',   label: 'Proposition',   color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-700', dot: 'bg-orange-500' },
    { key: 'négociation',   label: 'Négociation',   color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-700', dot: 'bg-purple-500' },
    { key: 'gagné',         label: 'Gagné ✓',       color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-700', dot: 'bg-emerald-500' },
    { key: 'perdu',         label: 'Perdu',         color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800/60',   border: 'border-gray-200 dark:border-gray-700',  dot: 'bg-gray-400' },
]

const PRIORITIES: { key: Priority; label: string; color: string; bar: string }[] = [
    { key: 'basse',    label: 'Basse',    color: 'text-gray-400',   bar: 'bg-gray-300' },
    { key: 'normale',  label: 'Normale',  color: 'text-blue-500',   bar: 'bg-blue-400' },
    { key: 'haute',    label: 'Haute',    color: 'text-amber-500',  bar: 'bg-amber-400' },
    { key: 'urgente',  label: 'Urgente',  color: 'text-red-500',    bar: 'bg-red-500' },
]

const SOURCES: { key: Source; label: string }[] = [
    { key: 'linkedin',   label: 'LinkedIn' },
    { key: 'referral',   label: 'Référence' },
    { key: 'inbound',    label: 'Inbound' },
    { key: 'cold_call',  label: 'Cold Call' },
    { key: 'event',      label: 'Événement' },
    { key: 'site_web',   label: 'Site Web' },
    { key: 'autre',      label: 'Autre' },
]

const getStage  = (k: Stage)    => STAGES.find(s => s.key === k)!
const getPriority = (k: Priority) => PRIORITIES.find(p => p.key === k)!
const getSource = (k: Source)   => SOURCES.find(s => s.key === k)!

const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

// ─── Sample data ───────────────────────────────────────────────────────────────
const SAMPLE_LEADS: Lead[] = [
    { id: '1', company: 'Agence Créative SARL', contact: 'Marc Dupont', email: 'marc@creative.fr', phone: '06 12 34 56 78', source: 'linkedin', stage: 'nouveau', value: 8500, probability: 20, priority: 'normale', notes: 'Intéressé par nos services premium.', nextAction: 'Envoyer présentation', nextActionDate: dayjs().add(2, 'day').format('YYYY-MM-DD'), createdAt: dayjs().subtract(3, 'day').toISOString() },
    { id: '2', company: 'BTP Horizon', contact: 'Sophie Martin', email: 'sophie@btp-horizon.fr', phone: '06 98 76 54 32', source: 'referral', stage: 'contacté', value: 24000, probability: 40, priority: 'haute', notes: 'Référencé par client Duval. Besoin urgent.', nextAction: 'Appel découverte', nextActionDate: dayjs().add(1, 'day').format('YYYY-MM-DD'), createdAt: dayjs().subtract(7, 'day').toISOString() },
    { id: '3', company: 'Tech Solutions SAS', contact: 'Pierre Leblanc', email: 'p.leblanc@techsol.com', phone: '07 11 22 33 44', source: 'inbound', stage: 'qualification', value: 15000, probability: 60, priority: 'haute', notes: 'A rempli formulaire contact, besoin identifié.', nextAction: 'Réunion Visio', nextActionDate: dayjs().add(3, 'day').format('YYYY-MM-DD'), createdAt: dayjs().subtract(10, 'day').toISOString() },
    { id: '4', company: 'Boutique Mode & Co', contact: 'Laura Petit', email: 'laura@modeco.fr', phone: '06 55 66 77 88', source: 'site_web', stage: 'proposition', value: 5200, probability: 70, priority: 'normale', notes: 'Proposition envoyée le 28/02.', nextAction: 'Relance devis', nextActionDate: dayjs().add(1, 'day').format('YYYY-MM-DD'), createdAt: dayjs().subtract(14, 'day').toISOString() },
    { id: '5', company: 'Immobilier du Sud', contact: 'Jean-Claude Roux', email: 'jc.roux@immo-sud.fr', phone: '06 44 55 66 77', source: 'event', stage: 'négociation', value: 42000, probability: 80, priority: 'urgente', notes: 'Salon expo, très chaud. Négocie -10%.', nextAction: 'Finaliser contrat', nextActionDate: dayjs().add(2, 'day').format('YYYY-MM-DD'), createdAt: dayjs().subtract(20, 'day').toISOString() },
    { id: '6', company: 'Resto Le Terroir', contact: 'Isabelle Faure', email: 'ifaure@leterroir.fr', phone: '06 33 44 55 66', source: 'cold_call', stage: 'gagné', value: 3800, probability: 100, priority: 'normale', notes: 'Contrat signé ! 🎉', nextAction: '', nextActionDate: '', createdAt: dayjs().subtract(25, 'day').toISOString() },
    { id: '7', company: 'Logistique Express', contact: 'Thomas Bernard', email: 't.bernard@logexp.fr', phone: '07 77 88 99 00', source: 'cold_call', stage: 'perdu', value: 18000, probability: 0, priority: 'basse', notes: 'Budget insuffisant cette année.', nextAction: 'Recontacter en Q3', nextActionDate: dayjs().add(3, 'month').format('YYYY-MM-DD'), createdAt: dayjs().subtract(30, 'day').toISOString() },
    { id: '8', company: 'Cabinet Consult+', contact: 'Nathalie Morel', email: 'n.morel@consultplus.fr', phone: '06 22 33 44 55', source: 'linkedin', stage: 'nouveau', value: 12000, probability: 15, priority: 'normale', notes: 'Contacté via LinkedIn. Pas encore répondu.', nextAction: 'Relance message', nextActionDate: dayjs().add(5, 'day').format('YYYY-MM-DD'), createdAt: dayjs().subtract(1, 'day').toISOString() },
]

// ─── Empty lead ────────────────────────────────────────────────────────────────
const emptyLead = (): Omit<Lead, 'id' | 'createdAt'> => ({
    company: '', contact: '', email: '', phone: '',
    source: 'inbound', stage: 'nouveau', value: 0,
    probability: 20, priority: 'normale', notes: '',
    nextAction: '', nextActionDate: '',
})

// ─── Initials avatar ───────────────────────────────────────────────────────────
function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
    const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500']
    const color = colors[(name.charCodeAt(0) ?? 0) % colors.length]
    const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-10 h-10 text-sm'
    return <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>{initials}</div>
}

// ─── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent: string }) {
    return (
        <div className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 shadow-sm`}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6 ${accent}`} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
                <div className={`p-2.5 rounded-xl ${accent} bg-opacity-20`}>{icon}</div>
            </div>
        </div>
    )
}

// ─── Lead Card (Kanban) ────────────────────────────────────────────────────────
function LeadCard({ lead, index, onClick }: { lead: Lead; index: number; onClick: (l: Lead) => void }) {
    const prio = getPriority(lead.priority)
    const overdue = lead.nextActionDate && dayjs(lead.nextActionDate).isBefore(dayjs(), 'day')

    return (
        <Draggable draggableId={lead.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onClick(lead)}
                    className={`
                        bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 mb-2 cursor-pointer
                        select-none transition-all duration-150
                        hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600
                        ${snapshot.isDragging ? 'shadow-xl rotate-1 scale-[1.02] border-blue-300' : 'shadow-sm'}
                    `}
                >
                    {/* Priority bar */}
                    <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full ${prio.bar} opacity-70`} style={{ position: 'relative', height: 3, marginBottom: 8, borderRadius: 4 }}>
                        <div className={`h-1 rounded-full ${prio.bar}`} />
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Avatar name={lead.company} size="sm" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">{lead.company}</p>
                                <p className="text-xs text-gray-400 truncate">{lead.contact}</p>
                            </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            lead.priority === 'urgente' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' :
                            lead.priority === 'haute'   ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                            'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                        }`}>{prio.label}</span>
                    </div>

                    {/* Value + probability */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{eur(lead.value)}</span>
                        <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${lead.probability}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">{lead.probability}%</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-md">
                            {getSource(lead.source).label}
                        </span>
                        {lead.nextActionDate && (
                            <span className={`flex items-center gap-1 text-[10px] font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                                <HiOutlineCalendar className="w-3 h-3" />
                                {dayjs(lead.nextActionDate).format('DD/MM')}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    )
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ stage, leads, onLeadClick }: {
    stage: typeof STAGES[0]; leads: Lead[]; onLeadClick: (l: Lead) => void
}) {
    const total = leads.reduce((sum, l) => sum + l.value, 0)

    return (
        <div className="flex flex-col w-64 shrink-0">
            {/* Column header */}
            <div className={`flex items-center justify-between px-3 py-2 mb-2 rounded-xl ${stage.bg} border ${stage.border}`}>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    <span className={`text-xs font-bold ${stage.color} uppercase tracking-wide`}>{stage.label}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${stage.color}`}>{leads.length}</span>
                </div>
                {total > 0 && <span className="text-[10px] font-semibold text-gray-400">{eur(total)}</span>}
            </div>

            {/* Droppable zone */}
            <Droppable droppableId={stage.key}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 min-h-16 rounded-xl transition-colors p-1 ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700' : ''}`}
                    >
                        {leads.map((lead, i) => (
                            <LeadCard key={lead.id} lead={lead} index={i} onClick={onLeadClick} />
                        ))}
                        {provided.placeholder}
                        {leads.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex items-center justify-center h-12 text-[11px] text-gray-300 dark:text-gray-600 italic">
                                Déposer ici
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    )
}

// ─── List Row ──────────────────────────────────────────────────────────────────
function ListRow({ lead, onClick }: { lead: Lead; onClick: (l: Lead) => void }) {
    const stage = getStage(lead.stage)
    const prio = getPriority(lead.priority)
    const overdue = lead.nextActionDate && dayjs(lead.nextActionDate).isBefore(dayjs(), 'day')

    return (
        <tr onClick={() => onClick(lead)} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <Avatar name={lead.company} size="sm" />
                    <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{lead.company}</p>
                        <p className="text-xs text-gray-400">{lead.contact}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${stage.bg} ${stage.color} ${stage.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                    {stage.label}
                </span>
            </td>
            <td className="px-4 py-3">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{eur(lead.value)}</span>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lead.probability}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{lead.probability}%</span>
                </div>
            </td>
            <td className="px-4 py-3">
                <span className={`text-xs font-semibold ${prio.color}`}>{prio.label}</span>
            </td>
            <td className="px-4 py-3">
                <span className="text-xs text-gray-400">{getSource(lead.source).label}</span>
            </td>
            <td className="px-4 py-3">
                {lead.nextActionDate && (
                    <div>
                        <p className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                            {dayjs(lead.nextActionDate).format('DD/MM/YY')}
                        </p>
                        {lead.nextAction && <p className="text-[10px] text-gray-400 truncate max-w-32">{lead.nextAction}</p>}
                    </div>
                )}
            </td>
            <td className="px-4 py-3 text-right">
                <button
                    onClick={(e) => { e.stopPropagation(); onClick(lead) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <HiOutlineExternalLink className="w-4 h-4 text-gray-400" />
                </button>
            </td>
        </tr>
    )
}

// ─── Lead Modal ────────────────────────────────────────────────────────────────
function LeadModal({ lead, onSave, onDelete, onClose }: {
    lead: Lead | null
    onSave: (data: Omit<Lead, 'id' | 'createdAt'>) => void
    onDelete: () => void
    onClose: () => void
}) {
    const isNew = !lead
    const [form, setForm] = useState<Omit<Lead, 'id' | 'createdAt'>>(
        lead ? { company: lead.company, contact: lead.contact, email: lead.email, phone: lead.phone, source: lead.source, stage: lead.stage, value: lead.value, probability: lead.probability, priority: lead.priority, notes: lead.notes, nextAction: lead.nextAction, nextActionDate: lead.nextActionDate }
             : emptyLead()
    )

    const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
        setForm(p => ({ ...p, [k]: v }))

    const stage = getStage(form.stage)

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                >
                    {/* Header */}
                    <div className={`sticky top-0 z-10 px-6 pt-6 pb-4 ${stage.bg} rounded-t-2xl`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar name={form.company || '?'} size="md" />
                                <div>
                                    <input
                                        autoFocus={isNew}
                                        placeholder="Nom de l'entreprise"
                                        value={form.company}
                                        onChange={e => set('company', e.target.value)}
                                        className={`text-xl font-bold bg-transparent border-none outline-none placeholder-gray-400 ${stage.color} w-full`}
                                    />
                                    <input
                                        placeholder="Nom du contact"
                                        value={form.contact}
                                        onChange={e => set('contact', e.target.value)}
                                        className="text-sm text-gray-500 bg-transparent border-none outline-none placeholder-gray-400 w-full mt-0.5"
                                    />
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10 transition-colors shrink-0">
                                <HiOutlineX className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-5 space-y-5">
                        {/* Stage selector */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Étape du pipeline</label>
                            <div className="flex flex-wrap gap-1.5">
                                {STAGES.map(s => (
                                    <button
                                        key={s.key}
                                        onClick={() => set('stage', s.key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                                            form.stage === s.key
                                                ? `${s.bg} ${s.color} border-current shadow-sm`
                                                : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2 cols: contact infos */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    <HiOutlineMail className="inline w-3 h-3 mr-1" />Email
                                </label>
                                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                                    placeholder="email@exemple.fr"
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    <HiOutlinePhone className="inline w-3 h-3 mr-1" />Téléphone
                                </label>
                                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                                    placeholder="06 XX XX XX XX"
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Value + probability */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    <HiOutlineCurrencyEuro className="inline w-3 h-3 mr-1" />Valeur estimée (€)
                                </label>
                                <input type="number" value={form.value} onChange={e => set('value', Number(e.target.value))}
                                    min={0}
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Probabilité — {form.probability}%
                                </label>
                                <input type="range" min={0} max={100} step={5} value={form.probability}
                                    onChange={e => set('probability', Number(e.target.value))}
                                    className="w-full mt-3 accent-blue-600"
                                />
                            </div>
                        </div>

                        {/* Source + Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Source</label>
                                <select value={form.source} onChange={e => set('source', e.target.value as Source)}
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    {SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priorité</label>
                                <div className="flex gap-2">
                                    {PRIORITIES.map(p => (
                                        <button
                                            key={p.key}
                                            onClick={() => set('priority', p.key)}
                                            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                                                form.priority === p.key
                                                    ? `${p.bar} text-white border-transparent shadow-sm`
                                                    : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-transparent hover:border-gray-200'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Next action */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    <HiOutlineLightningBolt className="inline w-3 h-3 mr-1" />Prochaine action
                                </label>
                                <input value={form.nextAction} onChange={e => set('nextAction', e.target.value)}
                                    placeholder="Appel de suivi, Envoyer devis…"
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    <HiOutlineCalendar className="inline w-3 h-3 mr-1" />Date
                                </label>
                                <input type="date" value={form.nextActionDate} onChange={e => set('nextActionDate', e.target.value)}
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
                            <textarea
                                rows={3}
                                value={form.notes}
                                onChange={e => set('notes', e.target.value)}
                                placeholder="Contexte, besoins identifiés, historique…"
                                className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
                        <div>
                            {!isNew && (
                                <button onClick={onDelete} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                                    <HiOutlineTrash className="w-4 h-4" />
                                    Supprimer
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
                                Annuler
                            </button>
                            <button
                                onClick={() => { if (form.company.trim()) onSave(form) }}
                                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow-md transition-all"
                            >
                                {isNew ? 'Créer le lead' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
const LeadsPage = () => {
    const [leads, setLeads] = useState<Lead[]>(SAMPLE_LEADS)
    const [view, setView] = useState<'kanban' | 'list'>('kanban')
    const [search, setSearch] = useState('')
    const [filterStage, setFilterStage] = useState<Stage | 'all'>('all')
    const [filterSource, setFilterSource] = useState<Source | 'all'>('all')
    const [modal, setModal] = useState<{ open: boolean; lead: Lead | null }>({ open: false, lead: null })

    // KPIs
    const kpis = useMemo(() => {
        const active = leads.filter(l => l.stage !== 'perdu')
        const won = leads.filter(l => l.stage === 'gagné')
        const pipeline = active.reduce((s, l) => s + l.value * l.probability / 100, 0)
        const conversion = leads.length ? Math.round(won.length / leads.filter(l => l.stage === 'gagné' || l.stage === 'perdu').length * 100) || 0 : 0
        const overdue = leads.filter(l => l.nextActionDate && dayjs(l.nextActionDate).isBefore(dayjs(), 'day') && l.stage !== 'gagné' && l.stage !== 'perdu')
        return { total: leads.length, pipeline, won: won.length, conversion, overdue: overdue.length }
    }, [leads])

    // Filtered leads
    const filtered = useMemo(() => leads.filter(l => {
        const q = search.toLowerCase()
        const matchSearch = !q || l.company.toLowerCase().includes(q) || l.contact.toLowerCase().includes(q)
        const matchStage = filterStage === 'all' || l.stage === filterStage
        const matchSource = filterSource === 'all' || l.source === filterSource
        return matchSearch && matchStage && matchSource
    }), [leads, search, filterStage, filterSource])

    // Kanban by stage
    const byStage = useMemo(() =>
        Object.fromEntries(STAGES.map(s => [s.key, filtered.filter(l => l.stage === s.key)])) as Record<Stage, Lead[]>,
        [filtered]
    )

    const onDragEnd = useCallback((result: DropResult) => {
        if (!result.destination) return
        const { draggableId, destination } = result
        const newStage = destination.droppableId as Stage
        setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, stage: newStage } : l))
    }, [])

    const openNew = () => setModal({ open: true, lead: null })
    const openEdit = (lead: Lead) => setModal({ open: true, lead })

    const handleSave = (data: Omit<Lead, 'id' | 'createdAt'>) => {
        if (modal.lead) {
            setLeads(prev => prev.map(l => l.id === modal.lead!.id ? { ...l, ...data } : l))
        } else {
            setLeads(prev => [...prev, { id: `lead_${Date.now()}`, createdAt: new Date().toISOString(), ...data }])
        }
        setModal({ open: false, lead: null })
    }

    const handleDelete = () => {
        if (modal.lead) setLeads(prev => prev.filter(l => l.id !== modal.lead!.id))
        setModal({ open: false, lead: null })
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* ── Header ── */}
            <div className="px-6 pt-6 pb-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Leads & Prospection</h1>
                        <p className="text-sm text-gray-400 mt-0.5">{leads.length} leads · {eur(leads.reduce((s, l) => s + l.value, 0))} en valeur totale</p>
                    </div>
                    <button
                        onClick={openNew}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                    >
                        <HiOutlinePlus className="w-4 h-4" />
                        Nouveau lead
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-4 mb-5">
                    <KpiCard label="Pipeline pondéré" value={eur(kpis.pipeline)} sub="valeur × probabilité" icon={<HiOutlineCurrencyEuro className="w-5 h-5 text-blue-600" />} accent="bg-blue-500" />
                    <KpiCard label="Total leads" value={String(kpis.total)} sub={`${kpis.won} gagnés`} icon={<HiOutlineUser className="w-5 h-5 text-purple-600" />} accent="bg-purple-500" />
                    <KpiCard label="Taux de conversion" value={`${kpis.conversion}%`} sub="leads gagnés / closés" icon={<HiOutlineOfficeBuilding className="w-5 h-5 text-emerald-600" />} accent="bg-emerald-500" />
                    <KpiCard label="Actions en retard" value={String(kpis.overdue)} sub={kpis.overdue > 0 ? 'À traiter rapidement' : 'Tout est à jour ✓'} icon={<HiOutlineCalendar className="w-5 h-5 text-orange-600" />} accent={kpis.overdue > 0 ? 'bg-red-500' : 'bg-orange-500'} />
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher…"
                            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    {/* Stage filter */}
                    <div className="relative">
                        <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            value={filterStage}
                            onChange={e => setFilterStage(e.target.value as Stage | 'all')}
                            className="pl-9 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-all"
                        >
                            <option value="all">Toutes les étapes</option>
                            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <HiOutlineChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Source filter */}
                    <div className="relative">
                        <select
                            value={filterSource}
                            onChange={e => setFilterSource(e.target.value as Source | 'all')}
                            className="pl-3 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-all"
                        >
                            <option value="all">Toutes les sources</option>
                            {SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                        <HiOutlineChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="ml-auto flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-0.5">
                        <button
                            onClick={() => setView('kanban')}
                            className={`p-2 rounded-lg transition-all ${view === 'kanban' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <HiOutlineViewBoards className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <HiOutlineViewList className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                    {view === 'kanban' ? (
                        <motion.div
                            key="kanban"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex gap-4 p-6 min-h-full w-max"
                        >
                            <DragDropContext onDragEnd={onDragEnd}>
                                {STAGES.map(stage => (
                                    <KanbanColumn key={stage.key} stage={stage} leads={byStage[stage.key]} onLeadClick={openEdit} />
                                ))}
                            </DragDropContext>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-6"
                        >
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                                            {['Entreprise', 'Étape', 'Valeur', 'Probabilité', 'Priorité', 'Source', 'Prochaine action', ''].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(lead => (
                                            <ListRow key={lead.id} lead={lead} onClick={openEdit} />
                                        ))}
                                        {filtered.length === 0 && (
                                            <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">Aucun lead trouvé</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal */}
            {modal.open && (
                <LeadModal
                    lead={modal.lead}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onClose={() => setModal({ open: false, lead: null })}
                />
            )}
        </div>
    )
}

export default LeadsPage
