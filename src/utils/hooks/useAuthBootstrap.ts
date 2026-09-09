import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getUser } from '@/services/UserService'
import { setOwnUser, useAppDispatch, useAppSelector } from '@/store'
import { getTokenUserId } from '@/utils/jwt'

/**
 * Confirme — auprès du serveur — que le profil présent dans le store appartient
 * bien au token de la session courante.
 *
 * Invariant de sécurité : on ne considère l'identité comme confirmée que lorsque
 * l'id du profil correspond à l'id porté par le JWT. Tant que ce n'est pas le
 * cas, l'appelant (Layout) doit refuser d'afficher l'interface authentifiée —
 * sinon un profil persisté d'une autre session (ex: admin) pourrait s'afficher.
 *
 * DEUX NATURES D'ÉCHEC, DEUX CONDUITES (correctif mobile)
 * -------------------------------------------------------
 * Auparavant, tout rejet de `/users/me` produisait un unique `failed`, dont le
 * Layout tirait une déconnexion. Sur téléphone, l'échec NOMINAL n'est pas un
 * refus d'authentification mais une coupure de transport (métro, ascenseur,
 * reprise d'une PWA en arrière-plan, 5xx, timeout, 429) : le client était
 * déconnecté sans un mot, et ses reconnexions répétées le poussaient vers le
 * mur du rate-limit de Strapi.
 *
 * On distingue donc :
 * - REFUS D'AUTHENTIFICATION AVÉRÉ (`authRejected`) → le serveur a répondu et
 *   rejette la session : 401/403, `IDENTITY_MISMATCH`, `ROLE_MISSING`, token
 *   expiré. Seul ce cas autorise la déconnexion.
 * - PANNE DE TRANSPORT (`unreachable`) → aucune réponse exploitable : on
 *   CONSERVE la session, on retente 3 fois avec recul (1s, 2s, 4s), puis on
 *   signale l'état.
 *
 * L'INVARIANT DE SÉCURITÉ RESTE INTACT : un token croisé ne produit jamais une
 * erreur réseau. Soit le serveur le refuse (401 → `authRejected`), soit il
 * répond avec un autre profil que celui du JWT et `getUser()` lève
 * `IDENTITY_MISMATCH` (→ `authRejected`). Dans les deux cas la déconnexion a
 * toujours lieu. Et le contrôle local (`userId === tokenUserId`) ne dépend
 * d'aucun appel réseau : même hors ligne, un profil qui ne correspond pas au
 * token n'est jamais considéré comme confirmé — l'interface reste bloquée.
 */

// Recul exponentiel ; la longueur du tableau fixe le nombre de tentatives.
const RETRY_DELAYS_MS = [1000, 2000, 4000]

/**
 * Le serveur a-t-il RÉPONDU en refusant la session ? (par opposition à une
 * panne de transport, où l'on ne sait rien de la validité du token)
 */
function isAuthRejection(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 401 || status === 403) return true
  const message = (error as { message?: string })?.message
  return (
    message === 'IDENTITY_MISMATCH' ||
    message === 'ROLE_MISSING' ||
    // levé par l'intercepteur de BaseService : le JWT est expiré, c'est un
    // verdict local certain, pas un aléa réseau.
    message === 'Token expired'
  )
}

export function useAuthBootstrap() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.session.token)
  const userId = useAppSelector((s) => s.auth.user.user.id)

  const [authRejected, setAuthRejected] = useState(false)
  const [unreachable, setUnreachable] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [retryTick, setRetryTick] = useState(0)

  const tokenUserId = useMemo(() => getTokenUserId(token), [token])

  // Identifie la passe en cours : une passe remplacée (changement de token,
  // double montage en StrictMode, relance manuelle) devient obsolète et ses
  // résultats sont ignorés.
  const runIdRef = useRef(0)

  useEffect(() => {
    if (!token) return
    const runId = ++runIdRef.current
    const isStale = () => runIdRef.current !== runId
    let timer: ReturnType<typeof setTimeout> | undefined

    setAuthRejected(false)
    setUnreachable(false)
    setFetched(false)

    const attempt = (index: number) => {
      getUser(token)
        .then((user) => {
          if (isStale()) return
          if (user) dispatch(setOwnUser(user))
          setFetched(true)
        })
        .catch((error) => {
          if (isStale()) return
          if (isAuthRejection(error)) {
            setAuthRejected(true)
            setFetched(true)
            return
          }
          if (index < RETRY_DELAYS_MS.length) {
            timer = setTimeout(() => {
              if (!isStale()) attempt(index + 1)
            }, RETRY_DELAYS_MS[index])
            return
          }
          // Réseau toujours indisponible : la session est CONSERVÉE.
          setUnreachable(true)
          setFetched(true)
        })
    }

    attempt(0)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [token, dispatch, retryTick])

  const retry = useCallback(() => setRetryTick((t) => t + 1), [])

  // Le navigateur retrouve le réseau → on relance immédiatement plutôt que
  // d'attendre une action de l'utilisateur.
  useEffect(() => {
    if (!unreachable) return
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [unreachable, retry])

  // Identité confirmée :
  // - cas normal : l'id du profil == l'id du token (contrôle purement local,
  //   donc insensible à une coupure réseau) ;
  // - repli (token illisible) : on s'en remet au succès de /users/me.
  const identityConfirmed =
    tokenUserId != null
      ? userId === tokenUserId
      : fetched && !authRejected && !unreachable

  return { hasToken: !!token, identityConfirmed, authRejected, unreachable, retry }
}

export default useAuthBootstrap
