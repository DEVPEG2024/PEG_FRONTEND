import type { PrintAIPricing } from '@/services/PrintAIService'

// Calcul du prix selon la grille tarifaire
export function calculateUnitPrice(pricing: PrintAIPricing, quantity: number): number {
  const tiers = [
    { min: pricing.tier1_min, max: pricing.tier1_max, price: pricing.tier1_price },
    { min: pricing.tier2_min, max: pricing.tier2_max, price: pricing.tier2_price },
    { min: pricing.tier3_min, max: pricing.tier3_max, price: pricing.tier3_price },
    { min: pricing.tier4_min, max: pricing.tier4_max, price: pricing.tier4_price },
    { min: pricing.tier5_min, max: pricing.tier5_max, price: pricing.tier5_price },
  ].filter(t => t.min != null && t.max != null && t.price != null)

  if (tiers.length === 0) return 0

  for (const tier of tiers) {
    if (quantity >= tier.min && quantity <= tier.max) {
      return tier.price
    }
  }

  if (quantity < tiers[0].min) {
    return tiers[0].price
  }

  return tiers[tiers.length - 1].price
}

export interface Quote {
  unitPrice: number
  quantity: number
  productTotal: number
  extraPlacementCost: number
  setupFee: number
  shippingCost: number
  shippingMethod: string
  totalHT: number
  tva: number
  tvaRate: number
  totalTTC: number
  estimatedDelay: string
}

const SHIPPING_COSTS: Record<string, number> = {
  france_j2: 8.90,
  france_express: 18.00,
  europe: 22.00,
  retrait: 0,
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function calculateQuote(
  pricing: PrintAIPricing,
  quantity: number,
  placementCount = 1,
  shippingMethod = 'france_j2',
  tvaRate = 0.20
): Quote | null {
  if (!pricing || !quantity || quantity <= 0) {
    return null
  }

  const unitPrice = calculateUnitPrice(pricing, quantity)
  const extraPlacements = Math.max(0, placementCount - 1)

  const productTotal = unitPrice * quantity
  const extraPlacementCost = extraPlacements * (pricing.extra_placement_unit || 1.5) * quantity
  const setupFee = (pricing.setup_fee || 0) + extraPlacements * (pricing.extra_placement_setup || 20)

  const shippingCost = SHIPPING_COSTS[shippingMethod] ?? SHIPPING_COSTS.france_j2

  const totalHT = productTotal + extraPlacementCost + setupFee + shippingCost
  const tva = totalHT * tvaRate
  const totalTTC = totalHT + tva

  const delays: Record<string, string> = {
    france_j2: '3-5 jours ouvrés',
    france_express: '1-2 jours ouvrés',
    europe: '5-7 jours ouvrés',
    retrait: '2-3 jours ouvrés',
  }

  return {
    unitPrice,
    quantity,
    productTotal: round2(productTotal),
    extraPlacementCost: round2(extraPlacementCost),
    setupFee: round2(setupFee),
    shippingCost: round2(shippingCost),
    shippingMethod,
    totalHT: round2(totalHT),
    tva: round2(tva),
    tvaRate,
    totalTTC: round2(totalTTC),
    estimatedDelay: delays[shippingMethod] || '3-5 jours ouvrés',
  }
}

export function findBestProduct(pricingList: PrintAIPricing[], searchTerm: string): PrintAIPricing | null {
  if (!searchTerm || !pricingList?.length) return null

  const term = searchTerm.toLowerCase().trim()

  const direct = pricingList.find(p => p.product_name.toLowerCase() === term)
  if (direct) return direct

  const partial = pricingList.find(p =>
    term.includes(p.product_name.toLowerCase()) ||
    p.product_name.toLowerCase().includes(term)
  )
  if (partial) return partial

  const keywords: Record<string, string[]> = {
    'tshirt': ['t-shirt', 'tee-shirt', 'tee shirt', 'teeshirt'],
    'sweat': ['sweatshirt', 'hoodie', 'pull', 'sweat-shirt'],
    'casquette': ['cap', 'casquette', 'chapeau'],
    'bonnet': ['bonnet', 'beanie'],
    'tote': ['tote', 'sac coton', 'sac tissu'],
    'sac': ['sac à dos', 'backpack'],
    'stylo': ['stylo', 'pen', 'crayon'],
    'mug': ['mug', 'tasse'],
    'carnet': ['carnet', 'notebook', 'cahier'],
    'clé usb': ['clé usb', 'usb', 'clef usb'],
  }

  for (const [key, aliases] of Object.entries(keywords)) {
    if (aliases.some(a => term.includes(a)) || term.includes(key)) {
      const match = pricingList.find(p =>
        p.product_name.toLowerCase().includes(key)
      )
      if (match) return match
    }
  }

  return null
}

export const SHIPPING_OPTIONS = [
  { value: 'france_j2', label: 'France J+2', price: '8,90 €', delay: '3-5 jours' },
  { value: 'france_express', label: 'France Express J+1', price: '18,00 €', delay: '1-2 jours' },
  { value: 'europe', label: 'Europe 3-5j', price: '22,00 €', delay: '5-7 jours' },
  { value: 'retrait', label: 'Retrait atelier', price: 'Gratuit', delay: '2-3 jours' },
]

export const PLACEMENT_LABELS: Record<string, string> = {
  'coeur_gauche': 'Cœur gauche',
  'dos': 'Dos',
  'manche_gauche': 'Manche gauche',
  'manche_droite': 'Manche droite',
  'face': 'Face',
  'centre': 'Centre',
  'front': 'Face avant',
  'back': 'Face arrière',
}
