import React, { useMemo } from 'react'

type Item = { label: string; value: number }

type Props = {
  title?: string
  subtitle?: string
  items: Item[]
  onItemClick?: (label: string) => void
}

const colorForIndex = (i: number) => {
  const palette = [
    'rgba(59,130,246,0.95)',
    'rgba(56,189,248,0.95)',
    'rgba(245,158,11,0.95)',
    'rgba(34,197,94,0.95)',
    'rgba(168,85,247,0.95)',
    'rgba(239,68,68,0.95)',
  ]
  return palette[i % palette.length]
}

export default function PipelineFunnel({ title = 'Pipeline', subtitle, items, onItemClick }: Props) {
  const max = useMemo(() => Math.max(...items.map((i) => i.value), 1), [items])

  return (
    <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle ? <div className="text-[11px] text-white/55 mt-1">{subtitle}</div> : null}
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-xs text-white/60">Aucune donnée (pipeline)</div>
        ) : (
          items.map((it, idx) => {
            const pct = Math.round((it.value / max) * 100)
            return (
              <button
                key={it.label}
                onClick={() => onItemClick?.(it.label)}
                className="w-full text-left rounded-xl p-2 hover:bg-white/5 transition"
                title="Cliquer pour ouvrir les projets"
              >
                <div className="grid grid-cols-[140px_1fr_28px] items-center gap-3">
                  <div className="text-xs text-white/70 truncate">{it.label}</div>
                  <div className="h-3 rounded-full bg-white/[0.05] border border-white/10 overflow-hidden">
                    <div style={{ width: `${pct}%`, height: '100%', background: colorForIndex(idx) }} />
                  </div>
                  <div className="text-xs text-white/55 text-right">{it.value}</div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}