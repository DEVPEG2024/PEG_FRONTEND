import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Affichage des prix résolu pour le client connecté (voir utils/priceDisplay).
 * Persisté avec la session de l'onglet : pas de bascule HT → TTC au
 * rechargement. Attaché à un client précis : un autre compte ouvert dans le
 * même onglet ne peut jamais hériter du réglage du précédent.
 */
export type PriceDisplayState = {
  customerDocumentId: string
  ttc: boolean
}

const initialState: PriceDisplayState = { customerDocumentId: '', ttc: false }

const priceDisplaySlice = createSlice({
  name: 'auth/priceDisplay',
  initialState,
  reducers: {
    setPriceDisplay(_state, action: PayloadAction<PriceDisplayState>) {
      return action.payload
    },
  },
})

export const { setPriceDisplay } = priceDisplaySlice.actions
export default priceDisplaySlice.reducer
