import { HiClock, HiTruck } from 'react-icons/hi2'
import { PLACEMENT_LABELS } from '@/lib/printai/pricingEngine'
import type { Quote } from '@/lib/printai/pricingEngine'

interface QuoteDisplayProps {
    quote: Quote
    productName?: string
    placements?: string[]
}

function Row({ label, value, muted, icon }: { label: string; value: string; muted?: boolean; icon?: React.ReactNode }) {
    return (
        <div className={`flex justify-between ${muted ? 'text-gray-500 text-xs' : 'text-gray-300'}`}>
            <span className="flex items-center gap-1">{icon}{label}</span>
            <span>{value}</span>
        </div>
    )
}

export default function QuoteDisplay({ quote, productName, placements }: QuoteDisplayProps) {
    if (!quote) return null

    const tvaPercent = Math.round((quote.tvaRate || 0.20) * 100)

    return (
        <div className="border border-gray-700 rounded-xl p-4 space-y-3 bg-gray-800/50">
            <h3 className="text-sm font-medium text-gray-100">Récapitulatif du devis</h3>

            <div className="space-y-1.5 text-[13px]">
                <Row label={`${productName} × ${quote.quantity}`} value={`${quote.productTotal.toFixed(2)} €`} />
                <Row label="Prix unitaire" value={`${quote.unitPrice.toFixed(2)} €`} muted />

                {quote.extraPlacementCost > 0 && (
                    <Row label={`Emplacements suppl. (${placements?.length || 0})`} value={`+${quote.extraPlacementCost.toFixed(2)} €`} />
                )}
                {quote.setupFee > 0 && (
                    <Row label="Frais de setup" value={`${quote.setupFee.toFixed(2)} €`} />
                )}
                <Row label="Livraison" value={quote.shippingCost === 0 ? 'Gratuit' : `${quote.shippingCost.toFixed(2)} €`} icon={<HiTruck className="w-3 h-3" />} />

                <div className="border-t border-gray-700 pt-2 mt-2 space-y-1">
                    <Row label="Total HT" value={`${quote.totalHT.toFixed(2)} €`} muted />
                    <Row label={`TVA (${tvaPercent}%)`} value={`${quote.tva.toFixed(2)} €`} muted />
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-white font-medium">Total TTC</span>
                        <span className="text-lg font-semibold text-white">{quote.totalTTC.toFixed(2)} €</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 text-gray-400 text-xs pt-1">
                    <HiClock className="w-3 h-3" />
                    <span>{quote.estimatedDelay}</span>
                </div>

                {placements && placements.length > 0 && (
                    <div className="text-xs text-gray-500 pt-0.5">
                        {placements.map(p => PLACEMENT_LABELS[p] || p).join(' · ')}
                    </div>
                )}
            </div>
        </div>
    )
}
