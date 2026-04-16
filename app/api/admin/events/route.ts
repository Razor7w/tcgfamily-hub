import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import WeeklyEvent, {
  type WeeklyEventGame,
  type WeeklyEventKind,
  type PokemonTournamentSubtype,
} from "@/models/WeeklyEvent";

const PRICE_MAX = 99_999_999;
const PARTICIPANTS_MAX = 2048;

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

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectDB();
    const events = await WeeklyEvent.find({})
      .sort({ startsAt: 1 })
      .lean();

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

    await connectDB();

    const doc = await WeeklyEvent.create({
      startsAt,
      title,
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
      participants: [],
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
