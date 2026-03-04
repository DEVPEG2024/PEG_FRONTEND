import { Card } from '@/components/ui'
import { InvoiceStat } from '../store/dashboardSuperAdminSlice'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'

const paymentStateColor: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
}

const paymentStateText: Record<string, string> = {
  paid: 'Payée',
  pending: 'En attente',
  overdue: 'En retard',
  draft: 'Brouillon',
}

type InvoicesSummaryProps = {
  invoices: InvoiceStat[]
}

const InvoicesSummary = ({ invoices }: InvoicesSummaryProps) => {
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0)
  const paidRevenue = invoices
    .filter((inv) => inv.paymentState === 'paid')
    .reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0)
  const pendingRevenue = invoices
    .filter((inv) => inv.paymentState === 'pending')
    .reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0)

  const recent = invoices.slice(0, 5)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-semibold text-gray-800 dark:text-white">Facturation</h5>
        <Link
          to="/admin/invoices"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Voir tout →
        </Link>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-xs text-gray-400 mb-1">Total</p>
          <p className="text-base font-bold text-gray-800 dark:text-white">
            {totalRevenue.toLocaleString('fr-FR')} €
          </p>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <p className="text-xs text-green-500 mb-1">Encaissé</p>
          <p className="text-base font-bold text-green-600">
            {paidRevenue.toLocaleString('fr-FR')} €
          </p>
        </div>
        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <p className="text-xs text-yellow-500 mb-1">En attente</p>
          <p className="text-base font-bold text-yellow-600">
            {pendingRevenue.toLocaleString('fr-FR')} €
          </p>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="space-y-2">
        {recent.map((invoice) => (
          <div
            key={invoice.documentId}
            className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                {invoice.name}
              </p>
              <p className="text-xs text-gray-400">
                {invoice.customer?.name ?? '—'} ·{' '}
                {invoice.date ? dayjs(invoice.date).format('DD/MM/YYYY') : '—'}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentStateColor[invoice.paymentState] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {paymentStateText[invoice.paymentState] ?? invoice.paymentState}
              </span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">
                {invoice.totalAmount?.toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>
        ))}
        {recent.length === 0 && (
          <p className="text-center text-gray-400 py-4 text-sm">Aucune facture</p>
        )}
      </div>
    </Card>
  )
}

export default InvoicesSummary
