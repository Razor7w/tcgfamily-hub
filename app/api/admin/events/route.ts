import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER } from "@/lib/admin-weekly-event-access";
import League from "@/models/League";
import WeeklyEvent, {
  type WeeklyEventGame,
  type WeeklyEventKind,
  type PokemonTournamentSubtype,
  type WeeklyEventState,
} from "@/models/WeeklyEvent";

const PRICE_MAX = 99_999_999;
const PARTICIPANTS_MAX = 2048;
const ROUND_NUM_MAX = 9999;

function parseBody(body: unknown) {
  if (typeof body !== "object" || body === null) return null;
  return body as Record<string, unknown>;
}

function readKind(v: unknown): WeeklyEventKind | null {
  if (v === "tournament" || v === "trade_day" || v === "other") return v;
  return null;
}

function readGame(v: unknown): WeeklyEventGame | null {
  if (v === "pokemon" || v === "magic" || v === "other_tcg") return v;
  return null;
}

function readPokemonSubtype(v: unknown): PokemonTournamentSubtype | null | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (v === "casual" || v === "cup" || v === "challenge") return v;
  return null;
}

function readState(v: unknown): WeeklyEventState | null {
  if (v === "schedule" || v === "running" || v === "close") return v;
  return null;
}

function serializeAdminParticipant(p: {
  displayName: string;
  userId?: unknown;
  createdAt?: Date;
  confirmed?: boolean;
  popId?: string;
  table?: string;
  opponentId?: string;
  wins?: unknown;
  losses?: unknown;
  ties?: unknown;
}) {
  let userIdStr: string | null = null;
  const u = p.userId;
  if (u && typeof u === "object") {
    const o = u as { _id?: unknown; popid?: string };
    if (o._id !== undefined) userIdStr = String(o._id);
  } else if (u) {
    userIdStr = String(u);
  }

  let popId = "";
  if (typeof p.popId === "string" && p.popId.trim()) {
    popId = p.popId.trim();
  } else if (u && typeof u === "object") {
    const o = u as { popid?: string };
    if (typeof o.popid === "string") popId = o.popid.trim();
  }

  return {
    displayName: p.displayName,
    userId: userIdStr,
    popId: popId || "—",
    table: typeof p.table === "string" ? p.table : "",
    opponentId: typeof p.opponentId === "string" ? p.opponentId : "",
    confirmed: Boolean(p.confirmed),
    wins: Math.max(0, Math.min(999, Math.round(Number(p.wins) || 0))),
    losses: Math.max(0, Math.min(999, Math.round(Number(p.losses) || 0))),
    ties: Math.max(0, Math.min(999, Math.round(Number(p.ties) || 0))),
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectDB();
    const raw = await WeeklyEvent.find(ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER)
      .sort({ startsAt: 1 })
      .populate({ path: "participants.userId", select: "popid" })
      .populate({ path: "leagueId", select: "name slug" })
      .lean();

    type LeanPart = {
      displayName: string;
      userId?: unknown;
      createdAt?: Date;
      confirmed?: boolean;
      popId?: string;
      table?: string;
      opponentId?: string;
      wins?: unknown;
      losses?: unknown;
      ties?: unknown;
    };

    const events = raw.map((ev) => {
      const doc = ev as Record<string, unknown> & {
        _id: unknown;
        participants?: LeanPart[];
        leagueId?: unknown;
      };
      const { _id, participants, leagueId: leagueRaw, ...rest } = doc;
      const rawState = rest.state;
      const state =
        rawState === "schedule" || rawState === "running" || rawState === "close"
          ? rawState
          : "schedule";

      let leagueId: string | null = null;
      let league: { name: string; slug: string } | null = null;
      if (
        leagueRaw &&
        typeof leagueRaw === "object" &&
        leagueRaw !== null &&
        "_id" in leagueRaw
      ) {
        leagueId = String((leagueRaw as { _id: unknown })._id);
        const o = leagueRaw as { name?: string; slug?: string };
        if (typeof o.name === "string" && typeof o.slug === "string") {
          league = { name: o.name, slug: o.slug };
        }
      } else if (leagueRaw) {
        leagueId = String(leagueRaw);
      }

      return {
        ...rest,
        _id: String(_id),
        state,
        leagueId,
        league,
        participants: (participants ?? []).map((p) =>
          serializeAdminParticipant(p),
        ),
      };
    });

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/events:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const startsAtRaw = body.startsAt;
    if (typeof startsAtRaw !== "string") {
      return NextResponse.json(
        { error: "startsAt es requerido (ISO 8601)" },
        { status: 400 },
      );
    }
    const startsAt = new Date(startsAtRaw);
    if (Number.isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "startsAt inválido" }, { status: 400 });
    }

    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    if (!title) {
      return NextResponse.json({ error: "Título requerido" }, { status: 400 });
    }

    const kind = readKind(body.kind);
    if (!kind) {
      return NextResponse.json({ error: "Tipo de evento inválido" }, { status: 400 });
    }

    const game = readGame(body.game);
    if (!game) {
      return NextResponse.json({ error: "Juego inválido" }, { status: 400 });
    }

    const pokemonSubtype = readPokemonSubtype(body.pokemonSubtype);
    if (pokemonSubtype === null) {
      return NextResponse.json(
        { error: "Subtipo Pokémon inválido" },
        { status: 400 },
      );
    }

    if (
      kind === "tournament" &&
      game === "pokemon" &&
      pokemonSubtype === undefined
    ) {
      return NextResponse.json(
        { error: "Selecciona el tipo de torneo Pokémon (casual, cup o challenge)" },
        { status: 400 },
      );
    }

    let priceClp = 0;
    if (kind === "tournament") {
      const rawPrice = body.priceClp;
      if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) {
        priceClp = Math.round(rawPrice);
      } else if (rawPrice === "0" || rawPrice === 0) {
        priceClp = 0;
      } else if (typeof rawPrice === "string" && rawPrice.trim() !== "") {
        const n = Number(rawPrice);
        if (Number.isFinite(n)) priceClp = Math.round(n);
      }
      if (priceClp < 0 || priceClp > PRICE_MAX) {
        return NextResponse.json(
          { error: "Precio fuera de rango" },
          { status: 400 },
        );
      }
    }

    const rawMax = body.maxParticipants;
    let maxParticipants = 8;
    if (typeof rawMax === "number" && Number.isFinite(rawMax)) {
      maxParticipants = Math.round(rawMax);
    } else if (typeof rawMax === "string" && rawMax.trim() !== "") {
      const n = Number(rawMax);
      if (Number.isFinite(n)) maxParticipants = Math.round(n);
    }
    if (maxParticipants < 1 || maxParticipants > PARTICIPANTS_MAX) {
      return NextResponse.json(
        { error: "Cupo máximo inválido" },
        { status: 400 },
      );
    }

    let roundNum = 0;
    const rawRound = body.roundNum;
    if (rawRound !== undefined && rawRound !== null && rawRound !== "") {
      if (typeof rawRound === "number" && Number.isFinite(rawRound)) {
        roundNum = Math.round(rawRound);
      } else if (typeof rawRound === "string" && rawRound.trim() !== "") {
        const n = Number(rawRound);
        if (Number.isFinite(n)) roundNum = Math.round(n);
      }
    }
    if (roundNum < 0 || roundNum > ROUND_NUM_MAX) {
      return NextResponse.json(
        { error: "Número de ronda inválido" },
        { status: 400 },
      );
    }

    const formatNotes =
      typeof body.formatNotes === "string"
        ? body.formatNotes.trim().slice(0, 2000)
        : "";
    const prizesNotes =
      typeof body.prizesNotes === "string"
        ? body.prizesNotes.trim().slice(0, 2000)
        : "";
    const location =
      typeof body.location === "string"
        ? body.location.trim().slice(0, 500)
        : "";

    let state: WeeklyEventState = "schedule";
    if (body.state !== undefined) {
      const s = readState(body.state);
      if (!s) {
        return NextResponse.json(
          { error: "Estado inválido (schedule, running o close)" },
          { status: 400 },
        );
      }
      state = s;
    }

    await connectDB();

    let leagueOid: mongoose.Types.ObjectId | undefined = undefined;
    if (
      kind === "tournament" &&
      body.leagueId !== undefined &&
      body.leagueId !== null &&
      body.leagueId !== ""
    ) {
      const lid =
        typeof body.leagueId === "string"
          ? body.leagueId.trim()
          : String(body.leagueId);
      if (mongoose.Types.ObjectId.isValid(lid)) {
        const lg = await League.findById(lid).select("_id").lean();
        if (lg) {
          leagueOid = new mongoose.Types.ObjectId(lid);
        }
      }
    }

    const doc = await WeeklyEvent.create({
      startsAt,
      title,
      tournamentOrigin: "official",
      kind,
      game,
      pokemonSubtype:
        kind === "tournament" && game === "pokemon"
          ? pokemonSubtype
          : undefined,
      priceClp: kind === "tournament" ? priceClp : 0,
      maxParticipants,
      formatNotes,
      prizesNotes,
      location,
      state,
      roundNum,
      participants: [],
      ...(leagueOid ? { leagueId: leagueOid } : {}),
    });

    return NextResponse.json({ event: doc.toObject() }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/events:", error);
    return NextResponse.json(
      { error: "Error al crear evento" },
      { status: 500 },
    );
  }
}
