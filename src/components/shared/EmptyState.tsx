import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { HiOutlineInbox } from 'react-icons/hi'

export interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

const EmptyState = ({
  title = 'Aucun résultat',
  description = 'Aucune donnée à afficher pour le moment',
  icon,
  action,
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-16"
    >
      <div className="mb-4 text-gray-300 dark:text-gray-600">
        {icon ?? <HiOutlineInbox className="w-12 h-12" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-400 dark:text-gray-500">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-600">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}

export default EmptyState
