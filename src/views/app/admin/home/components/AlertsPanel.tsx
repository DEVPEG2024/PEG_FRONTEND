export function AlertsPanel({
  alerts,
}: {
  alerts: { level: 'danger' | 'warning' | 'info'; title: string; detail?: string }[]
}) {
  const dot = (level: string) =>
    level === 'danger' ? 'bg-red-400' : level === 'warning' ? 'bg-amber-400' : 'bg-sky-400'

  return (
    <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
      <h3 className="text-sm font-semibold text-white mb-3">Alertes</h3>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-xs text-white/60">Aucune alerte.</div>
        ) : (
          alerts.slice(0, 8).map((a, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <div className={`h-2 w-2 rounded-full mt-1.5 ${dot(a.level)} shrink-0`} />
              <div className="min-w-0">
                <div className="text-white">{a.title}</div>
                {a.detail ? <div className="text-white/60 truncate">{a.detail}</div> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}