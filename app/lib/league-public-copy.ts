/**
 * Textos para la vista pública de ligas. La puntuación es local (W/L/T), no CP oficiales.
 */

/** Párrafos para el aviso informativo en /ligas/[slug]. */
export const LEAGUE_PUBLIC_INFO_ALERT_PARAGRAPHS = [
  "Los puntos de esta liga se calculan solo con el récord de cada jugador en cada torneo asignado a la liga: victoria 3 pts, empate 1 pt, derrota 0 pts.",
] as const;

/** Subtítulo breve en el panel de administración de ligas. */
export const LEAGUE_ADMIN_INTRO =
  "La clasificación suma puntos por récord W/L/T en cada torneo cerrado (3 / 0 / 1). Si configuras un tope de ronda en el evento, la liga usa el mismo límite (récord del snapshot hasta esa ronda). Asigna la liga al torneo oficial cerrado.";

/** Ayuda del campo «N mejores torneos». */
export const LEAGUE_ADMIN_COUNT_BEST_HELPER =
  "Opcional: solo cuentan los N torneos en los que cada jugador obtuvo más puntos de liga. Vacío = sumar todos los torneos cerrados de la liga.";
