import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import {
  ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER,
  adminWeeklyEventForbiddenResponse,
} from "@/lib/admin-weekly-event-access";
import connectDB from "@/lib/mongodb";
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
  if (v === undefined) return undefined;
  if (v === null || v === "") return undefined;
  if (v === "casual" || v === "cup" || v === "challenge") return v;
  return null;
}

function readState(v: unknown): WeeklyEventState | null {
  if (v === "schedule" || v === "running" || v === "close") return v;
  return null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = parseBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    await connectDB();
    const doc = await WeeklyEvent.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    const forbidden = adminWeeklyEventForbiddenResponse(doc);
    if (forbidden) return forbidden;

    if (typeof body.startsAt === "string") {
      const d = new Date(body.startsAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "startsAt inválido" }, { status: 400 });
      }
      doc.startsAt = d;
    }

    if (typeof body.title === "string") {
      const t = body.title.trim().slice(0, 200);
      if (!t) {
        return NextResponse.json({ error: "Título vacío" }, { status: 400 });
      }
      doc.title = t;
    }

    if (body.kind !== undefined) {
      const kind = readKind(body.kind);
      if (!kind) {
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
      }
      doc.kind = kind;
    }

    if (body.game !== undefined) {
      const game = readGame(body.game);
      if (!game) {
        return NextResponse.json({ error: "Juego inválido" }, { status: 400 });
      }
      doc.game = game;
    }

    if (body.pokemonSubtype !== undefined) {
      const st = readPokemonSubtype(body.pokemonSubtype);
      if (st === null) {
        return NextResponse.json(
          { error: "Subtipo Pokémon inválido" },
          { status: 400 },
        );
      }
      doc.pokemonSubtype = st;
    }

    if (doc.kind === "tournament" && doc.game === "pokemon" && !doc.pokemonSubtype) {
      return NextResponse.json(
        { error: "Selecciona el tipo de torneo Pokémon" },
        { status: 400 },
      );
    }

    if (doc.kind !== "tournament" || doc.game !== "pokemon") {
      doc.pokemonSubtype = undefined;
    }

    if (doc.kind !== "tournament") {
      doc.priceClp = 0;
    }

    if (body.priceClp !== undefined && doc.kind === "tournament") {
      let priceClp = doc.priceClp;
      const rawPrice = body.priceClp;
      if (typeof rawPrice === "number" && Number.isFinite(rawPrice)) {
        priceClp = Math.round(rawPrice);
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
      doc.priceClp = priceClp;
    }

    if (body.maxParticipants !== undefined) {
      const rawMax = body.maxParticipants;
      let maxParticipants = doc.maxParticipants;
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
      if (doc.participants.length > maxParticipants) {
        return NextResponse.json(
          {
            error:
              "No puedes bajar el cupo por debajo de la cantidad de preinscritos actuales",
          },
          { status: 400 },
        );
      }
      doc.maxParticipants = maxParticipants;
    }

    if (typeof body.formatNotes === "string") {
      doc.formatNotes = body.formatNotes.trim().slice(0, 2000);
    }
    if (typeof body.prizesNotes === "string") {
      doc.prizesNotes = body.prizesNotes.trim().slice(0, 2000);
    }
    if (typeof body.location === "string") {
      doc.location = body.location.trim().slice(0, 500);
    }

    if (body.state !== undefined) {
      const s = readState(body.state);
      if (!s) {
        return NextResponse.json(
          { error: "Estado inválido (schedule, running o close)" },
          { status: 400 },
        );
      }
      doc.state = s;
    }

    if (body.roundNum !== undefined) {
      const rawRound = body.roundNum;
      let roundNum = typeof doc.roundNum === "number" ? doc.roundNum : 0;
      if (rawRound !== null && rawRound !== "") {
        if (typeof rawRound === "number" && Number.isFinite(rawRound)) {
          roundNum = Math.round(rawRound);
        } else if (typeof rawRound === "string" && rawRound.trim() !== "") {
          const n = Number(rawRound);
          if (Number.isFinite(n)) roundNum = Math.round(n);
        }
      } else {
        roundNum = 0;
      }
      if (roundNum < 0 || roundNum > ROUND_NUM_MAX) {
        return NextResponse.json(
          { error: "Número de ronda inválido" },
          { status: 400 },
        );
      }
      doc.roundNum = roundNum;
    }

    if (body.leagueId !== undefined) {
      if (doc.kind !== "tournament" || doc.tournamentOrigin !== "official") {
        doc.set("leagueId", undefined);
      } else if (body.leagueId === null || body.leagueId === "") {
        doc.set("leagueId", undefined);
      } else {
        const lid =
          typeof body.leagueId === "string"
            ? body.leagueId.trim()
            : String(body.leagueId);
        if (!mongoose.Types.ObjectId.isValid(lid)) {
          return NextResponse.json({ error: "leagueId inválido" }, { status: 400 });
        }
        const lg = await League.findById(lid).select("_id").lean();
        if (!lg) {
          return NextResponse.json({ error: "Liga no encontrada" }, { status: 400 });
        }
        doc.leagueId = new mongoose.Types.ObjectId(lid);
      }
    }

    if (body.dashboardRoundCap !== undefined) {
      if (doc.kind !== "tournament") {
        doc.dashboardRoundCap = 0;
      } else {
        const raw = body.dashboardRoundCap;
        if (raw === null || raw === "") {
          doc.dashboardRoundCap = 0;
        } else {
          const n =
            typeof raw === "number" && Number.isFinite(raw)
              ? Math.round(raw)
              : typeof raw === "string" && raw.trim() !== ""
                ? Number(raw.trim())
                : NaN;
          if (!Number.isFinite(n) || n < 0 || n > 99) {
            return NextResponse.json(
              { error: "Tope de ronda dashboard: número entre 0 y 99 (0 = sin tope)" },
              { status: 400 },
            );
          }
          doc.dashboardRoundCap = n;
        }
      }
    }

    if (doc.kind !== "tournament") {
      doc.dashboardRoundCap = 0;
      doc.set("leagueId", undefined);
    }

    if (doc.tournamentOrigin !== "official") {
      doc.set("leagueId", undefined);
    }

    await doc.save();
    return NextResponse.json({ event: doc.toObject() }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/admin/events/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar evento" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await connectDB();
    const res = await WeeklyEvent.findOneAndDelete({
      _id: id,
      ...ADMIN_WEEKLY_EVENTS_ORIGIN_FILTER,
    });
    if (!res) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/admin/events/[id]:", error);
    return NextResponse.json(
      { error: "Error al eliminar evento" },
      { status: 500 },
    );
  }
}
