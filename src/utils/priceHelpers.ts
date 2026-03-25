/** TVA rate used across the application (20%) */
export const TVA_RATE = 0.2

/** Compute TTC from HT price */
export const toTTC = (ht: number): number => ht * (1 + TVA_RATE)

/** Compute HT from TTC price */
export const toHT = (ttc: number): number => ttc / (1 + TVA_RATE)

/** Compute TVA amount from HT price */
export const tvaAmount = (ht: number): number => ht * TVA_RATE

/** Format price with 2 decimals + € */
export const fmtPrice = (n: number): string => `${n.toFixed(2)} €`

/** Format price as "XX.XX € HT" */
export const fmtHT = (ht: number): string => `${ht.toFixed(2)} € HT`

/** Format price as "XX.XX € TTC" */
export const fmtTTC = (ttc: number): string => `${ttc.toFixed(2)} € TTC`
