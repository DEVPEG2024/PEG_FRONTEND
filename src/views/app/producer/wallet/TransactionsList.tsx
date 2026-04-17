import { Container, Loading } from '@/components/shared'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui'
import {
  injectReducer,
  useAppDispatch,
  useAppSelector as useRootAppSelector,
  RootState,
} from '@/store'
import reducer, { getOwnTransactions, useAppSelector } from './store'
import { User } from '@/@types/user'
import { Transaction } from '@/@types/transaction'
import { paymentAddTypes, paymentRemoveTypes, paymentTypes } from './constants'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import { fmtEur, fmtPrice } from '@/utils/priceHelpers'
dayjs.locale('fr')

injectReducer('transactions', reducer)

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function Sparkline({
  data,
  color = '#38bdf8',
  fill = false,
}: {
  data: number[]
  color?: string
  fill?: boolean
}) {
  if (data.length < 2) return <div className="h-12 w-full" />
  const W = 300, H = 52, pad = 4
  const max = Math.max(...data, 1)
  const xs = data.map((_, i) => pad + (i / (data.length - 1)) * (W - pad * 2))
  const ys = data.map((v) => H - pad - (v / max) * (H - pad * 2))
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ')
  const area = [
    `${xs[0]},${H - pad}`,
    ...xs.map((x, i) => `${x},${ys[i]}`),
    `${xs[xs.length - 1]},${H - pad}`,
  ].join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="52" preserveAspectRatio="none">
      {fill && <polygon points={area} fill={color} opacity="0.12" />}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={color} />
    </svg>
  )
}

function TxIcon({ isAdd }: { isAdd: boolean }) {
  return (
    <div
      className={[
        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base font-black',
        isAdd ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400',
      ].join(' ')}
    >
      {isAdd ? '↑' : '↓'}
    </div>
  )
}

const ADD_VALUES = paymentAddTypes.map((x) => x.value)

