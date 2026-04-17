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
    const standingsPublic = tournamentClosed
      ? buildTournamentStandingsPublic(
          doc.tournamentStandings,
          parts as { displayName: string; popId?: string }[],
          userPopId,
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
