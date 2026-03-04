export function PipelineFunnel({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const colors = [
    'bg-blue-500/80',
    'bg-sky-500/80',
    'bg-amber-500/80',
    'bg-green-500/80',
    'bg-purple-500/80',
  ]

  return (
    <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
      <div className="text-sm font-semibold text-white">Pipeline</div>
      <div className="text-xs text-white/60 mt-1">Répartition des projets par statut</div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-xs text-white/60">Aucune donnée.</div>
        ) : (
          items.slice(0, 10).map((it, idx) => {
            const pct = (it.value / max) * 100
            return (
              <div key={it.label} className="grid grid-cols-[140px_1fr_50px] gap-3 items-center">
                <div className="text-xs text-white/60 truncate">{it.label}</div>
                <div className="h-4 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                  <div className={`h-full ${colors[idx % colors.length]}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-white/60 text-right">{it.value}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}