const TransactionsList = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  )
  const { amount, transactions, total, loading } = useAppSelector(
    (state) => state.transactions.data
  )

  useEffect(() => {
    dispatch(
      getOwnTransactions({
        request: { pagination: { page: 1, pageSize: 200 }, searchTerm: '' },
        user,
      })
    )
  }, [])

  const sorted = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [transactions]
  )

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (t) =>
        t.project?.name?.toLowerCase().includes(q) ||
        (paymentTypes.find((p) => p.value === t.type)?.label ?? '')
          .toLowerCase()
          .includes(q)
    )
  }, [sorted, searchTerm])

  const totalReceived = useMemo(
    () =>
      transactions
        .filter((t) => ADD_VALUES.includes(t.type))
        .reduce((a, t) => a + t.amount, 0),
    [transactions]
  )

  const totalWithdrawn = useMemo(
    () =>
      transactions
        .filter((t) => !ADD_VALUES.includes(t.type))
        .reduce((a, t) => a + t.amount, 0),
    [transactions]
  )

  const currentMonthIncome = useMemo(() => {
    const thisMonth = monthKey(new Date())
    return transactions
      .filter(
        (t) =>
          ADD_VALUES.includes(t.type) &&
          monthKey(new Date(t.date)) === thisMonth
      )
      .reduce((a, t) => a + t.amount, 0)
  }, [transactions])

  const sparkline = useMemo(() => {
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(monthKey(d))
    }
    const by: Record<string, number> = {}
    months.forEach((k) => (by[k] = 0))
    transactions.forEach((t) => {
      if (!ADD_VALUES.includes(t.type)) return
      const k = monthKey(new Date(t.date))
      if (k in by) by[k] += t.amount
    })
    return {
      values: months.map((k) => by[k]),
      labels: months.map((k) => MONTH_LABELS[parseInt(k.split('-')[1]) - 1]),
    }
  }, [transactions])

  const byType = useMemo(() => {
    const m: Record<string, number> = {}
    transactions.forEach((t) => {
      m[t.type] = (m[t.type] ?? 0) + t.amount
    })
    return Object.entries(m)
      .map(([type, tot]) => ({
        type,
        label: paymentTypes.find((p) => p.value === type)?.label ?? type,
        total: tot,
        isAdd: ADD_VALUES.includes(type),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [transactions])
  const maxByType = Math.max(...byType.map((t) => t.total), 1)

  return (
    <Container>
      <div className="space-y-6">

        {/* ══ HERO CARD ══ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-500 to-emerald-500 p-6 shadow-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.18)_0%,_transparent_65%)]" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/65">
                Solde disponible
              </div>
              <div className="text-5xl font-extrabold tracking-tight text-white tabular-nums">
                {fmtEur(amount)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-sm text-white/55">
                  {total} transaction{total !== 1 ? 's' : ''}
                </span>
                {currentMonthIncome > 0 && (
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
                    +{fmtEur(currentMonthIncome)} ce mois
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-4">
              <button
                onClick={() =>
                  alert(
                    'Fonctionnalité à venir — votre gestionnaire sera notifié par email.'
                  )
                }
                className="rounded-xl border border-white/30 bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                Demander un retrait →
              </button>
              <div className="w-52">
                <Sparkline data={sparkline.values} color="rgba(255,255,255,0.85)" fill />
                <div className="mt-1 flex justify-between">
                  {sparkline.labels.map((l, i) => (
                    <span key={i} className="text-[9px] text-white/45">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ KPI CARDS ══ */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(
            [
              {
                label: 'Total encaissé',
                value: fmtEur(totalReceived),
                color: 'text-emerald-400',
                glow: 'from-emerald-500/12 to-emerald-500/0',
                ring: 'ring-1 ring-emerald-400/20',
                icon: '↑',
                iconBg: 'bg-emerald-500/15 text-emerald-400',
              },
              {
                label: 'Total retraits',
                value: fmtEur(totalWithdrawn),
                color: 'text-rose-400',
                glow: 'from-rose-500/12 to-rose-500/0',
                ring: 'ring-1 ring-rose-400/20',
                icon: '↓',
                iconBg: 'bg-rose-500/15 text-rose-400',
              },
              {
                label: 'Transactions',
                value: String(total),
                color: 'text-sky-300',
                glow: 'from-sky-500/12 to-sky-500/0',
                ring: 'ring-1 ring-sky-400/20',
                icon: '≡',
                iconBg: 'bg-sky-500/15 text-sky-400',
              },
              {
                label: 'Ce mois-ci',
                value: fmtEur(currentMonthIncome),
                color: 'text-amber-300',
                glow: 'from-amber-500/12 to-amber-500/0',
                ring: 'ring-1 ring-amber-400/20',
                icon: '◈',
                iconBg: 'bg-amber-500/15 text-amber-400',
              },
            ] as const
          ).map((stat) => (
            <div
              key={stat.label}
              className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 ${stat.ring}`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${stat.glow}`}
              />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-white/45">
                    {stat.label}
                  </div>
                  <div className={`text-xl font-extrabold ${stat.color}`}>
                    {stat.value}
                  </div>
                </div>
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-base font-black ${stat.iconBg}`}
                >
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ══ MAIN CONTENT ══ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Transaction feed */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Historique</div>
                <div className="text-xs text-white/40">
                  {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <Input
                placeholder="Rechercher un projet, un type…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Loading loading={loading}>
              <div className="max-h-[540px] space-y-0.5 overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-sm text-white/30">
                    Aucune transaction
                  </div>
                ) : (
                  filtered.map((tx: Transaction) => {
                    const isAdd = ADD_VALUES.includes(tx.type)
                    const typeLabel =
                      paymentTypes.find((p) => p.value === tx.type)?.label ??
                      tx.type
                    return (
                      <div
                        key={tx.documentId}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]"
                      >
                        <TxIcon isAdd={isAdd} />

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white/90">
                            {typeLabel}
                          </div>
                          {tx.project?.name && (
                            <button
                              onClick={() =>
                                navigate(
                                  `/common/projects/details/${tx.project?.documentId}`
                                )
                              }
                              className="max-w-full truncate text-left text-xs text-sky-400/75 transition hover:text-sky-300"
                            >
                              {tx.project.name} →
                            </button>
                          )}
                          {tx.description && (
                            <div className="truncate text-[11px] text-white/35">
                              {tx.description}
                            </div>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <div
                            className={`text-sm font-bold ${
                              isAdd ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isAdd ? '+' : '−'}
                            {fmtPrice(tx.amount)}
                          </div>
                          <div className="text-[10px] text-white/35">
                            {dayjs(tx.date).format('DD/MM/YY')}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Loading>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Répartition par type */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-4 text-sm font-semibold text-white">
                Répartition par type
              </div>
              <div className="space-y-3">
                {byType.length === 0 ? (
                  <div className="text-xs text-white/30">Aucune donnée</div>
                ) : (
                  byType.map((item) => (
                    <div key={item.type}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="truncate text-xs text-white/60">
                          {item.label}
                        </span>
                        <span className="ml-2 flex-shrink-0 text-xs text-white/45">
                          {fmtEur(item.total)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full ${
                            item.isAdd ? 'bg-emerald-400/80' : 'bg-rose-400/80'
                          }`}
                          style={{
                            width: `${Math.round(
                              (item.total / maxByType) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Revenus 6 mois */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-0.5 text-sm font-semibold text-white">
                Revenus (6 mois)
              </div>
              <div className="mb-3 text-xs text-white/40">
                Encaissements uniquement
              </div>
              <Sparkline data={sparkline.values} color="#38bdf8" fill />
              <div className="mt-2 flex justify-between">
                {sparkline.labels.map((l, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[9px] text-white/35">{l}</div>
                    {sparkline.values[i] > 0 && (
                      <div className="text-[9px] font-semibold text-sky-400/70">
                        {sparkline.values[i] >= 1000
                          ? `${(sparkline.values[i] / 1000).toFixed(1)}k`
                          : Math.round(sparkline.values[i])}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bilan */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 text-sm font-semibold text-white">Bilan</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">Encaissé</span>
                  <span className="font-semibold text-emerald-400">
                    +{fmtEur(totalReceived)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/55">Retraits</span>
                  <span className="font-semibold text-rose-400">
                    −{fmtEur(totalWithdrawn)}
                  </span>
                </div>
                <div className="my-2 border-t border-white/10" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">Solde net</span>
                  <span className="font-extrabold text-white">{fmtEur(amount)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Container>
  )
}

export default TransactionsList
