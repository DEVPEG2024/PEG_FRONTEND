/** TVA rate used across the application (20%) */
export const TVA_RATE = 0.2

/** Round to 2 decimals to avoid floating-point drift */
const round2 = (n: number): number => Math.round(n * 100) / 100

/** Compute TTC from HT price */
export const toTTC = (ht: number): number => round2(ht * (1 + TVA_RATE))

/** Compute HT from TTC price */
export const toHT = (ttc: number): number => round2(ttc / (1 + TVA_RATE))

/** Compute TVA amount from HT price */
export const tvaAmount = (ht: number): number => round2(ht * TVA_RATE)

/** Format a number with French locale (comma as decimal separator) */
export const fmtNum = (n: number, decimals = 2): string =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

/** Format price with 2 decimals + € */
export const fmtPrice = (n: number): string => `${fmtNum(n)} €`

/** Format price as "XX,XX € HT" */
export const fmtHT = (ht: number): string => `${fmtNum(ht)} € HT`

/** Format price as "XX,XX € TTC" */
export const fmtTTC = (ttc: number): string => `${fmtNum(ttc)} € TTC`
