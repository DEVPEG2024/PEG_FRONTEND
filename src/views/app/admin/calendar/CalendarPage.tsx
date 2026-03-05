import { useState, useCallback } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
import isBetween from 'dayjs/plugin/isBetween'
import { motion, AnimatePresence } from 'framer-motion'
import { HiOutlinePlus, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineX, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi'
import { BsCalendar3 } from 'react-icons/bs'

dayjs.extend(isoWeek)
dayjs.extend(isBetween)
dayjs.locale('fr')

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = 'production' | 'réunion' | 'livraison' | 'autre'
type ViewType = 'month' | 'week' | 'day'

interface CalEvent {
    id: number
    title: string
    start: Dayjs
    end: Dayjs
    category: Category
    allDay?: boolean
}

// ─── Config ────────────────────────────────────────────────────────────────────
const CATEGORIES: { value: Category; label: string; color: string; bg: string; dot: string }[] = [
    { value: 'production', label: 'Production', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/40', dot: 'bg-orange-500' },
    { value: 'réunion', label: 'Réunion', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/40', dot: 'bg-blue-500' },
    { value: 'livraison', label: 'Livraison', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40', dot: 'bg-emerald-500' },
    { value: 'autre', label: 'Autre', color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/40', dot: 'bg-violet-500' },
]

const getCat = (v: Category) => CATEGORIES.find((c) => c.value === v)!

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const SAMPLE: CalEvent[] = [
    { id: 1, title: 'Production lot A', start: dayjs().hour(8).minute(0), end: dayjs().hour(12).minute(0), category: 'production' },
    { id: 2, title: 'Réunion équipe', start: dayjs().hour(14).minute(0), end: dayjs().hour(15).minute(0), category: 'réunion' },
    { id: 3, title: 'Livraison client Dupont', start: dayjs().add(1, 'day').hour(10).minute(0), end: dayjs().add(1, 'day').hour(11).minute(0), category: 'livraison' },
    { id: 4, title: 'Production lot B', start: dayjs().add(2, 'day').hour(9).minute(0), end: dayjs().add(2, 'day').hour(17).minute(0), category: 'production' },
    { id: 5, title: 'Point hebdo', start: dayjs().add(-1, 'day').hour(11).minute(0), end: dayjs().add(-1, 'day').hour(12).minute(0), category: 'réunion' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────
const sameDay = (a: Dayjs, b: Dayjs) => a.isSame(b, 'day')
const eventsOfDay = (events: CalEvent[], day: Dayjs) =>
    events.filter((e) => sameDay(e.start, day)).sort((a, b) => a.start.valueOf() - b.start.valueOf())

// ─── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ current, selected, onChange }: { current: Dayjs; selected: Dayjs; onChange: (d: Dayjs) => void }) {
    const [mini, setMini] = useState(current.startOf('month'))

    const firstDay = mini.startOf('month').isoWeekday() - 1
    const daysInMonth = mini.daysInMonth()
    const cells: (Dayjs | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => mini.date(i + 1)),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    return (
        <div className="select-none">
            <div className="flex items-center justify-between mb-3">
                <button onClick={() => setMini(mini.subtract(1, 'month'))} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <HiOutlineChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize">
                    {mini.format('MMMM YYYY')}
                </span>
                <button onClick={() => setMini(mini.add(1, 'month'))} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <HiOutlineChevronRight className="w-4 h-4 text-gray-500" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-0 mb-1">
                {DAYS_FR.map((d) => (
                    <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">{d[0]}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-0">
                {cells.map((day, i) => {
                    if (!day) return <div key={i} />
                    const isToday = sameDay(day, dayjs())
                    const isSel = sameDay(day, selected)
                    return (
                        <button
                            key={i}
                            onClick={() => { onChange(day); setMini(day.startOf('month')) }}
                            className={`
                                w-7 h-7 mx-auto rounded-full text-xs flex items-center justify-center transition-all font-medium
                                ${isSel ? 'bg-blue-600 text-white shadow-sm' : isToday ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
                            `}
                        >
                            {day.date()}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Event Pill ────────────────────────────────────────────────────────────────
function EventPill({ event, onClick, compact = false }: { event: CalEvent; onClick: (e: CalEvent) => void; compact?: boolean }) {
    const cat = getCat(event.category)
    return (
        <motion.button
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => { e.stopPropagation(); onClick(event) }}
            className={`
                w-full text-left rounded-md px-2 py-0.5 mb-0.5 flex items-center gap-1.5
                ${cat.bg} ${cat.color} hover:brightness-95 transition-all
                ${compact ? 'text-[10px]' : 'text-xs'} font-medium truncate group
            `}
        >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dot}`} />
            <span className="truncate">{event.title}</span>
            {!compact && <span className="text-[10px] opacity-60 shrink-0 ml-auto">{event.start.format('HH:mm')}</span>}
        </motion.button>
    )
}

// ─── Month View ─────────────────────────────────────────────────────────────────
function MonthView({ date, events, onDayClick, onEventClick }: {
    date: Dayjs; events: CalEvent[]
    onDayClick: (d: Dayjs) => void; onEventClick: (e: CalEvent) => void
}) {
    const firstDay = date.startOf('month').isoWeekday() - 1
    const daysInMonth = date.daysInMonth()
    const cells: (Dayjs | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => date.date(i + 1)),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    return (
        <div className="flex flex-col h-full">
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
                {DAYS_FR.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase py-2 tracking-wide">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))` }}>
                {cells.map((day, i) => {
                    const isToday = day && sameDay(day, dayjs())
                    const isCurrentMonth = day && day.month() === date.month()
                    const dayEvents = day ? eventsOfDay(events, day) : []
                    return (
                        <div
                            key={i}
                            onClick={() => day && onDayClick(day)}
                            className={`
                                border-b border-r border-gray-100 dark:border-gray-700/60 p-1.5 min-h-0 overflow-hidden
                                ${day ? 'cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/30' : ''}
                                ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}
                                transition-colors
                            `}
                        >
                            {day && (
                                <>
                                    <div className="flex justify-start mb-1">
                                        <span className={`
                                            text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                                            ${isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}
                                        `}>
                                            {day.date()}
                                        </span>
                                    </div>
                                    <div className="overflow-hidden">
                                        {dayEvents.slice(0, 3).map((ev) => (
                                            <EventPill key={ev.id} event={ev} onClick={onEventClick} compact />
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className="text-[10px] text-gray-400 pl-2">+{dayEvents.length - 3} autres</span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Week View ──────────────────────────────────────────────────────────────────
function WeekView({ date, events, onSlotClick, onEventClick }: {
    date: Dayjs; events: CalEvent[]
    onSlotClick: (d: Dayjs) => void; onEventClick: (e: CalEvent) => void
}) {
    const weekStart = date.startOf('isoWeek')
    const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-8 border-b border-gray-100 dark:border-gray-700 shrink-0">
                <div className="py-2" />
                {weekDays.map((d) => {
                    const isToday = sameDay(d, dayjs())
                    return (
                        <div key={d.toString()} className="text-center py-2">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{d.format('ddd')}</div>
                            <div className={`
                                text-sm font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5
                                ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200'}
                            `}>{d.date()}</div>
                        </div>
                    )
                })}
            </div>
            {/* Body */}
            <div className="overflow-y-auto flex-1">
                <div className="grid grid-cols-8 relative">
                    {/* Hours */}
                    <div>
                        {HOURS.map((h) => (
                            <div key={h} className="h-14 flex items-start justify-end pr-3 pt-1">
                                <span className="text-[10px] text-gray-400 font-medium">{h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}</span>
                            </div>
                        ))}
                    </div>
                    {/* Day columns */}
                    {weekDays.map((d) => {
                        const dayEvs = eventsOfDay(events, d)
                        return (
                            <div key={d.toString()} className="border-l border-gray-100 dark:border-gray-700 relative">
                                {HOURS.map((h) => (
                                    <div
                                        key={h}
                                        onClick={() => onSlotClick(d.hour(h).minute(0))}
                                        className="h-14 border-b border-gray-50 dark:border-gray-700/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                                    />
                                ))}
                                {/* Events positioned */}
                                {dayEvs.map((ev) => {
                                    const top = (ev.start.hour() + ev.start.minute() / 60) * 56
                                    const height = Math.max(((ev.end.hour() - ev.start.hour() + (ev.end.minute() - ev.start.minute()) / 60)) * 56, 24)
                                    const cat = getCat(ev.category)
                                    return (
                                        <motion.button
                                            key={ev.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
                                            className={`absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-left ${cat.bg} ${cat.color} shadow-sm hover:shadow-md transition-shadow z-10 overflow-hidden`}
                                            style={{ top, height }}
                                        >
                                            <div className="text-[11px] font-semibold truncate">{ev.title}</div>
                                            <div className="text-[10px] opacity-70">{ev.start.format('HH:mm')} – {ev.end.format('HH:mm')}</div>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─── Day View ───────────────────────────────────────────────────────────────────
function DayView({ date, events, onSlotClick, onEventClick }: {
    date: Dayjs; events: CalEvent[]
    onSlotClick: (d: Dayjs) => void; onEventClick: (e: CalEvent) => void
}) {
    const dayEvs = eventsOfDay(events, date)

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 py-3 px-4 shrink-0">
                <div className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{date.format('dddd')}</div>
                <div className={`text-3xl font-bold ${sameDay(date, dayjs()) ? 'text-blue-600' : 'text-gray-800 dark:text-gray-100'}`}>
                    {date.format('D MMMM YYYY')}
                </div>
            </div>
            <div className="overflow-y-auto flex-1">
                <div className="grid grid-cols-[56px_1fr] relative">
                    <div>
                        {HOURS.map((h) => (
                            <div key={h} className="h-14 flex items-start justify-end pr-3 pt-1">
                                <span className="text-[10px] text-gray-400 font-medium">{h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-l border-gray-100 dark:border-gray-700 relative">
                        {HOURS.map((h) => (
                            <div
                                key={h}
                                onClick={() => onSlotClick(date.hour(h).minute(0))}
                                className="h-14 border-b border-gray-50 dark:border-gray-700/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                            />
                        ))}
                        {dayEvs.map((ev) => {
                            const top = (ev.start.hour() + ev.start.minute() / 60) * 56
                            const height = Math.max(((ev.end.hour() - ev.start.hour() + (ev.end.minute() - ev.start.minute()) / 60)) * 56, 28)
                            const cat = getCat(ev.category)
                            return (
                                <motion.button
                                    key={ev.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
                                    className={`absolute left-2 right-2 rounded-xl px-3 py-1.5 text-left ${cat.bg} ${cat.color} shadow hover:shadow-md transition-shadow z-10`}
                                    style={{ top, height }}
                                >
                                    <div className="text-sm font-semibold truncate">{ev.title}</div>
                                    <div className="text-xs opacity-70">{ev.start.format('HH:mm')} – {ev.end.format('HH:mm')}</div>
                                </motion.button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Event Modal ────────────────────────────────────────────────────────────────
function EventModal({ event, defaultStart, onSave, onDelete, onClose }: {
    event: CalEvent | null
    defaultStart: Dayjs
    onSave: (data: Omit<CalEvent, 'id'>) => void
    onDelete: () => void
    onClose: () => void
}) {
    const [title, setTitle] = useState(event?.title ?? '')
    const [category, setCategory] = useState<Category>(event?.category ?? 'production')
    const [start, setStart] = useState(event ? event.start.format('YYYY-MM-DDTHH:mm') : defaultStart.format('YYYY-MM-DDTHH:mm'))
    const [end, setEnd] = useState(event ? event.end.format('YYYY-MM-DDTHH:mm') : defaultStart.add(1, 'hour').format('YYYY-MM-DDTHH:mm'))

    const cat = getCat(category)

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
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    {/* Header */}
                    <div className={`px-6 pt-6 pb-4 ${cat.bg}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                                <span className={`text-xs font-semibold uppercase tracking-wider ${cat.color}`}>{cat.label}</span>
                            </div>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10 transition-colors">
                                <HiOutlineX className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <input
                            autoFocus
                            placeholder="Titre de l'événement"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={`w-full text-xl font-bold bg-transparent border-none outline-none placeholder-gray-400 ${cat.color}`}
                        />
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 space-y-4">
                        {/* Category */}
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Catégorie</label>
                            <div className="flex gap-2 flex-wrap">
                                {CATEGORIES.map((c) => (
                                    <button
                                        key={c.value}
                                        onClick={() => setCategory(c.value)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all
                                            ${category === c.value ? `${c.bg} ${c.color} border-current` : 'bg-gray-50 dark:bg-gray-700 text-gray-500 border-transparent hover:border-gray-200'}
                                        `}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Début</label>
                                <input
                                    type="datetime-local"
                                    value={start}
                                    onChange={(e) => setStart(e.target.value)}
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Fin</label>
                                <input
                                    type="datetime-local"
                                    value={end}
                                    onChange={(e) => setEnd(e.target.value)}
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 flex items-center justify-between">
                        <div>
                            {event && (
                                <button
                                    onClick={onDelete}
                                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                                >
                                    <HiOutlineTrash className="w-4 h-4" />
                                    Supprimer
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => {
                                    if (!title.trim() || !start || !end) return
                                    onSave({ title: title.trim(), start: dayjs(start), end: dayjs(end), category })
                                }}
                                className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-sm hover:shadow-md ${cat.dot} hover:opacity-90`}
                            >
                                {event ? 'Modifier' : 'Créer'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
const CalendarPage = () => {
    const [events, setEvents] = useState<CalEvent[]>(SAMPLE)
    const [view, setView] = useState<ViewType>('month')
    const [date, setDate] = useState(dayjs())
    const [modal, setModal] = useState<{ open: boolean; event: CalEvent | null; defaultStart: Dayjs }>({
        open: false, event: null, defaultStart: dayjs(),
    })
    const [direction, setDirection] = useState(0)

    const navigate = useCallback((dir: number) => {
        setDirection(dir)
        setDate((d) => {
            if (view === 'month') return d.add(dir, 'month')
            if (view === 'week') return d.add(dir * 7, 'day')
            return d.add(dir, 'day')
        })
    }, [view])

    const goToday = () => { setDirection(0); setDate(dayjs()) }

    const openNew = (start: Dayjs) => setModal({ open: true, event: null, defaultStart: start })
    const openEdit = (event: CalEvent) => setModal({ open: true, event, defaultStart: event.start })

    const handleSave = (data: Omit<CalEvent, 'id'>) => {
        if (modal.event) {
            setEvents((prev) => prev.map((e) => e.id === modal.event!.id ? { ...e, ...data } : e))
        } else {
            setEvents((prev) => [...prev, { id: Date.now(), ...data }])
        }
        setModal({ open: false, event: null, defaultStart: dayjs() })
    }

    const handleDelete = () => {
        if (modal.event) setEvents((prev) => prev.filter((e) => e.id !== modal.event!.id))
        setModal({ open: false, event: null, defaultStart: dayjs() })
    }

    const title = view === 'month'
        ? date.format('MMMM YYYY')
        : view === 'week'
        ? `${date.startOf('isoWeek').format('D MMM')} – ${date.endOf('isoWeek').format('D MMM YYYY')}`
        : date.format('dddd D MMMM YYYY')

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* ── Sidebar ── */}
            <aside className="w-56 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col p-4 gap-6">
                {/* Logo */}
                <div className="flex items-center gap-2 px-1">
                    <BsCalendar3 className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">Calendrier</span>
                </div>

                {/* Add button */}
                <button
                    onClick={() => openNew(dayjs())}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                >
                    <HiOutlinePlus className="w-4 h-4" />
                    Nouvel événement
                </button>

                {/* Mini calendar */}
                <MiniCalendar current={date} selected={date} onChange={(d) => setDate(d)} />

                {/* Legend */}
                <div className="mt-auto space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Catégories</p>
                    {CATEGORIES.map((c) => (
                        <div key={c.value} className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{c.label}</span>
                        </div>
                    ))}
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Toolbar */}
                <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={goToday}
                            className="px-4 py-1.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                            Aujourd'hui
                        </button>
                        <div className="flex items-center gap-1">
                            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <HiOutlineChevronLeft className="w-4 h-4 text-gray-500" />
                            </button>
                            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <HiOutlineChevronRight className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 capitalize">{title}</h1>
                    </div>

                    {/* View switcher */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-0.5">
                        {(['month', 'week', 'day'] as ViewType[]).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize
                                    ${view === v
                                        ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                                `}
                            >
                                {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Jour'}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Calendar body */}
                <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={`${view}-${title}`}
                            custom={direction}
                            initial={{ opacity: 0, x: direction * 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: direction * -40 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="h-full"
                        >
                            {view === 'month' && (
                                <MonthView date={date} events={events} onDayClick={(d) => { setDate(d); setView('day') }} onEventClick={openEdit} />
                            )}
                            {view === 'week' && (
                                <WeekView date={date} events={events} onSlotClick={openNew} onEventClick={openEdit} />
                            )}
                            {view === 'day' && (
                                <DayView date={date} events={events} onSlotClick={openNew} onEventClick={openEdit} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Modal */}
            {modal.open && (
                <EventModal
                    event={modal.event}
                    defaultStart={modal.defaultStart}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onClose={() => setModal({ open: false, event: null, defaultStart: dayjs() })}
                />
            )}
        </div>
    )
}

export default CalendarPage
