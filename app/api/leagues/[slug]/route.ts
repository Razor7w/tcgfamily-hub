import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { aggregateLeagueStandings } from "@/lib/league-aggregate";
import {
  LEAGUE_SCORE_LOSS,
  LEAGUE_SCORE_TIE,
  LEAGUE_SCORE_WIN,
} from "@/lib/league-constants";
import League from "@/models/League";
import WeeklyEvent from "@/models/WeeklyEvent";

function participantHasWLTSum(p: {
  wins?: number;
  losses?: number;
  ties?: number;
}): boolean {
  const w = Number(p.wins);
  const l = Number(p.losses);
  const t = Number(p.ties);
  const ws = Number.isFinite(w) && w > 0 ? Math.floor(w) : 0;
  const ls = Number.isFinite(l) && l > 0 ? Math.floor(l) : 0;
  const ts = Number.isFinite(t) && t > 0 ? Math.floor(t) : 0;
  return ws + ls + ts > 0;
}

/**
 * Clasificación pública de una liga (torneos cerrados; puntos por récord W/L/T del participante).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: raw } = await context.params;
    const slug = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (!slug) {
      return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
    }

    await connectDB();
    const leagueDoc = await League.findOne({ slug, isActive: true }).lean();
    if (!leagueDoc) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const league = {
      _id: String(leagueDoc._id),
      name: leagueDoc.name,
      slug: leagueDoc.slug,
      description: leagueDoc.description ?? "",
      countBestEvents:
        leagueDoc.countBestEvents === null ||
        leagueDoc.countBestEvents === undefined
          ? null
          : typeof leagueDoc.countBestEvents === "number"
            ? Math.round(leagueDoc.countBestEvents)
            : null,
      scoring: {
        winPoints: LEAGUE_SCORE_WIN,
        lossPoints: LEAGUE_SCORE_LOSS,
        tiePoints: LEAGUE_SCORE_TIE,
      },
    };

    const events = await WeeklyEvent.find({
      leagueId: leagueDoc._id,
      tournamentOrigin: "official",
      kind: "tournament",
      state: "close",
    })
      .select(
        "title startsAt participants.displayName participants.popId participants.wins participants.losses participants.ties",
      )
      .sort({ startsAt: 1 })
      .lean();

    const standings = aggregateLeagueStandings(
      events as Parameters<typeof aggregateLeagueStandings>[0],
      league.countBestEvents,
    );

    const tournamentSummaries = events.map((ev) => ({
      _id: String(ev._id),
      title: ev.title,
      startsAt:
        ev.startsAt instanceof Date
          ? ev.startsAt.toISOString()
          : new Date(ev.startsAt as unknown as string).toISOString(),
      hasRecord: (ev.participants ?? []).some((p) => participantHasWLTSum(p)),
    }));

    const chartTop = standings.slice(0, 12).map((r, i) => ({
      rank: i + 1,
      name: r.displayName,
      points: r.totalPoints,
      popId: r.popId,
    }));

    return NextResponse.json(
      {
        league,
        tournaments: tournamentSummaries,
        standings,
        chartTop,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/leagues/[slug]:", error);
    return NextResponse.json(
      { error: "Error al cargar la liga" },
      { status: 500 },
    );
  }
}
