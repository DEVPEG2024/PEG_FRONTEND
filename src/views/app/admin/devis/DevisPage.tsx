import { useState, useRef, useEffect, useCallback } from 'react'
import { HiArrowUp, HiArrowUpTray, HiSparkles } from 'react-icons/hi2'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { toast } from 'react-toastify'
import MessageBubble from './components/MessageBubble'
import QuoteDisplay from './components/QuoteDisplay'
import ChatActions from './components/ChatActions'
import DeliveryForm from './components/DeliveryForm'
import type { DeliveryInfo } from './components/DeliveryForm'
import { apiPrintAIChat, apiPrintAIGetPricing, apiPrintAIGetCompany, apiPrintAICreateOrder } from '@/services/PrintAIService'
import type { PrintAIPricing, PrintAICompany } from '@/services/PrintAIService'
import { calculateQuote, findBestProduct, SHIPPING_OPTIONS } from '@/lib/printai/pricingEngine'
import type { Quote } from '@/lib/printai/pricingEngine'
import { CHAT_SYSTEM_PROMPT } from '@/lib/printai/systemPrompts'

interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
    image?: string
}

interface OrderState {
    product: string
    quantity: number
    color: string
    placements: string[]
    technique: string
    logo_url?: string | null
}

interface OrderData {
    produit: string
    quantite: number
    couleur: string
    emplacements: string[]
    technique: string
}

const VALID_PLACEMENTS = ['coeur_gauche', 'dos', 'manche_gauche', 'manche_droite', 'face', 'centre']
const VALID_TECHNIQUES = ['sérigraphie', 'broderie', 'transfert', 'impression_numérique']

function validateOrderData(data: Record<string, unknown>): OrderData | null {
    if (!data || typeof data !== 'object') return null
    const produit = typeof data.produit === 'string' ? data.produit.trim() : ''
    const quantite = Number(data.quantite)
    if (!produit || !Number.isFinite(quantite) || quantite <= 0) return null

    const emplacements = Array.isArray(data.emplacements)
        ? (data.emplacements as string[]).filter(e => VALID_PLACEMENTS.includes(e))
        : ['face']

    const technique = VALID_TECHNIQUES.includes(data.technique as string) ? (data.technique as string) : 'sérigraphie'

    return {
        produit,
        quantite: Math.round(quantite),
        couleur: typeof data.couleur === 'string' ? data.couleur.trim() || 'blanc' : 'blanc',
        emplacements: emplacements.length > 0 ? emplacements : ['face'],
        technique,
    }
}

