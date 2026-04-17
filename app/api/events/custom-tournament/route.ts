import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import WeeklyEvent from "@/models/WeeklyEvent";

const TITLE_MAX = 200;

/**
 * Crea un torneo Pokémon "custom" solo para el usuario: nombre y fecha (sin lugar).
 * No aparece en el listado público de eventos de la tienda (`tournamentOrigin: custom`).
 * Estado persistido como cerrado; no sigue el ciclo programado/en curso de torneos oficiales.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const title =
      typeof b.title === "string" ? b.title.trim().slice(0, TITLE_MAX) : "";

    if (title.length < 1) {
      return NextResponse.json(
        { error: "El nombre del torneo es obligatorio" },
        { status: 400 },
      );
    }

    let startsAt = new Date();
    if (typeof b.startsAt === "string" && b.startsAt.trim()) {
      const d = new Date(b.startsAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "Fecha u hora de inicio inválida" },
          { status: 400 },
        );
      }
      startsAt = d;
    }

    let uid: mongoose.Types.ObjectId;
    try {
      uid = new mongoose.Types.ObjectId(session.user.id);
    } catch {
      return NextResponse.json(
        { error: "ID de usuario inválido" },
        { status: 400 },
      );
    }

    const displayName =
      (typeof session.user.name === "string" && session.user.name.trim()) ||
      (typeof session.user.email === "string" && session.user.email.trim()) ||
      "Usuario";

    await connectDB();

    const doc = await WeeklyEvent.create({
      startsAt,
      title,
      location: "",
      kind: "tournament",
      game: "pokemon",
      pokemonSubtype: "casual",
      tournamentOrigin: "custom",
      createdByUserId: uid,
      priceClp: 0,
      maxParticipants: 999,
      formatNotes: "",
      prizesNotes: "",
      state: "close",
      roundNum: 0,
      participants: [
        {
          displayName,
          userId: uid,
          confirmed: true,
          wins: 0,
          losses: 0,
          ties: 0,
        },
      ],
    });

    return NextResponse.json(
      { ok: true, eventId: String(doc._id) },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/events/custom-tournament:", error);
    return NextResponse.json(
      { error: "No se pudo crear el torneo" },
      { status: 500 },
    );
  }
}
