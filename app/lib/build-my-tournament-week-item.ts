import type { TournamentStandingLean } from "@/lib/weekly-event-public";
import {
  buildTournamentStandingsPublic,
  categoryLabelEs,
} from "@/lib/weekly-event-public";
import type { MyTournamentWeekItem } from "@/lib/my-tournament-week-types";
import {
  matchRecordFromRounds,
  parseParticipantMatchRoundsFromLean,
} from "@/lib/participant-match-round";
import type { WeeklyEventState } from "@/models/WeeklyEvent";

type LeanParticipant = {
  displayName: string;
  userId?: unknown;
  popId?: string;
  wins?: unknown;
  losses?: unknown;
  ties?: unknown;
  deckPokemonSlugs?: string[];
  matchRounds?: unknown;
  manualPlacement?: {
    categoryIndex?: unknown;
    place?: unknown;
    isDnf?: unknown;
  };
};

function placementFromManualMine(
  mine: LeanParticipant,
): MyTournamentWeekItem["placement"] | null {
  const mp = mine.manualPlacement;
  if (!mp || typeof mp.categoryIndex !== "number" || !Number.isFinite(mp.categoryIndex)) {
    return null;
  }
  const idx = Math.max(0, Math.min(2, Math.round(mp.categoryIndex)));
  const isDnf = Boolean(mp.isDnf);
  let place: number | null = null;
  if (!isDnf) {
    const p = mp.place;
    if (typeof p === "number" && Number.isFinite(p)) {
      place = Math.max(1, Math.min(999, Math.round(p)));
    } else {
      return null;
    }
  }
  return {
    categoryLabel: categoryLabelEs(idx),
    place,
    isDnf,
  };
}

type LeanWeeklyForItem = {
  _id: unknown;
  startsAt: Date | string;
  title?: string;
  state?: string;
  tournamentOrigin?: string;
  tournamentStandings?: TournamentStandingLean[];
  participants?: LeanParticipant[];
};

/**
 * Construye el ítem de reporte para el usuario a partir de un documento WeeklyEvent lean.
 * Devuelve null si el usuario no participa en el evento.
 */
export function buildMyTournamentWeekItemFromLean(
  d: unknown,
  userId: string,
  userPopId: string,
): MyTournamentWeekItem | null {
  const doc = d as LeanWeeklyForItem;
  const participants = (doc.participants ?? []) as LeanParticipant[];
  const mine = participants.find(
    (p) => p.userId && String(p.userId) === userId,
  );
  if (!mine) return null;

  const tournamentOrigin: "official" | "custom" =
    doc.tournamentOrigin === "custom" ? "custom" : "official";
  const deckPokemonSlugs = Array.isArray(mine.deckPokemonSlugs)
    ? mine.deckPokemonSlugs.filter((s): s is string => typeof s === "string")
    : undefined;
  const myParticipantPopId =
    mine && typeof mine.popId === "string" ? mine.popId : undefined;
  let myMatchRecord: MyTournamentWeekItem["myMatchRecord"] = {
    wins: Math.max(0, Math.min(999, Math.round(Number(mine.wins) || 0))),
    losses: Math.max(0, Math.min(999, Math.round(Number(mine.losses) || 0))),
    ties: Math.max(0, Math.min(999, Math.round(Number(mine.ties) || 0))),
  };

  if (tournamentOrigin === "custom") {
    const rounds = parseParticipantMatchRoundsFromLean(mine.matchRounds);
    myMatchRecord = matchRecordFromRounds(rounds);
  }

  const stateRaw: WeeklyEventState =
    doc.state === "schedule" || doc.state === "running" || doc.state === "close"
      ? doc.state
      : "schedule";
  const state: WeeklyEventState =
    tournamentOrigin === "custom" ? "close" : stateRaw;

  const tournamentClosed = stateRaw === "close";
  const standings = doc.tournamentStandings;

  let placement: MyTournamentWeekItem["placement"] = null;
  if (tournamentClosed) {
    const pub = buildTournamentStandingsPublic(
      standings,
      participants.map((p) => ({
        displayName: p.displayName,
        popId: p.popId,
      })),
      userPopId,
      myParticipantPopId,
    );
    const minePl = pub.myTournamentPlacement;
    if (minePl) {
      placement = {
        categoryLabel: minePl.categoryLabel,
        place: minePl.place,
        isDnf: minePl.isDnf,
      };
    }
  }

  if (!placement && tournamentOrigin === "custom" && tournamentClosed) {
    placement = placementFromManualMine(mine);
  }

  return {
    eventId: String(doc._id),
    title: typeof doc.title === "string" ? doc.title : "Torneo",
    startsAt:
      doc.startsAt instanceof Date
        ? doc.startsAt.toISOString()
        : new Date(doc.startsAt as string).toISOString(),
    state,
    tournamentOrigin,
    myMatchRecord,
    placement,
    ...(deckPokemonSlugs?.length ? { deckPokemonSlugs } : {}),
  };
}
