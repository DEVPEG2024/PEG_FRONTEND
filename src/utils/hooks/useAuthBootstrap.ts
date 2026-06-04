import { useEffect, useMemo, useRef, useState } from 'react'
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
 */
export function useAuthBootstrap() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((s) => s.auth.session.token)
  const userId = useAppSelector((s) => s.auth.user.user.id)

  const refreshedFor = useRef<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [fetched, setFetched] = useState(false)

  const tokenUserId = useMemo(() => getTokenUserId(token), [token])

  useEffect(() => {
    if (!token) return
    if (refreshedFor.current === token) return
    refreshedFor.current = token
    setFailed(false)
    setFetched(false)
    getUser(token)
      .then((user) => {
        if (user) dispatch(setOwnUser(user))
      })
      .catch(() => setFailed(true))
      .finally(() => setFetched(true))
  }, [token, dispatch])

  // Identité confirmée :
  // - cas normal : l'id du profil == l'id du token ;
  // - repli (token illisible) : on s'en remet au succès de /users/me.
  const identityConfirmed =
    tokenUserId != null ? userId === tokenUserId : fetched && !failed

  return { hasToken: !!token, identityConfirmed, failed }
}

export default useAuthBootstrap
