import React from 'react'

type Variant = 'default' | 'warning' | 'danger' | 'success'

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
}: {
  title: string
  value: string
  subtitle?: string
  trend?: { value: number; positive: boolean }
  icon?: React.ReactNode
  variant?: Variant
}) {
  const border =
    variant === 'danger'
      ? 'border-red-500/30'
      : variant === 'warning'
      ? 'border-amber-500/30'
      : variant === 'success'
      ? 'border-green-500/30'
      : 'border-white/10'

  const badge =
    trend == null ? null : (
      <span
        className={[
          'text-[11px] px-2 py-0.5 rounded-full border',
          trend.positive
            ? 'text-green-300 border-green-500/30 bg-green-500/10'
            : 'text-red-300 border-red-500/30 bg-red-500/10',
        ].join(' ')}
      >
        {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
      </span>
    )

  return (
    <div className={`relative rounded-2xl p-4 bg-white/[0.03] border ${border} overflow-hidden`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/60">{title}</div>
          <div className="mt-1 text-2xl font-black text-white">{value}</div>
          {subtitle ? <div className="mt-1 text-xs text-white/60">{subtitle}</div> : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          {badge}
          <div className={`h-9 w-9 rounded-xl border ${border} bg-white/5 flex items-center justify-center text-sm`}>
            {icon ?? '•'}
          </div>
        </div>
      </div>
    </div>
  )
}