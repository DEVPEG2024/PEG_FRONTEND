import React from 'react'

type AlertItem = {
  level: 'danger' | 'warning' | 'info'
  title: string
  detail?: string
  to?: string
}

type Props = {
  title?: string
  items: AlertItem[]
  onItemClick?: (to?: string) => void
}

const dot = (lvl: AlertItem['level']) => {
  if (lvl === 'danger') return 'bg-red-400'
  if (lvl === 'warning') return 'bg-amber-400'
  return 'bg-blue-400'
}

export default function AlertsPanel({ title = 'Alertes', items, onItemClick }: Props) {
  return (
    <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-[11px] text-white/50">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-white/60">Aucune alerte.</div>
      ) : (
        <div className="space-y-2">
          {items.map((a, idx) => (
            <button
              key={idx}
              onClick={() => onItemClick?.(a.to)}
              className="w-full text-left rounded-xl p-3 hover:bg-white/5 transition"
            >
              <div className="flex items-start gap-2">
                <div className={`h-2 w-2 rounded-full mt-1.5 ${dot(a.level)}`} />
                <div className="min-w-0">
                  <div className="text-xs text-white">{a.title}</div>
                  {a.detail ? <div className="text-[11px] text-white/55 mt-1">{a.detail}</div> : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}