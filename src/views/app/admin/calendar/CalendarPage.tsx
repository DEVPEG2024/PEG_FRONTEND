import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/fr'
import isoWeek from 'dayjs/plugin/isoWeek'
import isBetween from 'dayjs/plugin/isBetween'
import { motion, AnimatePresence } from 'framer-motion'
import {
    HiOutlinePlus, HiOutlineChevronLeft, HiOutlineChevronRight,
    HiOutlineX, HiOutlineTrash, HiOutlineSearch, HiOutlineDownload,
    HiOutlineBell, HiOutlineRefresh, HiOutlineLink,
} from 'react-icons/hi'
import { BsCalendar3, BsGoogle } from 'react-icons/bs'
import { unwrapData } from '@/utils/serviceHelper'
import {
    apiGetCalendarEvents,
    apiCreateCalendarEvent,
    apiUpdateCalendarEvent,
    apiDeleteCalendarEvent,
} from '@/services/CalendarEventService'
import { apiGetProjects } from '@/services/ProjectServices'
import type { CalendarEventCategory, RecurrenceType } from '@/@types/calendarEvent'
import type { Project } from '@/@types/project'
import { toast } from 'react-toastify'

dayjs.extend(isoWeek)
dayjs.extend(isBetween)
dayjs.locale('fr')

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewType = 'month' | 'week' | 'day'

interface CalEvent {
    id: string // documentId from Strapi, or temp local id
    title: string
    description?: string
    start: Dayjs
    end: Dayjs
    category: CalendarEventCategory
    allDay?: boolean
    recurrence: RecurrenceType
    recurrenceEnd?: Dayjs
    reminderMinutes: number
    googleEventId?: string
    projectId?: string
    projectName?: string
    isSynced: boolean // true if saved in Strapi
}

interface DragState {
    eventId: string
    originDay: string
    originHour: number
    originMinute: number
    durationMinutes: number
    mode: 'move' | 'resize'
}

