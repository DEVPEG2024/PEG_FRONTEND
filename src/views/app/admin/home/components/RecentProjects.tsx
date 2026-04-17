import { Card } from '@/components/ui'
import { ProjectStat } from '../store/dashboardSuperAdminSlice'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { fmtPrice } from '@/utils/priceHelpers'

const statusColorData: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  fulfilled: 'bg-green-100 text-green-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  canceled: 'bg-red-100 text-red-700',
  sav: 'bg-orange-100 text-orange-700',
}

const statusTextData: Record<string, string> = {
  pending: 'En cours',
  fulfilled: 'Terminé',
  waiting: 'En attente',
  canceled: 'Annulé',
  sav: 'SAV',
}

type RecentProjectsProps = {
  projects: ProjectStat[]
}

const RecentProjects = ({ projects }: RecentProjectsProps) => {
  const recent = projects.slice(0, 8)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-semibold text-gray-800 dark:text-white">
          Projets récents
        </h5>
        <Link
          to="/common/projects"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Voir tout →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-700">
              <th className="pb-3 font-medium">Projet</th>
              <th className="pb-3 font-medium">Client</th>
              <th className="pb-3 font-medium">Producteur</th>
              <th className="pb-3 font-medium">Statut</th>
              <th className="pb-3 font-medium text-right">Prix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {recent.map((project) => (
              <tr key={project.documentId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="py-3 pr-4">
                  <Link
                    to={`/common/projects/details/${project.documentId}`}
                    className="font-medium text-gray-800 dark:text-gray-200 hover:text-indigo-600"
                  >
                    {project.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {project.startDate
                      ? dayjs(project.startDate).format('DD/MM/YYYY')
                      : '—'}
                  </p>
                </td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                  {project.customer?.name ?? '—'}
                </td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                  {project.producer?.name ?? (
                    <span className="text-gray-300 italic">Non assigné</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColorData[project.state] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {statusTextData[project.state] ?? project.state}
                  </span>
                </td>
                <td className="py-3 text-right font-medium text-gray-800 dark:text-gray-200">
                  {project.price != null
                    ? fmtPrice(project.price)
                    : '—'}
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Aucun projet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default RecentProjects
