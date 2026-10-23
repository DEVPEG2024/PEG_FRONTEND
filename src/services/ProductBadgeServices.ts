import ApiService from './ApiService'
import { customBadgeLibrary, parseBadges, type ProductBadge } from '@/utils/productBadges'

// ─── Badges produit (champ JSON `badges`, 23/10/2026) ────────────────────────
// Route REST dédiée de Strapi (`GET /api/product-badges`), jamais ajoutée aux
// grosses requêtes produit : tant que le champ n'existe pas côté serveur, le
// demander en GraphQL ferait échouer TOUTE la requête (HTTP 400). L'introspection
// GraphQL est désactivée en production : c'est la présence de la route qui sert de
// signal (absente → 404/405 → badges masqués, éditeur caché, rien d'envoyé).
// Backend : peg_strapi `src/api/product-badge/`.
//
// Toutes les cartes d'une page demandent leurs badges au même moment : les
// demandes d'un même tour sont regroupées en UNE requête (par paquets de 50).

let routeAvailable: boolean | null = null
let probe: Promise<boolean> | null = null

type BadgesResponse = { result: boolean; badges: Record<string, unknown> }

const isAbsent = (err: unknown): boolean => {
    const status = (err as { response?: { status?: number } })?.response?.status
    return status === 404 || status === 405
}

/** Badges déployés côté Strapi ? (sondé une fois par session, sans erreur visible) */
export function apiAreProductBadgesAvailable(): Promise<boolean> {
    if (routeAvailable !== null) return Promise.resolve(routeAvailable)
    probe ??= ApiService.fetchData<BadgesResponse>({ url: '/product-badges', method: 'get' })
        .then(() => true)
        .catch(() => false)
        .then((available) => {
            routeAvailable = available
            probe = null
            return available
        })
    return probe
}

const BATCH = 50
const cache = new Map<string, ProductBadge[]>()
const waiting = new Map<string, ((badges: ProductBadge[]) => void)[]>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

/** Abonnement aux invalidations (les cartes rechargent leurs badges). */
export const subscribeProductBadges = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

/** Après un enregistrement admin : ces produits (ou tous) seront relus. */
export const invalidateProductBadges = (documentIds?: string[]): void => {
    if (documentIds) documentIds.forEach((id) => cache.delete(id))
    else cache.clear()
    listeners.forEach((l) => l())
}

const fetchChunk = async (ids: string[]): Promise<Map<string, ProductBadge[]>> => {
    const found = new Map<string, ProductBadge[]>()
    try {
        const response = await ApiService.fetchData<BadgesResponse>({
            url: `/product-badges?ids=${ids.map(encodeURIComponent).join(',')}`,
            method: 'get',
        })
        routeAvailable = true
        for (const [id, badges] of Object.entries(response.data?.badges ?? {})) found.set(id, parseBadges(badges))
    } catch (err) {
        // Route absente (backend pas encore déployé) : plus aucune requête cette session.
        if (isAbsent(err)) routeAvailable = false
    }
    return found
}

const flush = async () => {
    flushTimer = null
    const ids = [...waiting.keys()]
    const callbacks = new Map(waiting)
    waiting.clear()
    for (let i = 0; i < ids.length; i += BATCH) {
        const chunk = ids.slice(i, i + BATCH)
        const found = routeAvailable === false ? new Map<string, ProductBadge[]>() : await fetchChunk(chunk)
        for (const id of chunk) {
            const badges = found.get(id) ?? []
            cache.set(id, badges)
            callbacks.get(id)?.forEach((cb) => cb(badges))
        }
    }
}

/** Badges enregistrés d'un produit (relus et validés), via le regroupement. */
export const loadProductBadges = (documentId: string): Promise<ProductBadge[]> => {
    const cached = cache.get(documentId)
    if (cached) return Promise.resolve(cached)
    return new Promise((resolve) => {
        waiting.set(documentId, [...(waiting.get(documentId) ?? []), resolve])
        flushTimer ??= setTimeout(() => { void flush() }, 0)
    })
}

/** Lecture synchrone du cache (premier rendu sans clignotement si déjà chargé). */
export const cachedProductBadges = (documentId: string): ProductBadge[] | undefined => cache.get(documentId)

/** Badges personnalisés déjà utilisés sur les produits (éditeur admin). */
export async function apiGetBadgeLibrary(): Promise<ProductBadge[]> {
    if (!(await apiAreProductBadgesAvailable())) return []
    try {
        const response = await ApiService.fetchData<{ result: boolean; badges: unknown }>({
            url: '/product-badges/library',
            method: 'get',
        })
        return customBadgeLibrary([response.data?.badges])
    } catch {
        return []
    }
}
