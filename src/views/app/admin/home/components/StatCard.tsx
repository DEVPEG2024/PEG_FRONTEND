import React from 'react'
import { Card } from '@/components/ui'

type StatCardProps = {
  title: string
  value: number | string
  icon: React.ReactNode
  color: string
  subtitle?: string
}

const StatCard = ({ title, value, icon, color, subtitle }: StatCardProps) => {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}

export default StatCard
