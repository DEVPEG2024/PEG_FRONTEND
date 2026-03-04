import React from 'react'

type Row = { name: string; projects: number; revenue: number }

type Props = {
  title?: string
  subtitle?: string
  rows: Row[]
}

function eur(n: number) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${Math.round(n)} €`
  }
}

export default function SupplierRanking({ title = 'Top producteurs', subtitle, rows }: Props) {
  return (
    <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle ? <div className="text-[11px] text-white/55 mt-1">{subtitle}</div> : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-white/60">Aucun producteur.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div key={idx} className="rounded-xl p-3 border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-white truncate">
                    <span className="text-white/50 mr-2">#{idx + 1}</span>
                    {r.name}
                  </div>
                  <div className="text-[11px] text-white/55 mt-1">{r.projects} projet(s)</div>
                </div>

                <div className="text-xs text-white/70 tabular-nums">{eur(r.revenue)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}