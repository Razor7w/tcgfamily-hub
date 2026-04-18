import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import WeeklyEvent from "@/models/WeeklyEvent";
import {
  canPreRegisterNow,
  canUnregisterNow,
  pairingExtrasForUser,
} from "@/lib/weekly-events";
import {
  buildTournamentStandingsPublic,
  categoryLabelEs,
  PUBLIC_STANDINGS_FULL_MAX,
} from "@/lib/weekly-event-public";
import {
  matchRecordFromRounds,
  parseParticipantMatchRoundsFromLean,
  type ParticipantMatchRoundDTO,
} from "@/lib/participant-match-round";

type LeanEvent = {
  _id: unknown;
  startsAt: Date;
  title: string;
  kind: string;
  game: string;
  tournamentOrigin?: string;
  pokemonSubtype?: string;
  state?: string;
  priceClp: number;
  maxParticipants: number;
  formatNotes?: string;
  prizesNotes?: string;
  location?: string;
  roundNum?: number;
  tournamentStandings?: import("@/lib/weekly-event-public").TournamentStandingLean[];
  createdByUserId?: unknown;
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
    manualPlacement?: {
      categoryIndex?: number;
      place?: number | null;
      isDnf?: boolean;
    };
  }[];
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const wantFullStandings = url.searchParams.get("standings") === "full";

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
    const tournamentOrigin: "official" | "custom" =
      doc.tournamentOrigin === "custom" ? "custom" : "official";

    const createdByStr =
      doc.createdByUserId != null ? String(doc.createdByUserId) : "";
    /** Solo el creador puede borrar un torneo custom (fallback si falta el campo en datos viejos). */
    const canDeleteCustomTournament =
      tournamentOrigin === "custom" &&
      (createdByStr === uid ||
        (!createdByStr &&
          Boolean(mine?.userId && String(mine.userId) === uid)));

    const myMatchRounds: ParticipantMatchRoundDTO[] =
      parseParticipantMatchRoundsFromLean(mine?.matchRounds);

    let myMatchRecord: {
      wins: number;
      losses: number;
      ties: number;
    } | null = mine
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

    if (mine && tournamentOrigin === "custom") {
      myMatchRecord = matchRecordFromRounds(myMatchRounds);
    }
    const eventStateRaw =
      doc.state === "schedule" || doc.state === "running" || doc.state === "close"
        ? doc.state
        : "schedule";
    /** Torneos custom no siguen el ciclo oficial; la API los expone siempre como cerrados. */
    const eventState =
      tournamentOrigin === "custom" ? "close" : eventStateRaw;
    const tournamentClosed =
      doc.kind === "tournament" && doc.state === "close";
    const myParticipantPopId =
      mine && typeof mine.popId === "string" ? mine.popId : undefined;
    const myDeckPokemonSlugs = Array.isArray(mine?.deckPokemonSlugs)
      ? mine.deckPokemonSlugs.filter((s): s is string => typeof s === "string")
      : [];
    const standingsPublic = tournamentClosed
      ? buildTournamentStandingsPublic(
          doc.tournamentStandings,
          parts as { displayName: string; popId?: string }[],
          userPopId,
          myParticipantPopId,
          wantFullStandings
            ? { maxRowsPerCategory: PUBLIC_STANDINGS_FULL_MAX }
            : undefined,
        )
      : null;

    let myTournamentPlacement =
      standingsPublic?.myTournamentPlacement ?? null;
    if (
      !myTournamentPlacement &&
      tournamentClosed &&
      tournamentOrigin === "custom" &&
      mine?.manualPlacement &&
      typeof mine.manualPlacement.categoryIndex === "number"
    ) {
      const mp = mine.manualPlacement;
      const idx = Math.max(
        0,
        Math.min(2, Math.round(Number(mp.categoryIndex))),
      );
      const isDnf = Boolean(mp.isDnf);
      let placeNum: number | null = null;
      if (!isDnf && typeof mp.place === "number" && Number.isFinite(mp.place)) {
        placeNum = Math.max(1, Math.min(999, Math.round(mp.place)));
      }
      myTournamentPlacement = {
        categoryIndex: idx,
        categoryLabel: categoryLabelEs(idx),
        place: isDnf ? null : placeNum,
        isDnf,
      };
    }

    const event = {
      _id: String(doc._id),
      startsAt: startsAt.toISOString(),
      title: doc.title,
      kind: doc.kind,
      game: doc.game,
      tournamentOrigin,
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
      canPreRegister:
        tournamentOrigin !== "custom" && canPreRegisterNow(startsAt, now),
      myRegistration,
      myAttendanceConfirmed,
      myTable,
      myOpponentName,
      myMatchRecord,
      canUnregister:
        tournamentOrigin !== "custom" &&
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
      canDeleteCustomTournament,
      ...(tournamentClosed
        ? wantFullStandings
          ? {
              standingsFullByCategory:
                standingsPublic?.standingsTopByCategory ?? [],
              myTournamentPlacement,
            }
          : {
              standingsTopByCategory:
                standingsPublic?.standingsTopByCategory ?? [],
              myTournamentPlacement,
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await connectDB();

    const doc = await WeeklyEvent.findById(id).lean<LeanEvent | null>();
    if (!doc) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    if (doc.tournamentOrigin !== "custom") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar torneos personalizados" },
        { status: 403 },
      );
    }

    const uid = session.user.id;
    const createdByStr =
      doc.createdByUserId != null ? String(doc.createdByUserId) : "";
    const parts = doc.participants ?? [];
    const mine = parts.find(
      (p) => p.userId && String(p.userId) === uid,
    );
    const isCreator =
      createdByStr === uid ||
      (!createdByStr &&
        Boolean(mine?.userId && String(mine.userId) === uid));

    if (!isCreator) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await WeeklyEvent.deleteOne({ _id: doc._id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/events/[id]:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el torneo" },
      { status: 500 },
    );
  }
}
