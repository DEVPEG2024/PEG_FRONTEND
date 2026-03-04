import { Card } from '@/components/ui'
import { TicketStat } from '../store/dashboardSuperAdminSlice'
import { Link } from 'react-router-dom'

const ticketConfig: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'Ouverts', color: 'text-blue-600', dot: 'bg-blue-500' },
  fulfilled: { label: 'Fermés', color: 'text-green-600', dot: 'bg-green-500' },
  canceled: { label: 'Rejetés', color: 'text-red-500', dot: 'bg-red-400' },
}

type TicketsSummaryProps = {
  tickets: TicketStat[]
  total: number
}

const TicketsSummary = ({ tickets, total }: TicketsSummaryProps) => {
  const byState = Object.entries(ticketConfig).map(([state, config]) => ({
    state,
    count: tickets.filter((t) => t.state === state).length,
    ...config,
  }))

  const openCount = tickets.filter((t) => t.state === 'pending').length

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-semibold text-gray-800 dark:text-white">Tickets support</h5>
        <Link
          to="/support"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Voir tout →
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <div className="text-center">
          <p className="text-4xl font-extrabold text-gray-900 dark:text-white">
            {total}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total tickets</p>
        </div>
        {openCount > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg ml-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm font-medium text-blue-700">
              {openCount} ouvert{openCount > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {byState.map(({ state, label, color, dot, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={state}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                </div>
                <span className={`text-sm font-semibold ${color}`}>
                  {count} <span className="text-gray-400 font-normal">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                <div
                  className={`h-1.5 rounded-full ${dot} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default TicketsSummary