// ─── Config ────────────────────────────────────────────────────────────────────
const CATEGORIES: { value: CalendarEventCategory; label: string; color: string; bg: string; dot: string }[] = [
    { value: 'production', label: 'Production', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/40', dot: 'bg-orange-500' },
    { value: 'reunion', label: 'Réunion', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/40', dot: 'bg-blue-500' },
    { value: 'livraison', label: 'Livraison', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40', dot: 'bg-emerald-500' },
    { value: 'autre', label: 'Autre', color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/40', dot: 'bg-violet-500' },
]

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
    { value: 'none', label: 'Aucune' },
    { value: 'daily', label: 'Tous les jours' },
    { value: 'weekly', label: 'Toutes les semaines' },
    { value: 'monthly', label: 'Tous les mois' },
    { value: 'yearly', label: 'Tous les ans' },
]

const REMINDER_OPTIONS = [
    { value: 0, label: 'Aucun' },
    { value: 5, label: '5 minutes avant' },
    { value: 15, label: '15 minutes avant' },
    { value: 30, label: '30 minutes avant' },
    { value: 60, label: '1 heure avant' },
    { value: 1440, label: '1 jour avant' },
]

const getCat = (v: CalendarEventCategory) => CATEGORIES.find((c) => c.value === v)!

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const SLOT_HEIGHT = 56

// ─── Helpers ───────────────────────────────────────────────────────────────────
const sameDay = (a: Dayjs, b: Dayjs) => a.isSame(b, 'day')
const snap15 = (totalMinutes: number) => Math.round(totalMinutes / 15) * 15

/** Expand recurring events into occurrences within a date range */
function expandRecurringEvents(events: CalEvent[], rangeStart: Dayjs, rangeEnd: Dayjs): CalEvent[] {
    const result: CalEvent[] = []

    for (const event of events) {
        if (event.recurrence === 'none') {
            result.push(event)
            continue
        }

        const duration = event.end.diff(event.start, 'minute')
        const recEnd = event.recurrenceEnd || rangeEnd
        const effectiveEnd = recEnd.isBefore(rangeEnd) ? recEnd : rangeEnd
        let current = event.start

        const incrementMap: Record<string, [number, dayjs.ManipulateType]> = {
            daily: [1, 'day'],
            weekly: [1, 'week'],
            monthly: [1, 'month'],
            yearly: [1, 'year'],
        }
        const [inc, unit] = incrementMap[event.recurrence] || [1, 'day']

        // Generate occurrences (limit to 365 to prevent infinite loops)
        let count = 0
        while (current.isBefore(effectiveEnd) && count < 365) {
            if (current.isAfter(rangeStart.subtract(1, 'day')) || sameDay(current, rangeStart)) {
                result.push({
                    ...event,
                    id: `${event.id}_${current.format('YYYY-MM-DD')}`,
                    start: current,
                    end: current.add(duration, 'minute'),
                })
            }
            current = current.add(inc, unit)
            count++
        }
    }

    return result
}

/** Generate ICS calendar file content */
function generateICS(events: CalEvent[]): string {
    const formatICSDate = (d: Dayjs) => d.utc().format('YYYYMMDDTHHmmss') + 'Z'
    const escapeText = (s: string) => s.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PEG//Calendrier//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ]

    for (const ev of events) {
        lines.push('BEGIN:VEVENT')
        lines.push(`UID:${ev.id}@peg.mypeg.fr`)
        lines.push(`DTSTART:${formatICSDate(ev.start)}`)
        lines.push(`DTEND:${formatICSDate(ev.end)}`)
        lines.push(`SUMMARY:${escapeText(ev.title)}`)
        if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`)
        lines.push(`CATEGORIES:${ev.category.toUpperCase()}`)
        if (ev.reminderMinutes > 0) {
            lines.push('BEGIN:VALARM')
            lines.push('ACTION:DISPLAY')
            lines.push(`DESCRIPTION:Rappel: ${ev.title}`)
            lines.push(`TRIGGER:-PT${ev.reminderMinutes}M`)
            lines.push('END:VALARM')
        }
        if (ev.recurrence !== 'none') {
            const freqMap: Record<string, string> = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }
            let rrule = `RRULE:FREQ=${freqMap[ev.recurrence]}`
            if (ev.recurrenceEnd) rrule += `;UNTIL=${formatICSDate(ev.recurrenceEnd)}`
            lines.push(rrule)
        }
        lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')
    return lines.join('\r\n')
}

/** Parse ICS file content into events */
function parseICS(icsContent: string): Omit<CalEvent, 'id' | 'isSynced'>[] {
    const events: Omit<CalEvent, 'id' | 'isSynced'>[] = []
    const blocks = icsContent.split('BEGIN:VEVENT')

    for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i].split('END:VEVENT')[0]
        const getField = (name: string): string | undefined => {
            const match = block.match(new RegExp(`${name}[^:]*:(.+)`))
            return match?.[1]?.trim()
        }

        const dtstart = getField('DTSTART')
        const dtend = getField('DTEND')
        const summary = getField('SUMMARY')

        if (!dtstart || !summary) continue

        const parseDt = (s: string) => dayjs(s.replace(/[TZ]/g, (m) => m === 'T' ? 'T' : '').replace('Z', ''))

        let recurrence: RecurrenceType = 'none'
        let recurrenceEnd: Dayjs | undefined
        const rrule = getField('RRULE')
        if (rrule) {
            const freqMatch = rrule.match(/FREQ=(\w+)/)
            if (freqMatch) {
                const freqMap: Record<string, RecurrenceType> = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' }
                recurrence = freqMap[freqMatch[1]] || 'none'
            }
            const untilMatch = rrule.match(/UNTIL=([^;]+)/)
            if (untilMatch) recurrenceEnd = parseDt(untilMatch[1])
        }

        let reminderMinutes = 0
        const triggerMatch = block.match(/TRIGGER:-PT(\d+)M/)
        if (triggerMatch) reminderMinutes = parseInt(triggerMatch[1])

        events.push({
            title: summary.replace(/\\([,;\\n])/g, '$1'),
            description: getField('DESCRIPTION')?.replace(/\\([,;\\n])/g, '$1'),
            start: parseDt(dtstart),
            end: dtend ? parseDt(dtend) : parseDt(dtstart).add(1, 'hour'),
            category: 'autre',
            recurrence,
            recurrenceEnd,
            reminderMinutes,
        })
    }

    return events
}

/** Request browser notification permission and schedule a notification */
function scheduleNotification(event: CalEvent) {
    if (event.reminderMinutes <= 0) return
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
        window.Notification.requestPermission()
    }

    const notifyAt = event.start.subtract(event.reminderMinutes, 'minute')
    const msUntilNotify = notifyAt.diff(dayjs())

    if (msUntilNotify > 0 && msUntilNotify < 86400000) { // within 24h
        setTimeout(() => {
            if (window.Notification.permission === 'granted') {
                new window.Notification(`Rappel: ${event.title}`, {
                    body: `Commence à ${event.start.format('HH:mm')}`,
                    icon: '/favicon.ico',
                })
            }
        }, msUntilNotify)
    }
}

function getSlotFromPoint(x: number, y: number): { date?: string; hour?: number } | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    if (!el) return null
    const slot = el.closest('[data-slot-date]') as HTMLElement | null
    if (slot) {
        return {
            date: slot.dataset.slotDate,
            hour: slot.dataset.slotHour ? Number(slot.dataset.slotHour) : undefined,
        }
    }
    const dayCell = el.closest('[data-day-date]') as HTMLElement | null
    if (dayCell) {
        return { date: dayCell.dataset.dayDate }
    }
    return null
}

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

// ─── Event Pill (Month view) ──────────────────────────────────────────────────
function EventPill({ event, onClick, compact = false, onDragStart }: {
    event: CalEvent; onClick: (e: CalEvent) => void; compact?: boolean
    onDragStart?: (e: React.DragEvent, ev: CalEvent) => void
}) {
    const cat = getCat(event.category)
    return (
        <motion.button
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            draggable
            onDragStart={(e: any) => onDragStart?.(e, event)}
            onClick={(e) => { e.stopPropagation(); onClick(event) }}
            className={`
                w-full text-left rounded-md px-2 py-0.5 mb-0.5 flex items-center gap-1.5
                ${cat.bg} ${cat.color} hover:brightness-95 transition-all cursor-grab active:cursor-grabbing
                ${compact ? 'text-[10px]' : 'text-xs'} font-medium truncate group
            `}
        >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dot}`} />
            <span className="truncate">{event.title}</span>
            {event.recurrence !== 'none' && <HiOutlineRefresh className="w-2.5 h-2.5 shrink-0 opacity-50" />}
            {event.projectId && <HiOutlineLink className="w-2.5 h-2.5 shrink-0 opacity-50" />}
            {!compact && <span className="text-[10px] opacity-60 shrink-0 ml-auto">{event.start.format('HH:mm')}</span>}
        </motion.button>
    )
}

// ─── Draggable Event Block (Week/Day views) ─────────────────────────────────
function DraggableEvent({ event, onClick, onDragStart, onResizeStart, style }: {
    event: CalEvent
    onClick: (e: CalEvent) => void
    onDragStart: (e: React.PointerEvent, ev: CalEvent, mode: 'move') => void
    onResizeStart: (e: React.PointerEvent, ev: CalEvent) => void
    style: React.CSSProperties
}) {
    const cat = getCat(event.category)
    return (
        <div
            className={`absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-left ${cat.bg} ${cat.color} shadow-sm hover:shadow-md transition-shadow z-10 overflow-hidden cursor-grab active:cursor-grabbing select-none group`}
            style={style}
            onPointerDown={(e) => {
                if ((e.target as HTMLElement).dataset.resize) return
                e.stopPropagation()
                onDragStart(e, event, 'move')
            }}
            onClick={(e) => { e.stopPropagation(); onClick(event) }}
        >
            <div className="text-[11px] font-semibold truncate flex items-center gap-1">
                {event.title}
                {event.recurrence !== 'none' && <HiOutlineRefresh className="w-2.5 h-2.5 shrink-0 opacity-50" />}
                {event.projectId && <HiOutlineLink className="w-2.5 h-2.5 shrink-0 opacity-50" />}
            </div>
            <div className="text-[10px] opacity-70">{event.start.format('HH:mm')} – {event.end.format('HH:mm')}</div>
            {/* Resize handle */}
            <div
                data-resize="true"
                className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black/10 dark:hover:bg-white/10 rounded-b-lg transition-colors opacity-0 group-hover:opacity-100"
                onPointerDown={(e) => {
                    e.stopPropagation()
                    onResizeStart(e, event)
                }}
            />
        </div>
    )
}

// ─── Month View ─────────────────────────────────────────────────────────────────
function MonthView({ date, events, onDayClick, onEventClick, onMonthDragStart, onMonthDrop, dropTargetDate }: {
    date: Dayjs; events: CalEvent[]
    onDayClick: (d: Dayjs) => void; onEventClick: (e: CalEvent) => void
    onMonthDragStart: (e: React.DragEvent, ev: CalEvent) => void
    onMonthDrop: (e: React.DragEvent, targetDate: Dayjs) => void
    dropTargetDate: string | null
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
                    const isDragOver = day && dropTargetDate === day.format('YYYY-MM-DD')
                    return (
                        <div
                            key={i}
                            data-day-date={day?.format('YYYY-MM-DD')}
                            onClick={() => day && onDayClick(day)}
                            onDragOver={(e) => { if (day) e.preventDefault() }}
                            onDrop={(e) => { if (day) onMonthDrop(e, day) }}
                            className={`
                                border-b border-r border-gray-100 dark:border-gray-700/60 p-1.5 min-h-0 overflow-hidden
                                ${day ? 'cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/30' : ''}
                                ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}
                                ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-inset ring-blue-400' : ''}
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
                                            <EventPill key={ev.id} event={ev} onClick={onEventClick} compact onDragStart={onMonthDragStart} />
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
function WeekView({ date, events, onSlotClick, onEventClick, onPointerDragStart, onResizeStart, dragPreview }: {
    date: Dayjs; events: CalEvent[]
    onSlotClick: (d: Dayjs) => void; onEventClick: (e: CalEvent) => void
    onPointerDragStart: (e: React.PointerEvent, ev: CalEvent, mode: 'move') => void
    onResizeStart: (e: React.PointerEvent, ev: CalEvent) => void
    dragPreview: { date: string; hour: number; minute: number; durationMinutes: number; eventId: string } | null
}) {
    const weekStart = date.startOf('isoWeek')
    const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))

    return (
        <div className="flex flex-col h-full overflow-hidden">
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
            <div className="overflow-y-auto flex-1">
                <div className="grid grid-cols-8 relative">
                    <div>
                        {HOURS.map((h) => (
                            <div key={h} className="h-14 flex items-start justify-end pr-3 pt-1">
                                <span className="text-[10px] text-gray-400 font-medium">{h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}</span>
                            </div>
                        ))}
                    </div>
                    {weekDays.map((d) => {
                        const dayEvs = eventsOfDay(events, d)
                        const dayStr = d.format('YYYY-MM-DD')
                        return (
                            <div key={d.toString()} className="border-l border-gray-100 dark:border-gray-700 relative">
                                {HOURS.map((h) => (
                                    <div
                                        key={h}
                                        data-slot-date={dayStr}
                                        data-slot-hour={h}
                                        onClick={() => onSlotClick(d.hour(h).minute(0))}
                                        className="h-14 border-b border-gray-50 dark:border-gray-700/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                                    />
                                ))}
                                {dayEvs.map((ev) => {
                                    const isDragging = dragPreview?.eventId === ev.id
                                    const top = (ev.start.hour() + ev.start.minute() / 60) * SLOT_HEIGHT
                                    const height = Math.max(((ev.end.hour() - ev.start.hour() + (ev.end.minute() - ev.start.minute()) / 60)) * SLOT_HEIGHT, 24)
                                    return (
                                        <DraggableEvent
                                            key={ev.id}
                                            event={ev}
                                            onClick={onEventClick}
                                            onDragStart={onPointerDragStart}
                                            onResizeStart={onResizeStart}
                                            style={{ top, height, opacity: isDragging ? 0.3 : 1 }}
                                        />
                                    )
                                })}
                                {dragPreview && dragPreview.date === dayStr && (
                                    <div
                                        className="absolute left-0.5 right-0.5 rounded-lg border-2 border-dashed border-blue-400 bg-blue-100/50 dark:bg-blue-900/30 z-20 pointer-events-none"
                                        style={{
                                            top: (dragPreview.hour + dragPreview.minute / 60) * SLOT_HEIGHT,
                                            height: Math.max((dragPreview.durationMinutes / 60) * SLOT_HEIGHT, 24),
                                        }}
                                    >
                                        <div className="text-[10px] font-semibold text-blue-600 px-2 pt-1">
                                            {String(dragPreview.hour).padStart(2, '0')}:{String(dragPreview.minute).padStart(2, '0')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─── Day View ───────────────────────────────────────────────────────────────────
function DayView({ date, events, onSlotClick, onEventClick, onPointerDragStart, onResizeStart, dragPreview }: {
    date: Dayjs; events: CalEvent[]
    onSlotClick: (d: Dayjs) => void; onEventClick: (e: CalEvent) => void
    onPointerDragStart: (e: React.PointerEvent, ev: CalEvent, mode: 'move') => void
    onResizeStart: (e: React.PointerEvent, ev: CalEvent) => void
    dragPreview: { date: string; hour: number; minute: number; durationMinutes: number; eventId: string } | null
}) {
    const dayEvs = eventsOfDay(events, date)
    const dayStr = date.format('YYYY-MM-DD')

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
                                data-slot-date={dayStr}
                                data-slot-hour={h}
                                onClick={() => onSlotClick(date.hour(h).minute(0))}
                                className="h-14 border-b border-gray-50 dark:border-gray-700/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                            />
                        ))}
                        {dayEvs.map((ev) => {
                            const isDragging = dragPreview?.eventId === ev.id
                            const top = (ev.start.hour() + ev.start.minute() / 60) * SLOT_HEIGHT
                            const height = Math.max(((ev.end.hour() - ev.start.hour() + (ev.end.minute() - ev.start.minute()) / 60)) * SLOT_HEIGHT, 28)
                            return (
                                <DraggableEvent
                                    key={ev.id}
                                    event={ev}
                                    onClick={onEventClick}
                                    onDragStart={onPointerDragStart}
                                    onResizeStart={onResizeStart}
                                    style={{ top, height, left: '0.5rem', right: '0.5rem', opacity: isDragging ? 0.3 : 1 }}
                                />
                            )
                        })}
                        {dragPreview && dragPreview.date === dayStr && (
                            <div
                                className="absolute left-2 right-2 rounded-xl border-2 border-dashed border-blue-400 bg-blue-100/50 dark:bg-blue-900/30 z-20 pointer-events-none"
                                style={{
                                    top: (dragPreview.hour + dragPreview.minute / 60) * SLOT_HEIGHT,
                                    height: Math.max((dragPreview.durationMinutes / 60) * SLOT_HEIGHT, 28),
                                }}
                            >
                                <div className="text-[10px] font-semibold text-blue-600 px-2 pt-1">
                                    {String(dragPreview.hour).padStart(2, '0')}:{String(dragPreview.minute).padStart(2, '0')}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Event Modal ────────────────────────────────────────────────────────────────
function EventModal({ event, defaultStart, projects, onSave, onDelete, onClose }: {
    event: CalEvent | null
    defaultStart: Dayjs
    projects: Project[]
    onSave: (data: Omit<CalEvent, 'id' | 'isSynced'>) => void
    onDelete: () => void
    onClose: () => void
}) {
    const [title, setTitle] = useState(event?.title ?? '')
    const [description, setDescription] = useState(event?.description ?? '')
    const [category, setCategory] = useState<CalendarEventCategory>(event?.category ?? 'production')
    const [start, setStart] = useState(event ? event.start.format('YYYY-MM-DDTHH:mm') : defaultStart.format('YYYY-MM-DDTHH:mm'))
    const [end, setEnd] = useState(event ? event.end.format('YYYY-MM-DDTHH:mm') : defaultStart.add(1, 'hour').format('YYYY-MM-DDTHH:mm'))
    const [recurrence, setRecurrence] = useState<RecurrenceType>(event?.recurrence ?? 'none')
    const [recurrenceEnd, setRecurrenceEnd] = useState(event?.recurrenceEnd?.format('YYYY-MM-DD') ?? '')
    const [reminderMinutes, setReminderMinutes] = useState(event?.reminderMinutes ?? 0)
    const [projectId, setProjectId] = useState(event?.projectId ?? '')

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
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
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
                        {/* Description */}
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Description</label>
                            <textarea
                                placeholder="Description (optionnel)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                            />
                        </div>

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

                        {/* Recurrence */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Récurrence</label>
                                <select
                                    value={recurrence}
                                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    {RECURRENCE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            {recurrence !== 'none' && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Fin récurrence</label>
                                    <input
                                        type="date"
                                        value={recurrenceEnd}
                                        onChange={(e) => setRecurrenceEnd(e.target.value)}
                                        className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Reminder */}
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                                <HiOutlineBell className="w-3.5 h-3.5" />
                                Rappel
                            </label>
                            <select
                                value={reminderMinutes}
                                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                                className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                                {REMINDER_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Link to project */}
                        {projects.length > 0 && (
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                                    <HiOutlineLink className="w-3.5 h-3.5" />
                                    Lier à un projet
                                </label>
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="w-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="">Aucun projet</option>
                                    {projects.map((p) => (
                                        <option key={p.documentId} value={p.documentId}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
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
                                    onSave({
                                        title: title.trim(),
                                        description: description.trim() || undefined,
                                        start: dayjs(start),
                                        end: dayjs(end),
                                        category,
                                        recurrence,
                                        recurrenceEnd: recurrenceEnd ? dayjs(recurrenceEnd) : undefined,
                                        reminderMinutes,
                                        projectId: projectId || undefined,
                                        projectName: projects.find((p) => p.documentId === projectId)?.name,
                                    })
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

// ─── Google Calendar Modal ──────────────────────────────────────────────────────
function GoogleCalendarModal({ onClose, onExportICS }: { onClose: () => void; onExportICS: () => void }) {
    return (
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
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BsGoogle className="w-5 h-5 text-red-500" />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Google Agenda</h2>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <HiOutlineX className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Option 1: Export ICS */}
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 space-y-2">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Exporter vers Google Agenda</h3>
                            <p className="text-xs text-gray-500">Téléchargez un fichier .ics et importez-le dans Google Agenda (ou tout autre calendrier).</p>
                            <button
                                onClick={() => { onExportICS(); onClose() }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all"
                            >
                                <HiOutlineDownload className="w-4 h-4" />
                                Télécharger .ics
                            </button>
                        </div>

                        {/* Option 2: Google Calendar URL */}
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 space-y-2">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">S'abonner (URL)</h3>
                            <p className="text-xs text-gray-500">
                                Pour une synchronisation automatique, une API backend avec OAuth2 Google est nécessaire.
                                Contactez l'administrateur pour activer cette fonctionnalité.
                            </p>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                                <span className="text-xs text-gray-400 truncate">https://api.mypeg.fr/api/calendar/feed.ics</span>
                            </div>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                Endpoint non encore configuré côté backend
                            </p>
                        </div>

                        {/* Option 3: OAuth sync */}
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 space-y-2">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Synchronisation bidirectionnelle</h3>
                            <p className="text-xs text-gray-500">
                                Nécessite : Google Cloud Console (OAuth2 credentials), endpoint Strapi pour le callback OAuth,
                                et stockage du refresh token.
                            </p>
                            <button
                                disabled
                                className="flex items-center gap-2 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 text-sm font-semibold rounded-lg cursor-not-allowed"
                            >
                                <BsGoogle className="w-3.5 h-3.5" />
                                Connecter (bientôt disponible)
                            </button>
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-6">
                    <button onClick={onClose} className="w-full py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
                        Fermer
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
const CalendarPage = () => {
    const [events, setEvents] = useState<CalEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<ViewType>('month')
    const [date, setDate] = useState(dayjs())
    const [search, setSearch] = useState('')
    const [activeCategories, setActiveCategories] = useState<Set<CalendarEventCategory>>(new Set(CATEGORIES.map((c) => c.value)))
    const [projects, setProjects] = useState<Project[]>([])

    const [modal, setModal] = useState<{ open: boolean; event: CalEvent | null; defaultStart: Dayjs }>({
        open: false, event: null, defaultStart: dayjs(),
    })
    const [googleModal, setGoogleModal] = useState(false)
    const [direction, setDirection] = useState(0)

    // ─── Drag & Drop state ──────────────────────────────────────────────────
    const dragRef = useRef<DragState | null>(null)
    const [dragPreview, setDragPreview] = useState<{
        date: string; hour: number; minute: number; durationMinutes: number; eventId: string
    } | null>(null)
    const [monthDropTarget] = useState<string | null>(null)
    const monthDragEventId = useRef<string | null>(null)

    // ─── Load events from Strapi ────────────────────────────────────────────
    const loadEvents = useCallback(async () => {
        try {
            const data = await unwrapData(apiGetCalendarEvents())
            const strapiEvents: CalEvent[] = data.calendarEvents_connection.nodes.map((e) => ({
                id: e.documentId,
                title: e.title,
                description: e.description,
                start: dayjs(e.startDate),
                end: dayjs(e.endDate),
                category: e.category,
                allDay: e.allDay,
                recurrence: e.recurrence,
                recurrenceEnd: e.recurrenceEnd ? dayjs(e.recurrenceEnd) : undefined,
                reminderMinutes: e.reminderMinutes || 0,
                googleEventId: e.googleEventId,
                projectId: e.project?.documentId,
                projectName: e.project?.name,
                isSynced: true,
            }))
            setEvents(strapiEvents)

            // Schedule notifications for upcoming events
            strapiEvents.forEach(scheduleNotification)
        } catch {
            // Fallback: load from localStorage if Strapi is unavailable
            const saved = localStorage.getItem('peg:calendarEvents')
            if (saved) {
                try {
                    const arr = JSON.parse(saved)
                    setEvents(arr.map((e: any) => ({
                        ...e,
                        start: dayjs(e.start),
                        end: dayjs(e.end),
                        recurrence: e.recurrence || 'none',
                        reminderMinutes: e.reminderMinutes || 0,
                        isSynced: false,
                    })))
                } catch { /* ignore */ }
            }
            toast.warning('Mode hors-ligne : données locales affichées.')
        } finally {
            setLoading(false)
        }
    }, [])

    // ─── Load projects ──────────────────────────────────────────────────────
    const loadProjects = useCallback(async () => {
        try {
            const data = await unwrapData(apiGetProjects())
            setProjects(data.projects_connection.nodes)
        } catch { /* projects are optional */ }
    }, [])

    useEffect(() => {
        loadEvents()
        loadProjects()
    }, [loadEvents, loadProjects])

    // ─── Request notification permission on mount ───────────────────────────
    useEffect(() => {
        if ('Notification' in window && window.Notification.permission === 'default') {
            window.Notification.requestPermission()
        }
    }, [])

    // ─── Filter & expand events ─────────────────────────────────────────────
    const filteredEvents = useMemo(() => {
        let filtered = events.filter((e) => {
            if (!activeCategories.has(e.category)) return false
            if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
            return true
        })

        // Expand recurring events for current view range
        let rangeStart: Dayjs, rangeEnd: Dayjs
        if (view === 'month') {
            rangeStart = date.startOf('month').subtract(7, 'day')
            rangeEnd = date.endOf('month').add(7, 'day')
        } else if (view === 'week') {
            rangeStart = date.startOf('isoWeek')
            rangeEnd = date.endOf('isoWeek')
        } else {
            rangeStart = date.startOf('day')
            rangeEnd = date.endOf('day')
        }

        return expandRecurringEvents(filtered, rangeStart, rangeEnd)
    }, [events, activeCategories, search, view, date])

    // ─── CRUD handlers ──────────────────────────────────────────────────────
    const handleSave = async (data: Omit<CalEvent, 'id' | 'isSynced'>) => {
        try {
            if (modal.event) {
                // Find the original event (not a recurrence instance)
                const originalId = modal.event.id.includes('_') ? modal.event.id.split('_')[0] : modal.event.id
                if (modal.event.isSynced) {
                    await unwrapData(apiUpdateCalendarEvent({
                        documentId: originalId,
                        title: data.title,
                        description: data.description,
                        startDate: data.start.toISOString(),
                        endDate: data.end.toISOString(),
                        category: data.category,
                        recurrence: data.recurrence,
                        recurrenceEnd: data.recurrenceEnd?.toISOString(),
                        reminderMinutes: data.reminderMinutes,
                        project: data.projectId || null,
                    } as any))
                }
                setEvents((prev) => prev.map((e) =>
                    e.id === originalId ? { ...e, ...data, id: originalId } : e
                ))
            } else {
                // Create
                try {
                    const result = await unwrapData(apiCreateCalendarEvent({
                        title: data.title,
                        description: data.description,
                        startDate: data.start.toISOString(),
                        endDate: data.end.toISOString(),
                        category: data.category,
                        allDay: false,
                        recurrence: data.recurrence,
                        recurrenceEnd: data.recurrenceEnd?.toISOString(),
                        reminderMinutes: data.reminderMinutes,
                        project: data.projectId || undefined,
                    } as any))
                    const newEvent: CalEvent = {
                        id: result.createCalendarEvent.documentId,
                        ...data,
                        isSynced: true,
                    }
                    setEvents((prev) => [...prev, newEvent])
                    scheduleNotification(newEvent)
                } catch {
                    // Fallback to local
                    const newEvent: CalEvent = { id: String(Date.now()), ...data, isSynced: false }
                    setEvents((prev) => [...prev, newEvent])
                }
            }
            toast.success(modal.event ? 'Événement modifié' : 'Événement créé')
        } catch {
            toast.error('Erreur lors de la sauvegarde')
        }
        setModal({ open: false, event: null, defaultStart: dayjs() })
    }

    const handleDelete = async () => {
        if (!modal.event) return
        const originalId = modal.event.id.includes('_') ? modal.event.id.split('_')[0] : modal.event.id
        try {
            if (modal.event.isSynced) {
                await unwrapData(apiDeleteCalendarEvent(originalId))
            }
            setEvents((prev) => prev.filter((e) => e.id !== originalId))
            toast.success('Événement supprimé')
        } catch {
            toast.error('Erreur lors de la suppression')
        }
        setModal({ open: false, event: null, defaultStart: dayjs() })
    }

    // ─── Import projects as events ──────────────────────────────────────────
    const importProjectDeadlines = useCallback(async () => {
        const existingProjectIds = new Set(events.filter((e) => e.projectId).map((e) => e.projectId))
        const newEvents: CalEvent[] = []

        for (const project of projects) {
            if (existingProjectIds.has(project.documentId)) continue
            if (!project.endDate) continue

            try {
                const result = await unwrapData(apiCreateCalendarEvent({
                    title: `Deadline: ${project.name}`,
                    description: `Projet: ${project.name}`,
                    startDate: dayjs(project.endDate).hour(9).minute(0).toISOString(),
                    endDate: dayjs(project.endDate).hour(10).minute(0).toISOString(),
                    category: 'production',
                    allDay: false,
                    recurrence: 'none',
                    reminderMinutes: 1440,
                    project: project.documentId,
                } as any))

                newEvents.push({
                    id: result.createCalendarEvent.documentId,
                    title: `Deadline: ${project.name}`,
                    description: `Projet: ${project.name}`,
                    start: dayjs(project.endDate).hour(9).minute(0),
                    end: dayjs(project.endDate).hour(10).minute(0),
                    category: 'production',
                    recurrence: 'none',
                    reminderMinutes: 1440,
                    projectId: project.documentId,
                    projectName: project.name,
                    isSynced: true,
                })
            } catch { /* skip failed ones */ }
        }

        if (newEvents.length > 0) {
            setEvents((prev) => [...prev, ...newEvents])
            toast.success(`${newEvents.length} deadline(s) importée(s) depuis vos projets`)
        } else {
            toast.info('Toutes les deadlines sont déjà dans le calendrier')
        }
    }, [events, projects])

    // ─── ICS Export ─────────────────────────────────────────────────────────
    const handleExportICS = useCallback(() => {
        const baseEvents = events.filter((e) => !e.id.includes('_')) // only base events, not recurrence instances
        const icsContent = generateICS(baseEvents)
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `peg-calendrier-${dayjs().format('YYYY-MM-DD')}.ics`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Fichier .ics téléchargé')
    }, [events])

    // ─── ICS Import ─────────────────────────────────────────────────────────
    const handleImportICS = useCallback(() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.ics'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            const text = await file.text()
            const parsed = parseICS(text)

            let imported = 0
            for (const ev of parsed) {
                try {
                    const result = await unwrapData(apiCreateCalendarEvent({
                        title: ev.title,
                        description: ev.description,
                        startDate: ev.start.toISOString(),
                        endDate: ev.end.toISOString(),
                        category: ev.category,
                        allDay: false,
                        recurrence: ev.recurrence,
                        recurrenceEnd: ev.recurrenceEnd?.toISOString(),
                        reminderMinutes: ev.reminderMinutes,
                    } as any))

                    setEvents((prev) => [...prev, {
                        id: result.createCalendarEvent.documentId,
                        ...ev,
                        isSynced: true,
                    }])
                    imported++
                } catch {
                    // Fallback local
                    setEvents((prev) => [...prev, {
                        id: String(Date.now() + Math.random()),
                        ...ev,
                        isSynced: false,
                    }])
                    imported++
                }
            }

            toast.success(`${imported} événement(s) importé(s) depuis le fichier ICS`)
        }
        input.click()
    }, [])

    // ─── Pointer drag for Week/Day views ────────────────────────────────────
    const handlePointerDragStart = useCallback((e: React.PointerEvent, ev: CalEvent, _mode: 'move') => {
        e.preventDefault()
        const el = e.currentTarget as HTMLElement
        el.setPointerCapture(e.pointerId)

        const durationMinutes = ev.end.diff(ev.start, 'minute')
        dragRef.current = {
            eventId: ev.id,
            originDay: ev.start.format('YYYY-MM-DD'),
            originHour: ev.start.hour(),
            originMinute: ev.start.minute(),
            durationMinutes,
            mode: 'move',
        }
        setDragPreview({
            date: ev.start.format('YYYY-MM-DD'),
            hour: ev.start.hour(),
            minute: ev.start.minute(),
            durationMinutes,
            eventId: ev.id,
        })

        const onMove = (me: PointerEvent) => {
            const slot = getSlotFromPoint(me.clientX, me.clientY)
            if (!slot || slot.date === undefined) return
            const drag = dragRef.current
            if (!drag) return

            if (slot.hour !== undefined) {
                const slotEl = document.elementFromPoint(me.clientX, me.clientY) as HTMLElement | null
                const slotRect = slotEl?.closest('[data-slot-hour]')?.getBoundingClientRect()
                let minute = 0
                if (slotRect) {
                    const fraction = (me.clientY - slotRect.top) / slotRect.height
                    minute = snap15(Math.floor(fraction * 60))
                    if (minute >= 60) minute = 45
                }
                setDragPreview({
                    date: slot.date!,
                    hour: slot.hour,
                    minute,
                    durationMinutes: drag.durationMinutes,
                    eventId: drag.eventId,
                })
            }
        }

        const onUp = () => {
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            const drag = dragRef.current
            dragRef.current = null

            setDragPreview((prev) => {
                if (prev && drag) {
                    const newStart = dayjs(prev.date).hour(prev.hour).minute(prev.minute).second(0)
                    const newEnd = newStart.add(drag.durationMinutes, 'minute')
                    const originalId = drag.eventId.includes('_') ? drag.eventId.split('_')[0] : drag.eventId

                    setEvents((evts) =>
                        evts.map((evt) =>
                            evt.id === originalId ? { ...evt, start: newStart, end: newEnd } : evt
                        )
                    )

                    // Persist to Strapi
                    const evt = events.find((e) => e.id === originalId)
                    if (evt?.isSynced) {
                        apiUpdateCalendarEvent({
                            documentId: originalId,
                            startDate: newStart.toISOString(),
                            endDate: newEnd.toISOString(),
                        } as any).catch(() => {})
                    }
                }
                return null
            })
        }

        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
    }, [events])

    const handleResizeStart = useCallback((e: React.PointerEvent, ev: CalEvent) => {
        e.preventDefault()
        const el = e.currentTarget as HTMLElement
        el.setPointerCapture(e.pointerId)

        const durationMinutes = ev.end.diff(ev.start, 'minute')
        dragRef.current = {
            eventId: ev.id,
            originDay: ev.start.format('YYYY-MM-DD'),
            originHour: ev.start.hour(),
            originMinute: ev.start.minute(),
            durationMinutes,
            mode: 'resize',
        }
        setDragPreview({
            date: ev.start.format('YYYY-MM-DD'),
            hour: ev.start.hour(),
            minute: ev.start.minute(),
            durationMinutes,
            eventId: ev.id,
        })

        const onMove = (me: PointerEvent) => {
            const drag = dragRef.current
            if (!drag) return
            const slot = getSlotFromPoint(me.clientX, me.clientY)
            if (!slot || slot.hour === undefined) return

            const slotEl = document.elementFromPoint(me.clientX, me.clientY) as HTMLElement | null
            const slotRect = slotEl?.closest('[data-slot-hour]')?.getBoundingClientRect()
            let minute = 0
            if (slotRect) {
                const fraction = (me.clientY - slotRect.top) / slotRect.height
                minute = snap15(Math.floor(fraction * 60))
                if (minute >= 60) minute = 45
            }

            const endTotalMinutes = slot.hour * 60 + minute
            const startTotalMinutes = drag.originHour * 60 + drag.originMinute
            const newDuration = Math.max(15, endTotalMinutes - startTotalMinutes)

            setDragPreview({
                date: drag.originDay,
                hour: drag.originHour,
                minute: drag.originMinute,
                durationMinutes: newDuration,
                eventId: drag.eventId,
            })
        }

        const onUp = () => {
            document.removeEventListener('pointermove', onMove)
            document.removeEventListener('pointerup', onUp)
            const drag = dragRef.current
            dragRef.current = null

            setDragPreview((prev) => {
                if (prev && drag) {
                    const newEnd = dayjs(drag.originDay)
                        .hour(drag.originHour).minute(drag.originMinute).second(0)
                        .add(prev.durationMinutes, 'minute')
                    const originalId = drag.eventId.includes('_') ? drag.eventId.split('_')[0] : drag.eventId

                    setEvents((evts) =>
                        evts.map((evt) =>
                            evt.id === originalId ? { ...evt, end: newEnd } : evt
                        )
                    )

                    const evt = events.find((e) => e.id === originalId)
                    if (evt?.isSynced) {
                        apiUpdateCalendarEvent({
                            documentId: originalId,
                            endDate: newEnd.toISOString(),
                        } as any).catch(() => {})
                    }
                }
                return null
            })
        }

        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
    }, [events])

    // ─── HTML5 Drag for Month view ──────────────────────────────────────────
    const handleMonthDragStart = useCallback((_e: React.DragEvent, ev: CalEvent) => {
        monthDragEventId.current = ev.id
    }, [])

    const handleMonthDrop = useCallback((_e: React.DragEvent, targetDate: Dayjs) => {
        const evId = monthDragEventId.current
        monthDragEventId.current = null
        if (evId == null) return

        const originalId = evId.includes('_') ? evId.split('_')[0] : evId

        setEvents((evts) =>
            evts.map((evt) => {
                if (evt.id !== originalId) return evt
                const diff = targetDate.startOf('day').diff(evt.start.startOf('day'), 'day')
                const newStart = evt.start.add(diff, 'day')
                const newEnd = evt.end.add(diff, 'day')

                // Persist to Strapi
                if (evt.isSynced) {
                    apiUpdateCalendarEvent({
                        documentId: originalId,
                        startDate: newStart.toISOString(),
                        endDate: newEnd.toISOString(),
                    } as any).catch(() => {})
                }

                return { ...evt, start: newStart, end: newEnd }
            })
        )
    }, [])

    // ─── Navigation ─────────────────────────────────────────────────────────
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

    const toggleCategory = (cat: CalendarEventCategory) => {
        setActiveCategories((prev) => {
            const next = new Set(prev)
            if (next.has(cat)) next.delete(cat)
            else next.add(cat)
            return next
        })
    }

    const title = view === 'month'
        ? date.format('MMMM YYYY')
        : view === 'week'
        ? `${date.startOf('isoWeek').format('D MMM')} – ${date.endOf('isoWeek').format('D MMM YYYY')}`
        : date.format('dddd D MMMM YYYY')

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">Chargement du calendrier...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* ── Sidebar ── */}
            <aside className="w-56 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col p-4 gap-4 overflow-y-auto">
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

                {/* Search */}
                <div className="relative">
                    <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 placeholder-gray-400"
                    />
                </div>

                {/* Mini calendar */}
                <MiniCalendar current={date} selected={date} onChange={(d) => setDate(d)} />

                {/* Categories filter */}
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Catégories</p>
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.value}
                            onClick={() => toggleCategory(c.value)}
                            className={`flex items-center gap-2 w-full px-2 py-1 rounded-lg text-left transition-all ${
                                activeCategories.has(c.value) ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : 'opacity-40'
                            }`}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full ${c.dot} ${!activeCategories.has(c.value) ? 'opacity-30' : ''}`} />
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{c.label}</span>
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Actions</p>

                    {/* Import project deadlines */}
                    <button
                        onClick={importProjectDeadlines}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                        <HiOutlineLink className="w-3.5 h-3.5 text-orange-500" />
                        Importer deadlines projets
                    </button>

                    {/* Export ICS */}
                    <button
                        onClick={handleExportICS}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                        <HiOutlineDownload className="w-3.5 h-3.5 text-blue-500" />
                        Exporter .ics
                    </button>

                    {/* Import ICS */}
                    <button
                        onClick={handleImportICS}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                        <HiOutlinePlus className="w-3.5 h-3.5 text-emerald-500" />
                        Importer .ics
                    </button>
                </div>

                {/* Integrations */}
                <div className="mt-auto space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Intégrations</p>
                    <button
                        onClick={() => setGoogleModal(true)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                        <BsGoogle className="w-3.5 h-3.5 text-red-500" />
                        Google Agenda
                    </button>
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

                    <div className="flex items-center gap-3">
                        {/* Refresh */}
                        <button
                            onClick={loadEvents}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Rafraîchir"
                        >
                            <HiOutlineRefresh className="w-4 h-4 text-gray-500" />
                        </button>

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
                                <MonthView
                                    date={date}
                                    events={filteredEvents}
                                    onDayClick={(d) => { setDate(d); setView('day') }}
                                    onEventClick={openEdit}
                                    onMonthDragStart={handleMonthDragStart}
                                    onMonthDrop={handleMonthDrop}
                                    dropTargetDate={monthDropTarget}
                                />
                            )}
                            {view === 'week' && (
                                <WeekView
                                    date={date}
                                    events={filteredEvents}
                                    onSlotClick={openNew}
                                    onEventClick={openEdit}
                                    onPointerDragStart={handlePointerDragStart}
                                    onResizeStart={handleResizeStart}
                                    dragPreview={dragPreview}
                                />
                            )}
                            {view === 'day' && (
                                <DayView
                                    date={date}
                                    events={filteredEvents}
                                    onSlotClick={openNew}
                                    onEventClick={openEdit}
                                    onPointerDragStart={handlePointerDragStart}
                                    onResizeStart={handleResizeStart}
                                    dragPreview={dragPreview}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Event Modal */}
            {modal.open && (
                <EventModal
                    event={modal.event}
                    defaultStart={modal.defaultStart}
                    projects={projects}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onClose={() => setModal({ open: false, event: null, defaultStart: dayjs() })}
                />
            )}

            {/* Google Calendar Modal */}
            {googleModal && (
                <GoogleCalendarModal
                    onClose={() => setGoogleModal(false)}
                    onExportICS={handleExportICS}
                />
            )}
        </div>
    )
}

export default CalendarPage
