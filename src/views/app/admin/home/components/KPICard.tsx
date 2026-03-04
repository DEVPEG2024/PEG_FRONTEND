import React from 'react'

type Variant = 'default' | 'success' | 'warning' | 'danger'

type Props = {
  title: string
  value: string
  subtitle?: string
  icon?: string
  variant?: Variant
  onClick?: () => void
}

const ringByVariant = (v?: Variant) => {
  switch (v) {
    case 'success':
      return 'ring-1 ring-green-400/40'
    case 'warning':
      return 'ring-1 ring-amber-400/45'
    case 'danger':
      return 'ring-1 ring-red-400/45'
    default:
      return 'ring-1 ring-white/10'
  }
}

const iconBorderByVariant = (v?: Variant) => {
  switch (v) {
    case 'success':
      return 'border-green-400/40'
    case 'warning':
      return 'border-amber-400/45'
    case 'danger':
      return 'border-red-400/45'
    default:
      return 'border-white/10'
  }
}

export default function KPICard({ title, value, subtitle, icon, variant = 'default', onClick }: Props) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      className={[
        'relative rounded-2xl p-4 bg-white/[0.03] border border-white/10',
        'transition overflow-hidden',
        ringByVariant(variant),
        onClick ? 'cursor-pointer hover:bg-white/[0.05] hover:border-white/15' : '',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute -top-10 left-8 h-20 w-40 rounded-full bg-white/5 blur-2xl" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] tracking-wider uppercase text-white/60">{title}</div>
          <div className="mt-2 text-2xl font-extrabold text-white tracking-tight">{value}</div>
          {subtitle ? <div className="mt-1 text-[11px] text-white/45">{subtitle}</div> : null}
        </div>

        <div
          className={[
            'h-9 w-9 rounded-xl flex items-center justify-center',
            'bg-white/[0.04] border',
            iconBorderByVariant(variant),
            'text-sm text-white/80',
          ].join(' ')}
          title={title}
        >
          {icon ?? '•'}
        </div>
      </div>

      {onClick ? <div className="mt-3 text-[11px] text-white/45">Cliquer pour ouvrir →</div> : null}
    </div>
  )
}