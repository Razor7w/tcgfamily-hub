import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import WeeklyEvent from "@/models/WeeklyEvent";
import {
  canPreRegisterNow,
  canUnregisterNow,
  pairingExtrasForUser,
} from "@/lib/weekly-events";
import { buildTournamentStandingsPublic } from "@/lib/weekly-event-public";
import type { ParticipantMatchRoundDTO } from "@/lib/participant-match-round";

type LeanEvent = {
  _id: unknown;
  startsAt: Date;
  title: string;
  kind: string;
  game: string;
  pokemonSubtype?: string;
  state?: string;
  priceClp: number;
  maxParticipants: number;
  formatNotes?: string;
  prizesNotes?: string;
  location?: string;
  roundNum?: number;
  tournamentStandings?: import("@/lib/weekly-event-public").TournamentStandingLean[];
  participants?: {
    _id: unknown;
    displayName: string;
    userId?: unknown;
    confirmed?: boolean;
    popId?: string;
    table?: string;
    opponentId?: string;
    wins?: unknown;
    losses?: unknown;
    ties?: unknown;
    deckPokemonSlugs?: string[];
    matchRounds?: {
      _id?: unknown;
      roundNum?: number;
      opponentDeckSlugs?: string[];
      gameResults?: string[];
      turnOrders?: string[];
      specialOutcome?: string;
    }[];
  }[];
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await connectDB();
    const now = new Date();

    const doc = await WeeklyEvent.findById(id).lean<LeanEvent | null>();
    if (!doc) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const startsAt = doc.startsAt;
    const uid = session.user.id;
    const userPopId =
      typeof (session.user as { popid?: string }).popid === "string"
        ? (session.user as { popid: string }).popid
        : "";
    const parts = doc.participants ?? [];
    const mine = parts.find(
      (p) =>
        p.userId &&
        String(p.userId) === uid,
    );
    const myRegistration = mine?.displayName ?? null;
    const myAttendanceConfirmed = Boolean(mine?.confirmed);
    const roundNum =
      typeof doc.roundNum === "number" && Number.isFinite(doc.roundNum)
        ? Math.max(0, Math.round(doc.roundNum))
        : 0;
    const { myTable, myOpponentName } = pairingExtrasForUser(parts, uid);
    const myMatchRecord = mine
      ? {
          wins: Math.max(
            0,
            Math.min(999, Math.round(Number(mine.wins) || 0)),
          ),
          losses: Math.max(
            0,
            Math.min(999, Math.round(Number(mine.losses) || 0)),
          ),
          ties: Math.max(
            0,
            Math.min(999, Math.round(Number(mine.ties) || 0)),
          ),
        }
      : null;
    const eventState =
      doc.state === "schedule" || doc.state === "running" || doc.state === "close"
        ? doc.state
        : "schedule";
    const tournamentClosed =
      doc.kind === "tournament" && doc.state === "close";
    const myParticipantPopId =
      mine && typeof mine.popId === "string" ? mine.popId : undefined;
    const myDeckPokemonSlugs = Array.isArray(mine?.deckPokemonSlugs)
      ? mine.deckPokemonSlugs.filter((s): s is string => typeof s === "string")
      : [];

    const myMatchRounds: ParticipantMatchRoundDTO[] = [];
    if (Array.isArray(mine?.matchRounds)) {
      for (const mr of mine.matchRounds) {
        const roundNum = Math.round(Number(mr.roundNum));
        if (!Number.isFinite(roundNum)) continue;
        const opponentDeckSlugs = Array.isArray(mr.opponentDeckSlugs)
          ? mr.opponentDeckSlugs.filter((s): s is string => typeof s === "string")
          : [];
        const gameResults = Array.isArray(mr.gameResults)
          ? (mr.gameResults.filter((g): g is "W" | "L" | "T" =>
              g === "W" || g === "L" || g === "T",
            ) as ("W" | "L" | "T")[])
          : [];
        const turnOrders = Array.isArray(mr.turnOrders)
          ? (mr.turnOrders.filter((t): t is "first" | "second" =>
              t === "first" || t === "second",
            ) as ("first" | "second")[])
          : [];
        const special =
          mr.specialOutcome === "intentional_draw" ||
          mr.specialOutcome === "no_show" ||
          mr.specialOutcome === "bye"
            ? mr.specialOutcome
            : undefined;
        const row: ParticipantMatchRoundDTO = {
          ...(mr._id != null ? { id: String(mr._id) } : {}),
          roundNum,
          opponentDeckSlugs,
          gameResults,
          turnOrders,
          ...(special ? { specialOutcome: special } : { specialOutcome: null }),
        };
        myMatchRounds.push(row);
      }
      myMatchRounds.sort((a, b) => a.roundNum - b.roundNum);
    }
    const standingsPublic = tournamentClosed
      ? buildTournamentStandingsPublic(
          doc.tournamentStandings,
          parts as { displayName: string; popId?: string }[],
          userPopId,
          myParticipantPopId,
        )
      : null;

    const event = {
      _id: String(doc._id),
      startsAt: startsAt.toISOString(),
      title: doc.title,
      kind: doc.kind,
      game: doc.game,
      pokemonSubtype: doc.pokemonSubtype ?? null,
      state: eventState,
      priceClp: doc.priceClp,
      maxParticipants: doc.maxParticipants,
      formatNotes: doc.formatNotes ?? "",
      prizesNotes: doc.prizesNotes ?? "",
      location: doc.location ?? "",
      roundNum,
      participantNames: parts.map((p) => p.displayName),
      participantCount: parts.length,
      canPreRegister: canPreRegisterNow(startsAt, now),
      myRegistration,
      myAttendanceConfirmed,
      myTable,
      myOpponentName,
      myMatchRecord,
      canUnregister:
        Boolean(myRegistration) &&
        canUnregisterNow(startsAt, now) &&
        !myAttendanceConfirmed &&
        doc.state !== "running" &&
        doc.state !== "close",
      myDeckPokemonSlugs,
      canReportDeck:
        Boolean(myRegistration) &&
        doc.kind === "tournament" &&
        doc.game === "pokemon",
      myMatchRounds,
      ...(tournamentClosed
        ? {
            standingsTopByCategory:
              standingsPublic?.standingsTopByCategory ?? [],
            myTournamentPlacement:
              standingsPublic?.myTournamentPlacement ?? null,
          }
        : {}),
    };

    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error("GET /api/events/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener evento" },
      { status: 500 },
    );
  }
}
