import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { aggregateLeagueStandingsByCategory } from "@/lib/league-aggregate";
import League from "@/models/League";
import WeeklyEvent from "@/models/WeeklyEvent";

/**
 * Clasificación pública de una liga (torneos cerrados con standings importados).
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
      pointsByPlace: Array.isArray(leagueDoc.pointsByPlace)
        ? leagueDoc.pointsByPlace.map((n) => Number(n) || 0)
        : [],
      countBestEvents:
        leagueDoc.countBestEvents === null ||
        leagueDoc.countBestEvents === undefined
          ? null
          : typeof leagueDoc.countBestEvents === "number"
            ? Math.round(leagueDoc.countBestEvents)
            : null,
    };

    const events = await WeeklyEvent.find({
      leagueId: leagueDoc._id,
      tournamentOrigin: "official",
      kind: "tournament",
      state: "close",
    })
      .select("title startsAt tournamentStandings participants.displayName participants.popId")
      .sort({ startsAt: 1 })
      .lean();

    const standingsByCategory = aggregateLeagueStandingsByCategory(
      events as Parameters<typeof aggregateLeagueStandingsByCategory>[0],
      league.pointsByPlace,
      league.countBestEvents,
    );

    const tournamentSummaries = events.map((ev) => ({
      _id: String(ev._id),
      title: ev.title,
      startsAt:
        ev.startsAt instanceof Date
          ? ev.startsAt.toISOString()
          : new Date(ev.startsAt as unknown as string).toISOString(),
      hasStandings: Boolean(
        (ev.tournamentStandings ?? []).some(
          (c) => (c.finished?.length ?? 0) > 0,
        ),
      ),
    }));

    const standingsByCategoryPayload = standingsByCategory.map((block) => ({
      categoryIndex: block.categoryIndex,
      standings: block.standings,
      chartTop: block.standings.slice(0, 12).map((r, i) => ({
        rank: i + 1,
        name: r.displayName,
        points: r.totalPoints,
        popId: r.popId,
      })),
    }));

    return NextResponse.json(
      {
        league,
        tournaments: tournamentSummaries,
        standingsByCategory: standingsByCategoryPayload,
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
