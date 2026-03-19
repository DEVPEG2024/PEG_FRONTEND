import { HiShoppingCart, HiPencil, HiArrowDownTray } from 'react-icons/hi2'

interface ChatActionsProps {
    onOrder: () => void
    onModify: () => void
    onDownloadPDF: () => void
    hasQuote: boolean
}

export default function ChatActions({ onOrder, onModify, onDownloadPDF, hasQuote }: ChatActionsProps) {
    if (!hasQuote) return null

    return (
        <div className="flex flex-wrap gap-2">
            <button onClick={onOrder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                <HiShoppingCart className="w-3.5 h-3.5" /> Commander
            </button>
            <button onClick={onModify}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors">
                <HiPencil className="w-3.5 h-3.5" /> Modifier
            </button>
            <button onClick={onDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors">
                <HiArrowDownTray className="w-3.5 h-3.5" /> PDF
            </button>
        </div>
    )
}
