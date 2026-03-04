import { useMemo } from 'react'

type Point = { label: string; ca: number; marge: number } // en €

export function RevenueChart({ data }: { data: Point[] }) {
  const W = 780
  const H = 260
  const padL = 42
  const padR = 14
  const padT = 26
  const padB = 34

  const maxVal = useMemo(() => {
    let m = 0
    for (const p of data) m = Math.max(m, p.ca, p.marge)
    return Math.max(1, m)
  }, [data])

  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const groupW = data.length ? plotW / data.length : plotW
  const barW = Math.min(28, Math.max(14, groupW * 0.22))
  const gap = Math.min(10, Math.max(6, groupW * 0.08))
  const y = (v: number) => padT + (1 - v / maxVal) * plotH

  return (
    <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Chiffre d&apos;affaires &amp; marge</div>
          <div className="text-xs text-white/60 mt-1">6 derniers mois (d’après factures)</div>
        </div>

        <div className="flex items-center gap-4 text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-blue-400/90" />
            CA
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-green-400/90" />
            Marge
          </span>
        </div>
      </div>

      <div className="mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260">
          {Array.from({ length: 5 }).map((_, i) => {
            const yy = padT + (plotH * i) / 4
            return <line key={i} x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="rgba(255,255,255,0.08)" />
          })}

          {data.map((p, i) => {
            const cx = padL + i * groupW + groupW / 2
            const x1 = cx - barW - gap / 2
            const x2 = cx + gap / 2
            const caY = y(p.ca)
            const mgY = y(p.marge)

            return (
              <g key={`${p.label}-${i}`}>
                <rect x={x1} y={caY} width={barW} height={padT + plotH - caY} rx={6} fill="rgba(59,130,246,0.9)" />
                <rect x={x2} y={mgY} width={barW} height={padT + plotH - mgY} rx={6} fill="rgba(34,197,94,0.9)" />
                <text x={cx} y={H - 12} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.6)">
                  {p.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}