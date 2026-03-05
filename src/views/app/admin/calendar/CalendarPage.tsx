import { useState, useCallback } from 'react'
import { Calendar, dayjsLocalizer, Views } from 'react-big-calendar'
import dayjs from 'dayjs'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import Container from '@/components/shared/Container'
import { Button, Dialog } from '@/components/ui'
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import 'dayjs/locale/fr'

dayjs.locale('fr')
const localizer = dayjsLocalizer(dayjs)

type CalendarEvent = {
    id: number
    title: string
    start: Date
    end: Date
    category: 'production' | 'réunion' | 'livraison' | 'autre'
}

const CATEGORY_COLORS: Record<CalendarEvent['category'], string> = {
    production: '#f97316',
    réunion: '#3b82f6',
    livraison: '#22c55e',
    autre: '#8b5cf6',
}

const messages = {
    allDay: 'Journée',
    previous: '‹',
    next: '›',
    today: "Aujourd'hui",
    month: 'Mois',
    week: 'Semaine',
    day: 'Jour',
    agenda: 'Agenda',
    date: 'Date',
    time: 'Heure',
    event: 'Événement',
    noEventsInRange: 'Aucun événement sur cette période.',
    showMore: (total: number) => `+${total} de plus`,
}

const INITIAL_EVENTS: CalendarEvent[] = [
    {
        id: 1,
        title: 'Production lot A',
        start: new Date(new Date().setHours(8, 0, 0, 0)),
        end: new Date(new Date().setHours(12, 0, 0, 0)),
        category: 'production',
    },
    {
        id: 2,
        title: 'Réunion équipe',
        start: new Date(new Date().setHours(14, 0, 0, 0)),
        end: new Date(new Date().setHours(15, 0, 0, 0)),
        category: 'réunion',
    },
]

const CalendarPage = () => {
    const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [newEvent, setNewEvent] = useState({
        title: '',
        start: '',
        end: '',
        category: 'production' as CalendarEvent['category'],
    })

    const handleSelectSlot = useCallback(
        ({ start, end }: { start: Date; end: Date }) => {
            setNewEvent({
                title: '',
                start: dayjs(start).format('YYYY-MM-DDTHH:mm'),
                end: dayjs(end).format('YYYY-MM-DDTHH:mm'),
                category: 'production',
            })
            setSelectedEvent(null)
            setDialogOpen(true)
        },
        []
    )

    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        setSelectedEvent(event)
        setNewEvent({
            title: event.title,
            start: dayjs(event.start).format('YYYY-MM-DDTHH:mm'),
            end: dayjs(event.end).format('YYYY-MM-DDTHH:mm'),
            category: event.category,
        })
        setDialogOpen(true)
    }, [])

    const handleSave = () => {
        if (!newEvent.title || !newEvent.start || !newEvent.end) return

        if (selectedEvent) {
            setEvents((prev) =>
                prev.map((e) =>
                    e.id === selectedEvent.id
                        ? {
                              ...e,
                              title: newEvent.title,
                              start: new Date(newEvent.start),
                              end: new Date(newEvent.end),
                              category: newEvent.category,
                          }
                        : e
                )
            )
        } else {
            setEvents((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    title: newEvent.title,
                    start: new Date(newEvent.start),
                    end: new Date(newEvent.end),
                    category: newEvent.category,
                },
            ])
        }
        setDialogOpen(false)
    }

    const handleDelete = () => {
        if (selectedEvent) {
            setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id))
        }
        setDialogOpen(false)
    }

    const eventStyleGetter = (event: CalendarEvent) => ({
        style: {
            backgroundColor: CATEGORY_COLORS[event.category],
            borderRadius: '4px',
            border: 'none',
            color: 'white',
            fontSize: '0.8rem',
        },
    })

    return (
        <Container className="h-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        Calendrier de production
                    </h2>
                    <div className="flex gap-3 mt-2">
                        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                            <span key={cat} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </span>
                        ))}
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="solid"
                    icon={<HiOutlinePlus />}
                    onClick={() => {
                        const now = dayjs()
                        setNewEvent({
                            title: '',
                            start: now.format('YYYY-MM-DDTHH:mm'),
                            end: now.add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
                            category: 'production',
                        })
                        setSelectedEvent(null)
                        setDialogOpen(true)
                    }}
                >
                    Ajouter
                </Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4" style={{ height: 'calc(100vh - 220px)' }}>
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    messages={messages}
                    culture="fr"
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventStyleGetter}
                    defaultView={Views.MONTH}
                    views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                    style={{ height: '100%' }}
                />
            </div>

            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onRequestClose={() => setDialogOpen(false)}
            >
                <h5 className="mb-4 text-lg font-semibold dark:text-gray-100">
                    {selectedEvent ? "Modifier l'événement" : 'Nouvel événement'}
                </h5>
                <div className="flex flex-col gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Titre
                        </label>
                        <input
                            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newEvent.title}
                            onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
                            placeholder="Titre de l'événement"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Catégorie
                        </label>
                        <select
                            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newEvent.category}
                            onChange={(e) =>
                                setNewEvent((p) => ({
                                    ...p,
                                    category: e.target.value as CalendarEvent['category'],
                                }))
                            }
                        >
                            <option value="production">Production</option>
                            <option value="réunion">Réunion</option>
                            <option value="livraison">Livraison</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Début
                        </label>
                        <input
                            type="datetime-local"
                            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newEvent.start}
                            onChange={(e) => setNewEvent((p) => ({ ...p, start: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Fin
                        </label>
                        <input
                            type="datetime-local"
                            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newEvent.end}
                            onChange={(e) => setNewEvent((p) => ({ ...p, end: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="flex justify-between mt-6">
                    <div>
                        {selectedEvent && (
                            <Button
                                size="sm"
                                variant="plain"
                                className="text-red-500 hover:text-red-600"
                                icon={<HiOutlineTrash />}
                                onClick={handleDelete}
                            >
                                Supprimer
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="plain" onClick={() => setDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button size="sm" variant="solid" onClick={handleSave}>
                            {selectedEvent ? 'Modifier' : 'Créer'}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </Container>
    )
}

export default CalendarPage
