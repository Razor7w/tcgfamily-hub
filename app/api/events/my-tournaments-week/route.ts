import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import {
  buildTournamentStandingsPublic,
  type TournamentStandingLean,
} from "@/lib/weekly-event-public";
import WeeklyEvent from "@/models/WeeklyEvent";
import type { WeeklyEventState } from "@/models/WeeklyEvent";
import type { MyTournamentWeekItem } from "@/lib/my-tournament-week-types";
import {
  matchRecordFromRounds,
  parseParticipantMatchRoundsFromLean,
} from "@/lib/participant-match-round";

/**
 * Torneos de la semana en los que el usuario está inscrito (participante con userId).
 * Misma ventana de fechas que GET /api/events?from&to.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const userPopId =
      typeof (session.user as { popid?: string }).popid === "string"
        ? (session.user as { popid: string }).popid
        : "";

    const { searchParams } = new URL(request.url);
    const fromRaw = searchParams.get("from");
    const toRaw = searchParams.get("to");
    if (!fromRaw || !toRaw) {
      return NextResponse.json(
        { error: "Parámetros from y to requeridos (ISO 8601)" },
        { status: 400 },
      );
    }

    const from = new Date(fromRaw);
    const to = new Date(toRaw);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
    }

    let uid: mongoose.Types.ObjectId;
    try {
      uid = new mongoose.Types.ObjectId(userId);
    } catch {
      return NextResponse.json(
        { error: "ID de usuario inválido" },
        { status: 400 },
      );
    }

    await connectDB();

    const docs = await WeeklyEvent.find({
      startsAt: { $gte: from, $lte: to },
      kind: "tournament",
      participants: { $elemMatch: { userId: uid } },
    })
      .sort({ startsAt: 1 })
      .lean();

    const items: MyTournamentWeekItem[] = [];

    for (const d of docs) {
      const participants = (d.participants ?? []) as {
        displayName: string;
        userId?: unknown;
        popId?: string;
        wins?: unknown;
        losses?: unknown;
        ties?: unknown;
        deckPokemonSlugs?: string[];
      }[];
      const mine = participants.find(
        (p) => p.userId && String(p.userId) === userId,
      );
      const tournamentOrigin: "official" | "custom" =
        (d as { tournamentOrigin?: string }).tournamentOrigin === "custom"
          ? "custom"
          : "official";
      const deckPokemonSlugs = Array.isArray(mine?.deckPokemonSlugs)
        ? mine.deckPokemonSlugs.filter((s): s is string => typeof s === "string")
        : undefined;
      const myParticipantPopId =
        mine && typeof mine.popId === "string" ? mine.popId : undefined;
      let myMatchRecord = mine
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
        const rounds = parseParticipantMatchRoundsFromLean(
          (mine as { matchRounds?: unknown }).matchRounds,
        );
        myMatchRecord = matchRecordFromRounds(rounds);
      }

      const stateRaw: WeeklyEventState =
        d.state === "schedule" || d.state === "running" || d.state === "close"
          ? d.state
          : "schedule";
      const state: WeeklyEventState =
        tournamentOrigin === "custom" ? "close" : stateRaw;

      const tournamentClosed = stateRaw === "close";
      const standings = (d as { tournamentStandings?: TournamentStandingLean[] })
        .tournamentStandings;

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

      items.push({
        eventId: String(d._id),
        title: typeof d.title === "string" ? d.title : "Torneo",
        startsAt:
          d.startsAt instanceof Date
            ? d.startsAt.toISOString()
            : new Date(d.startsAt as string).toISOString(),
        state,
        tournamentOrigin,
        myMatchRecord,
        placement,
        ...(deckPokemonSlugs?.length ? { deckPokemonSlugs } : {}),
      });
    }

    return NextResponse.json({ tournaments: items }, { status: 200 });
  } catch (error) {
    console.error("GET /api/events/my-tournaments-week:", error);
    return NextResponse.json(
      { error: "Error al obtener el reporte" },
      { status: 500 },
    );
  }
}
