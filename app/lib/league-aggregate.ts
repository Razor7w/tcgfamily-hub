import { popidForStorage } from "@/lib/rut-chile";
import {
  LEAGUE_SCORE_LOSS,
  LEAGUE_SCORE_TIE,
  LEAGUE_SCORE_WIN,
} from "@/lib/league-constants";

function nonNegativeInt(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.floor(x);
}

/** Puntos de liga en un torneo: 3·W + 1·T + 0·L (independiente del puesto final). */
export function pointsFromWLRecord(
  wins: number,
  losses: number,
  ties: number,
): number {
  return (
    wins * LEAGUE_SCORE_WIN +
    losses * LEAGUE_SCORE_LOSS +
    ties * LEAGUE_SCORE_TIE
  );
}

export type LeagueStandingEventDetail = {
  eventId: string;
  title: string;
  startsAt: string;
  wins: number;
  losses: number;
  ties: number;
  points: number;
};

export type LeagueStandingRow = {
  popId: string;
  displayName: string;
  totalPoints: number;
  eventsPlayed: number;
  events: LeagueStandingEventDetail[];
};

type LeanParticipant = {
  displayName: string;
  popId?: string;
  wins?: number;
  losses?: number;
  ties?: number;
};

type LeanEventForLeague = {
  _id: unknown;
  title: string;
  startsAt: Date;
  participants: LeanParticipant[];
};

/**
 * Agrupa por POP dentro de un evento por si hubiera filas duplicadas.
 */
function mergeParticipantsByPop(ev: LeanEventForLeague): Map<
  string,
  { displayName: string; w: number; l: number; t: number }
> {
  const byPop = new Map<
    string,
    { displayName: string; w: number; l: number; t: number }
  >();

  for (const p of ev.participants ?? []) {
    const k = popidForStorage(typeof p.popId === "string" ? p.popId : "");
    if (!k) continue;
    const w = nonNegativeInt(p.wins);
    const l = nonNegativeInt(p.losses);
    const t = nonNegativeInt(p.ties);
    const name = p.displayName || "—";
    const cur = byPop.get(k);
    if (!cur) {
      byPop.set(k, { displayName: name, w, l, t });
    } else {
      cur.displayName = name || cur.displayName;
      cur.w += w;
      cur.l += l;
      cur.t += t;
    }
  }
  return byPop;
}

function collectPlayerDetailsFromRecords(
  events: LeanEventForLeague[],
): {
  popToName: Map<string, string>;
  playerDetails: Map<string, LeagueStandingEventDetail[]>;
} {
  const popToName = new Map<string, string>();
  const playerDetails = new Map<string, LeagueStandingEventDetail[]>();

  for (const ev of events) {
    const eventId = String(ev._id);
    const startsAtIso =
      ev.startsAt instanceof Date
        ? ev.startsAt.toISOString()
        : new Date(ev.startsAt as unknown as string).toISOString();

    const merged = mergeParticipantsByPop(ev);

    for (const [k, rec] of merged) {
      if (rec.w + rec.l + rec.t === 0) continue;

      if (!popToName.has(k)) popToName.set(k, rec.displayName);
      else if (rec.displayName && rec.displayName !== "—")
        popToName.set(k, rec.displayName);

      const pts = pointsFromWLRecord(rec.w, rec.l, rec.t);
      const detail: LeagueStandingEventDetail = {
        eventId,
        title: ev.title,
        startsAt: startsAtIso,
        wins: rec.w,
        losses: rec.l,
        ties: rec.t,
        points: pts,
      };
      const list = playerDetails.get(k) ?? [];
      list.push(detail);
      playerDetails.set(k, list);
    }
  }

  return { popToName, playerDetails };
}

/**
 * `countBestEvents`: si es >= 1, solo suman los N torneos con más puntos por jugador.
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
 * Suma puntos de liga por récord W/L/T en cada torneo cerrado (datos del participante en el evento).
 * No usa la tabla de posición final ni separa por categoría de edad.
 */
export function aggregateLeagueStandings(
  events: LeanEventForLeague[],
  countBestEvents: number | null | undefined,
): LeagueStandingRow[] {
  const { popToName, playerDetails } = collectPlayerDetailsFromRecords(events);
  return finalizeStandings(popToName, playerDetails, countBestEvents);
}
