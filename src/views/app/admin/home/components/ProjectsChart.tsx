import { Card } from '@/components/ui'
import { ProjectStat } from '../store/dashboardSuperAdminSlice'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En cours', color: 'bg-blue-500', bg: 'bg-blue-50' },
  fulfilled: { label: 'Terminés', color: 'bg-green-500', bg: 'bg-green-50' },
  waiting: { label: 'En attente', color: 'bg-yellow-500', bg: 'bg-yellow-50' },
  canceled: { label: 'Annulés', color: 'bg-red-400', bg: 'bg-red-50' },
}

type ProjectsChartProps = {
  projects: ProjectStat[]
}

const ProjectsChart = ({ projects }: ProjectsChartProps) => {
  const total = projects.length

  const byState = Object.entries(statusConfig).map(([state, config]) => {
    const count = projects.filter((p) => p.state === state).length
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    return { state, count, pct, ...config }
  })

  return (
    <Card className="p-5">
      <h5 className="font-semibold text-gray-800 dark:text-white mb-4">
        Répartition des projets
      </h5>

      {/* Bar */}
      <div className="flex rounded-full overflow-hidden h-3 mb-5 gap-0.5">
        {byState.map(({ state, pct, color }) =>
          pct > 0 ? (
            <div
              key={state}
              className={`${color} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${pct}%`}
            />
          ) : null
        )}
        {total === 0 && <div className="bg-gray-200 w-full" />}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        {byState.map(({ state, label, color, bg, count, pct }) => (
          <div key={state} className={`flex items-center gap-3 rounded-lg p-3 ${bg} dark:bg-opacity-10`}>
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{label}</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
                {count}
                <span className="text-xs font-normal text-gray-400 ml-1">
                  ({pct}%)
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default ProjectsChart