export default function DevisPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Bonjour ! Je suis votre assistant **PrintAI Studio**.\n\nDécrivez votre projet de personnalisation textile et je vous prépare un devis instantané.\n\n> *Ex : "100 t-shirts noirs avec notre logo en cœur gauche et dos"*',
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [currentQuote, setCurrentQuote] = useState<Quote | null>(null)
    const [currentOrder, setCurrentOrder] = useState<OrderState | null>(null)
    const [shipping, setShipping] = useState('france_j2')
    const [showDeliveryForm, setShowDeliveryForm] = useState(false)
    const [orderLoading, setOrderLoading] = useState(false)
    const [pricingData, setPricingData] = useState<PrintAIPricing[]>([])
    const [company, setCompany] = useState<PrintAICompany | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load pricing + company on mount
    useEffect(() => {
        apiPrintAIGetPricing()
            .then(res => setPricingData(res.data))
            .catch(() => toast.error('Erreur chargement tarifs'))

        apiPrintAIGetCompany()
            .then(res => {
                const list = res.data
                if (Array.isArray(list) && list.length > 0) setCompany(list[0])
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, showDeliveryForm])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            toast.warning('Max 5 Mo')
            return
        }

        // Convert to data URL for display
        const reader = new FileReader()
        reader.onload = () => {
            const url = reader.result as string
            setLogoUrl(url)
            setMessages(prev => [...prev, { role: 'user', content: 'Logo uploadé', image: url }])
            toast.success('Logo chargé')
        }
        reader.readAsDataURL(file)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const processAIResponse = useCallback((text: string): OrderData | null => {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
        if (!jsonMatch) return null
        try {
            return validateOrderData(JSON.parse(jsonMatch[1]))
        } catch {
            return null
        }
    }, [])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return
        const userMessage: ChatMessage = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const conversationHistory = messages
                .filter(m => m.role !== 'system')
                .map(m => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.content}`)
                .join('\n')

            const prompt = `${CHAT_SYSTEM_PROMPT}\n\nHistorique:\n${conversationHistory}\n\nClient: ${input}\n\nRéponds en analysant la demande. Si c'est une commande, fournis le JSON.`
            const res = await apiPrintAIChat(prompt)
            const aiText = res.data.text
            const orderData = processAIResponse(aiText)
            const cleanResponse = aiText.replace(/```json[\s\S]*?```/g, '').trim()
            setMessages(prev => [...prev, { role: 'assistant', content: cleanResponse }])

            if (orderData && pricingData.length > 0) {
                const pricing = findBestProduct(pricingData, orderData.produit)
                if (pricing) {
                    const tvaRate = company?.tva_rate || 0.20
                    const quote = calculateQuote(pricing, orderData.quantite, orderData.emplacements.length, shipping, tvaRate)
                    if (quote) {
                        setCurrentQuote(quote)
                        setCurrentOrder({
                            product: pricing.product_name,
                            quantity: orderData.quantite,
                            color: orderData.couleur,
                            placements: orderData.emplacements,
                            technique: orderData.technique,
                            logo_url: logoUrl,
                        })
                    }
                } else {
                    toast.info('Produit non trouvé dans le catalogue')
                }
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue. Veuillez réessayer.' }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleOrder = () => {
        setShowDeliveryForm(true)
    }

    const handleDeliverySubmit = async (deliveryInfo: DeliveryInfo) => {
        if (!currentOrder || !currentQuote) return
        setOrderLoading(true)

        try {
            await apiPrintAICreateOrder({
                product: currentOrder.product,
                quantity: currentOrder.quantity,
                color: currentOrder.color,
                placements: currentOrder.placements,
                technique: currentOrder.technique,
                logo_url: logoUrl,
                client_name: deliveryInfo.name,
                client_email: deliveryInfo.email,
                client_phone: deliveryInfo.phone,
                client_company: deliveryInfo.company,
                client_address: `${deliveryInfo.address}, ${deliveryInfo.zip} ${deliveryInfo.city}`,
                delivery_notes: deliveryInfo.notes,
                unit_price: currentQuote.unitPrice,
                setup_fee: currentQuote.setupFee,
                shipping_cost: currentQuote.shippingCost,
                shipping_method: shipping,
                total_ht: currentQuote.totalHT,
                total_ttc: currentQuote.totalTTC,
                estimated_delay: currentQuote.estimatedDelay,
                status: 'en_attente',
                conversation: JSON.stringify(messages.map(m => ({ role: m.role, content: m.content }))),
            })

            setShowDeliveryForm(false)
            toast.success('Commande enregistrée')
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Merci **${deliveryInfo.name}** ! Votre commande a été enregistrée. Nous vous recontacterons à **${deliveryInfo.email}** sous 24h pour la validation.`,
            }])
        } catch {
            toast.error("Erreur lors de l'enregistrement")
        } finally {
            setOrderLoading(false)
        }
    }

    const handleModify = () => {
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Que souhaitez-vous modifier ? (quantité, couleur, emplacement, produit…)',
        }])
    }

    const handleDownloadPDF = async () => {
        if (!currentOrder || !currentQuote) return
        try {
            const { default: jsPDF } = await import('jspdf')
            const doc = new jsPDF()

            doc.setFontSize(20)
            doc.text('DEVIS - PrintAI Studio', 20, 25)

            doc.setFontSize(10)
            doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 35)

            doc.setFontSize(12)
            doc.text('Détails de la commande', 20, 50)
            doc.setFontSize(10)
            doc.text(`Produit: ${currentOrder.product}`, 20, 60)
            doc.text(`Quantité: ${currentOrder.quantity}`, 20, 67)
            doc.text(`Couleur: ${currentOrder.color}`, 20, 74)
            doc.text(`Technique: ${currentOrder.technique}`, 20, 81)
            doc.text(`Emplacements: ${currentOrder.placements.join(', ')}`, 20, 88)

            doc.setFontSize(12)
            doc.text('Tarification', 20, 105)
            doc.setFontSize(10)
            doc.text(`Prix unitaire: ${currentQuote.unitPrice.toFixed(2)} €`, 20, 115)
            doc.text(`Sous-total produit: ${currentQuote.productTotal.toFixed(2)} €`, 20, 122)
            if (currentQuote.extraPlacementCost > 0) {
                doc.text(`Emplacements suppl.: ${currentQuote.extraPlacementCost.toFixed(2)} €`, 20, 129)
            }
            doc.text(`Frais de setup: ${currentQuote.setupFee.toFixed(2)} €`, 20, 136)
            doc.text(`Livraison: ${currentQuote.shippingCost.toFixed(2)} €`, 20, 143)

            doc.line(20, 150, 190, 150)
            doc.text(`Total HT: ${currentQuote.totalHT.toFixed(2)} €`, 20, 157)
            doc.text(`TVA (${Math.round(currentQuote.tvaRate * 100)}%): ${currentQuote.tva.toFixed(2)} €`, 20, 164)
            doc.setFontSize(14)
            doc.text(`Total TTC: ${currentQuote.totalTTC.toFixed(2)} €`, 20, 175)

            doc.setFontSize(9)
            doc.text(`Délai estimé: ${currentQuote.estimatedDelay}`, 20, 190)

            doc.save(`devis-printai-${Date.now()}.pdf`)
            toast.success('PDF téléchargé')
        } catch {
            toast.error('Erreur PDF')
        }
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2.5">
                    <HiSparkles className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Devis IA — PrintAI Studio</span>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={shipping}
                        onChange={(e) => {
                            setShipping(e.target.value)
                            // Recalculate quote with new shipping if we have an order
                            if (currentOrder && pricingData.length > 0) {
                                const pricing = findBestProduct(pricingData, currentOrder.product)
                                if (pricing) {
                                    const tvaRate = company?.tva_rate || 0.20
                                    const quote = calculateQuote(pricing, currentOrder.quantity, currentOrder.placements.length, e.target.value, tvaRate)
                                    if (quote) setCurrentQuote(quote)
                                }
                            }
                        }}
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 focus:outline-none focus:border-indigo-500"
                    >
                        {SHIPPING_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label} — {opt.price}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                    {messages.map((msg, i) => (
                        <MessageBubble key={i} message={msg} />
                    ))}

                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-indigo-500/15 flex items-center justify-center">
                                <AiOutlineLoading3Quarters className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            </div>
                            <div className="text-sm text-gray-400 py-2">Réflexion en cours…</div>
                        </div>
                    )}

                    {currentQuote && !showDeliveryForm && (
                        <div className="space-y-3">
                            <QuoteDisplay
                                quote={currentQuote}
                                productName={currentOrder?.product}
                                placements={currentOrder?.placements}
                            />
                            <ChatActions
                                hasQuote={!!currentQuote}
                                onOrder={handleOrder}
                                onModify={handleModify}
                                onDownloadPDF={handleDownloadPDF}
                            />
                        </div>
                    )}

                    {showDeliveryForm && (
                        <DeliveryForm
                            onSubmit={handleDeliverySubmit}
                            onCancel={() => setShowDeliveryForm(false)}
                            isLoading={orderLoading}
                        />
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input bar */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 focus-within:border-indigo-500 transition-colors">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            title="Uploader un logo"
                        >
                            <HiArrowUpTray className="w-4 h-4" />
                        </button>
                        <input ref={fileInputRef} type="file" accept=".png,.svg,.pdf,.jpg,.jpeg" className="hidden" onChange={handleUpload} />
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Décrivez votre commande..."
                            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <HiArrowUp className="w-4 h-4" />
                        </button>
                    </div>
                    {logoUrl && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-gray-400">
                            <img src={logoUrl} alt="" className="w-4 h-4 rounded object-contain" />
                            Logo chargé
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
