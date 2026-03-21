import { Project } from './project'

export type CalendarEventCategory = 'production' | 'reunion' | 'livraison' | 'autre'
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type CalendarEvent = {
    documentId: string
    title: string
    description?: string
    startDate: string
    endDate: string
    category: CalendarEventCategory
    allDay: boolean
    recurrence: RecurrenceType
    recurrenceEnd?: string
    reminderMinutes: number
    googleEventId?: string
    project?: Project
    createdAt?: string
    updatedAt?: string
}
