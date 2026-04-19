/**
 * Textos alineados con el «Manual de reglas de las Ligas de Play! Pokémon» (español).
 * La clasificación en esta app es complementaria / local; no sustituye Play! Tools ni los CP oficiales.
 */

/** Párrafos para el aviso informativo en /ligas/[slug]. */
export const LEAGUE_PUBLIC_INFO_ALERT_PARAGRAPHS = [
  "Esta página muestra una clasificación local de la tienda, separada por división de edad (Júnior, Sénior, Máster), según la tabla de puntos por posición que definas aquí y la clasificación final importada desde el torneo (mismo origen que el archivo .tdf generado con Tournament Operations Manager, TOM).",
  "En el programa oficial de Juego Organizado Pokémon, los torneos de Desafío de Liga y Copa de Liga se programan en Play! Tools; los resultados se envían en formato .tdf para completar el evento. Los Puntos de Campeonato (CP) del programa global siguen las reglas publicadas por The Pokémon Company; no se muestran en esta vista.",
  "Las Copas de Liga suelen otorgar más Puntos de Campeonato que los Desafíos de Liga a escala internacional; eso no altera esta puntuación local. Opcionalmente puedes limitar a los N mejores torneos por jugador y por categoría.",
] as const;

/** Subtítulo breve en el panel de administración de ligas. */
export const LEAGUE_ADMIN_INTRO =
  "Clasificación local por división de edad (Júnior, Sénior, Máster), a partir de la clasificación TDF importada. Asigna la liga al crear o editar un torneo oficial; la página pública acumula puntos cuando el torneo está cerrado y tiene standings.";

/** Ayuda del campo «N mejores torneos». */
export const LEAGUE_ADMIN_COUNT_BEST_HELPER =
  "Opcional: análogo a contar solo las mejores actuaciones en una temporada. Vacío = sumar todos los torneos cerrados de la liga, por categoría. Independiente de los Puntos de Campeonato oficiales en Play! Tools.";
