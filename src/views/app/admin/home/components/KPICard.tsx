import React from 'react'

type Variant = 'default' | 'success' | 'warning' | 'danger'

type Props = {
  title: string
  value: string
  subtitle?: string
  icon?: React.ReactNode
  variant?: Variant
  onClick?: () => void
}

const variantBorder = (variant?: Variant) => {
  switch (variant) {
    case 'success':
      return 'border-green-500/30'
    case 'warning':
      return 'border-amber-500/30'
    case 'danger':
      return 'border-red-500/30'
    default:
      return 'border-white/10'
  }
}

const variantRing = (variant?: Variant) => {
  switch (variant) {
    case 'success':
      return 'ring-green-400/30'
    case 'warning':
      return 'ring-amber-400/30'
    case 'danger':
      return 'ring-red-400/30'
    default:
      return 'ring-white/10'
  }
}

export const KPICard = ({ title, value, subtitle, icon, variant = 'default', onClick }: Props) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      className={[
        'relative rounded-2xl p-4 bg-white/[0.03]',
        'border',
        variantBorder(variant),
        onClick ? 'cursor-pointer hover:bg-white/[0.05] transition' : '',
        onClick ? 'focus:outline-none focus:ring-2' : '',
        onClick ? variantRing(variant) : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-white/60">{title}</div>
          <div className="mt-2 text-2xl font-extrabold text-white">{value}</div>
          {subtitle ? <div className="mt-1 text-xs text-white/50">{subtitle}</div> : null}
        </div>

        <div className="shrink-0">
          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            {icon ?? '•'}
          </div>
        </div>
      </div>
    </div>
  )
}