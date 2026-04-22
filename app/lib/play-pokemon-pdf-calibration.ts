/**
 * Desplazamiento global (pt) del texto respecto a la plantilla PNG.
 * Ajusta aquí los valores definitivos cuando ya encajen en vista previa,
 * o usa los sliders del modal (se guardan en localStorage).
 */
export const PLAY_POKEMON_PDF_CALIBRATION = {
  offsetX: 0,
  offsetY: 0
} as const

export type PlayPokemonPdfCalibration = {
  offsetX: number
  offsetY: number
}
