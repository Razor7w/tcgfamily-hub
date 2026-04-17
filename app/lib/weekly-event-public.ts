import { popidForStorage } from "@/lib/rut-chile";

/** Límite de filas por categoría en la respuesta pública (evita payloads enormes). */
const MAX_STANDING_ROWS_PER_CATEGORY = 512;

export type TournamentStandingLean = {
  categoryIndex?: number;
  finished?: { popId: string; place: number }[];
  dnf?: { popId: string }[];
};

export function categoryLabelEs(categoryIndex: number): string {
  if (categoryIndex === 0) return "Júnior";
  if (categoryIndex === 1) return "Sénior";
  return "Máster";
}

/**
 * Resuelve la posición del usuario en standings comparando POP normalizado.
 * Usa el POP de la sesión y, si hace falta, el POP guardado en la inscripción al evento
 * (coincide con el TDF aunque el perfil no tenga POP o esté desactualizado).
 */
export function buildTournamentStandingsPublic(
  standings: TournamentStandingLean[] | undefined,
  participants: { displayName: string; popId?: string }[],
  userPopIdFromSession: string | undefined,
  userPopIdFromParticipant?: string | undefined,
): {
  standingsTopByCategory: {
    categoryIndex: number;
    rows: { place: number; displayName: string }[];
  }[];
  myTournamentPlacement: {
    categoryIndex: number;
    categoryLabel: string;
    place: number | null;
    isDnf: boolean;
  } | null;
} {
  const popToName = new Map<string, string>();
  for (const p of participants) {
    const k = popidForStorage(typeof p.popId === "string" ? p.popId : "");
    if (k) popToName.set(k, p.displayName || "—");
  }

  const myPopNorms = new Set<string>();
  for (const raw of [userPopIdFromSession, userPopIdFromParticipant]) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const n = popidForStorage(raw);
    if (n) myPopNorms.add(n);
  }

  const standingsTopByCategory: {
    categoryIndex: number;
    rows: { place: number; displayName: string }[];
  }[] = [];
  let myTournamentPlacement: {
    categoryIndex: number;
    categoryLabel: string;
    place: number | null;
    isDnf: boolean;
  } | null = null;

  for (const cat of standings ?? []) {
    const ci =
      typeof cat.categoryIndex === "number" ? Math.round(cat.categoryIndex) : -1;
    if (ci !== 0 && ci !== 1 && ci !== 2) continue;

    const sorted = [...(cat.finished ?? [])].sort((a, b) => a.place - b.place);
    const rowsPublic = sorted.slice(0, MAX_STANDING_ROWS_PER_CATEGORY).map((row) => ({
      place: Math.max(0, Math.round(Number(row.place) || 0)),
      displayName: popToName.get(popidForStorage(row.popId))?.trim() || "—",
    }));
    if (rowsPublic.length > 0) {
      standingsTopByCategory.push({ categoryIndex: ci, rows: rowsPublic });
    }

    if (myPopNorms.size > 0 && !myTournamentPlacement) {
      const fin = sorted.find((r) =>
        myPopNorms.has(popidForStorage(r.popId)),
      );
      if (fin) {
        myTournamentPlacement = {
          categoryIndex: ci,
          categoryLabel: categoryLabelEs(ci),
          place: Math.max(0, Math.round(Number(fin.place) || 0)),
          isDnf: false,
        };
      } else if (
        (cat.dnf ?? []).some((d) =>
          myPopNorms.has(popidForStorage(d.popId)),
        )
      ) {
        myTournamentPlacement = {
          categoryIndex: ci,
          categoryLabel: categoryLabelEs(ci),
          place: null,
          isDnf: true,
        };
      }
    }
  }

  return { standingsTopByCategory, myTournamentPlacement };
}
