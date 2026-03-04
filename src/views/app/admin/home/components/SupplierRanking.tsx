export function SupplierRanking({
  title = 'Top producteurs',
  rows,
}: {
  title?: string
  rows: { name: string; projects: number; revenue: number }[]
}) {
  return (
    <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="text-xs text-white/60 mt-1">Basé sur les projets (top 6)</div>

      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <div className="text-xs text-white/60">Aucune donnée.</div>
        ) : (
          rows.slice(0, 6).map((r, i) => (
            <div key={`${r.name}-${i}`} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-white truncate">
                  <span className="text-white/60 mr-2">#{i + 1}</span>
                  {r.name}
                </div>
                <div className="text-[11px] text-white/50">{r.projects} projets</div>
              </div>
              <div className="text-xs text-white/70 tabular-nums">{Math.round(r.revenue)} €</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}