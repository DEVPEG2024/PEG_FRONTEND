/**
 * Décodage minimal d'un JWT (payload base64url) — sans dépendance externe.
 * Utilisé pour lier l'identité affichée au token réellement utilisé : le
 * payload Strapi contient `id` (id numérique de l'utilisateur).
 */
export type JwtPayload = {
  id?: number | string
  exp?: number
  iat?: number
  [key: string]: unknown
}

export function decodeJwt(token?: string | null): JwtPayload | null {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Id utilisateur porté par le token (source d'autorité), ou null si illisible. */
export function getTokenUserId(token?: string | null): number | null {
  const payload = decodeJwt(token)
  const id = payload?.id
  if (typeof id === 'number') return id
  if (typeof id === 'string' && id.trim() !== '' && !isNaN(Number(id))) return Number(id)
  return null
}

/** True si le token est expiré ou illisible. */
export function isTokenExpired(token?: string | null): boolean {
  const payload = decodeJwt(token)
  if (!payload) return true
  if (!payload.exp) return false
  return payload.exp * 1000 < Date.now()
}
