/**
 * Textos para la vista pública de ligas. La puntuación es local (W/L/T), no CP oficiales.
 */

/** Párrafos para el aviso informativo en /ligas/[slug]. */
export const LEAGUE_PUBLIC_INFO_ALERT_PARAGRAPHS = [
  "Los puntos de esta liga se calculan solo con el récord de cada jugador en cada torneo asignado a la liga: victoria 3 pts, empate 1 pt, derrota 0 pts. No se usa la tabla de posición final ni la división de edad.",
  "Ese récord (W / L / T) debe estar cargado en los datos del participante del evento (sincronización con la clasificación del torneo). Es independiente de los Puntos de Campeonato del programa oficial en Play! Tools.",
  "Opcionalmente puedes limitar la suma a los N mejores torneos por jugador (según los puntos de liga de cada torneo).",
] as const;

/** Subtítulo breve en el panel de administración de ligas. */
export const LEAGUE_ADMIN_INTRO =
  "La clasificación suma puntos por récord W/L/T en cada torneo cerrado (3 / 0 / 1). Asigna la liga al crear o editar un torneo oficial; hace falta que el participante tenga victorias, derrotas o empates registrados en el evento.";

/** Ayuda del campo «N mejores torneos». */
export const LEAGUE_ADMIN_COUNT_BEST_HELPER =
  "Opcional: solo cuentan los N torneos en los que cada jugador obtuvo más puntos de liga. Vacío = sumar todos los torneos cerrados de la liga.";
