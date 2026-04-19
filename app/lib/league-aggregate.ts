import { popidForStorage } from "@/lib/rut-chile";
import type { ITournamentCategoryStandings } from "@/models/WeeklyEvent";

export function pointsForPlace(place: number, pointsByPlace: number[]): number {
  if (place < 1 || !Number.isFinite(place)) return 0;
  const idx = Math.floor(place) - 1;
  if (idx < 0) return 0;
  if (idx >= pointsByPlace.length) {
    return pointsByPlace.length > 0 ? pointsByPlace[pointsByPlace.length - 1]! : 0;
  }
  return pointsByPlace[idx] ?? 0;
}

export type LeagueStandingEventDetail = {
  eventId: string;
  title: string;
  startsAt: string;
  categoryIndex: number;
  place: number;
  points: number;
};

export type LeagueStandingRow = {
  popId: string;
  displayName: string;
  totalPoints: number;
  eventsPlayed: number;
  events: LeagueStandingEventDetail[];
};

type LeanEventForLeague = {
  _id: unknown;
  title: string;
  startsAt: Date;
  tournamentStandings?: ITournamentCategoryStandings[];
  participants: { displayName: string; popId?: string }[];
};

/**
 * `onlyCategory`: null = todas las categorías (mezcla división de edad; no recomendado para podio);
 * 0–2 = solo esa división (Júnior, Sénior, Máster).
 */
function collectPlayerDetails(
  events: LeanEventForLeague[],
  pointsByPlace: number[],
  onlyCategory: number | null,
): {
  popToName: Map<string, string>;
  playerDetails: Map<string, LeagueStandingEventDetail[]>;
} {
  const popToName = new Map<string, string>();
  const playerDetails = new Map<string, LeagueStandingEventDetail[]>();

  for (const ev of events) {
    const popNameLocal = new Map<string, string>();
    for (const p of ev.participants ?? []) {
      const k = popidForStorage(typeof p.popId === "string" ? p.popId : "");
      if (k) {
        const name = p.displayName || "—";
        popNameLocal.set(k, name);
        if (!popToName.has(k)) popToName.set(k, name);
      }
    }

    const eventId = String(ev._id);
    const startsAtIso =
      ev.startsAt instanceof Date
        ? ev.startsAt.toISOString()
        : new Date(ev.startsAt as unknown as string).toISOString();

    for (const cat of ev.tournamentStandings ?? []) {
      const ci =
        typeof cat.categoryIndex === "number" && Number.isFinite(cat.categoryIndex)
          ? Math.max(0, Math.min(2, Math.round(cat.categoryIndex)))
          : 0;
      if (onlyCategory !== null && ci !== onlyCategory) continue;

      for (const row of cat.finished ?? []) {
        const popRaw = typeof row.popId === "string" ? row.popId : "";
        const k = popidForStorage(popRaw);
        if (!k) continue;
        const place = Math.max(1, Math.round(Number(row.place) || 0));
        const pts = pointsForPlace(place, pointsByPlace);
        const displayName = popNameLocal.get(k) ?? popToName.get(k) ?? "—";
        if (!popToName.has(k)) popToName.set(k, displayName);

        const detail: LeagueStandingEventDetail = {
          eventId,
          title: ev.title,
          startsAt: startsAtIso,
          categoryIndex: ci,
          place,
          points: pts,
        };
        const list = playerDetails.get(k) ?? [];
        list.push(detail);
        playerDetails.set(k, list);
      }
    }
  }

  return { popToName, playerDetails };
}

/**
 * `countBestEvents`: si es >= 1, solo suman los N torneos con más puntos por jugador
 * (dentro del conjunto de detalles ya filtrado, p. ej. por categoría).
 */
function finalizeStandings(
  popToName: Map<string, string>,
  playerDetails: Map<string, LeagueStandingEventDetail[]>,
  countBestEvents: number | null | undefined,
): LeagueStandingRow[] {
  const cap =
    countBestEvents != null &&
    typeof countBestEvents === "number" &&
    Number.isFinite(countBestEvents) &&
    countBestEvents >= 1
      ? Math.floor(countBestEvents)
      : null;

  const rows: LeagueStandingRow[] = [];

  for (const [popId, details] of playerDetails) {
    const perEventPoints = new Map<string, number>();
    for (const d of details) {
      perEventPoints.set(
        d.eventId,
        (perEventPoints.get(d.eventId) ?? 0) + d.points,
      );
    }

    const eventKeys = [...perEventPoints.keys()];
    let keepSet: Set<string>;
    let totalPoints: number;
    if (cap != null && eventKeys.length > cap) {
      const ranked = [...perEventPoints.entries()].sort((a, b) => b[1] - a[1]);
      const top = ranked.slice(0, cap);
      keepSet = new Set(top.map(([id]) => id));
      totalPoints = top.reduce((s, [, pts]) => s + pts, 0);
    } else {
      keepSet = new Set(eventKeys);
      totalPoints = [...perEventPoints.values()].reduce((a, b) => a + b, 0);
    }
    const filteredDetails = details
      .filter((d) => keepSet.has(d.eventId))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );

    rows.push({
      popId,
      displayName: popToName.get(popId) ?? "—",
      totalPoints,
      eventsPlayed: keepSet.size,
      events: filteredDetails,
    });
  }

  rows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      a.displayName.localeCompare(b.displayName, "es"),
  );
  return rows;
}

/**
 * Suma puntos por posición final (TDF) en torneos cerrados de la liga, mezclando todas las categorías.
 * Preferir `aggregateLeagueStandingsByCategory` en la vista pública para no mezclar divisiones de edad.
 */
export function aggregateLeagueStandings(
  events: LeanEventForLeague[],
  pointsByPlace: number[],
  countBestEvents: number | null | undefined,
): LeagueStandingRow[] {
  const { popToName, playerDetails } = collectPlayerDetails(
    events,
    pointsByPlace,
    null,
  );
  return finalizeStandings(popToName, playerDetails, countBestEvents);
}

export type LeagueCategoryStandingsBlock = {
  categoryIndex: number;
  standings: LeagueStandingRow[];
};

/**
 * Una tabla por división de edad (índice TOM 0–2), evitando un único ranking global con varios «primeros lugares».
 */
export function aggregateLeagueStandingsByCategory(
  events: LeanEventForLeague[],
  pointsByPlace: number[],
  countBestEvents: number | null | undefined,
): LeagueCategoryStandingsBlock[] {
  const out: LeagueCategoryStandingsBlock[] = [];
  for (let categoryIndex = 0; categoryIndex <= 2; categoryIndex++) {
    const { popToName, playerDetails } = collectPlayerDetails(
      events,
      pointsByPlace,
      categoryIndex,
    );
    out.push({
      categoryIndex,
      standings: finalizeStandings(
        popToName,
        playerDetails,
        countBestEvents,
      ),
    });
  }
  return out;
}
