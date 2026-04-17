import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import WeeklyEvent from "@/models/WeeklyEvent";
import {
  canPreRegisterNow,
  canUnregisterNow,
  normalizeDisplayName,
} from "@/lib/weekly-events";
import { popidForStorage } from "@/lib/rut-chile";

export async function POST(
  request: Request,
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const displayName = normalizeDisplayName(
      typeof body === "object" && body !== null && "displayName" in body
        ? (body as { displayName?: unknown }).displayName
        : "",
    );
    if (!displayName) {
      return NextResponse.json(
        { error: "Ingresa un nombre válido" },
        { status: 400 },
      );
    }

    await connectDB();
    const now = new Date();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    const existing = await WeeklyEvent.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    if (!canPreRegisterNow(existing.startsAt, now)) {
      return NextResponse.json(
        { error: "La preinscripción ya cerró para este evento" },
        { status: 400 },
      );
    }

    const already = existing.participants.some(
      (p: { userId?: mongoose.Types.ObjectId }) =>
        p.userId && String(p.userId) === String(userId),
    );
    if (already) {
      return NextResponse.json(
        { error: "Ya estás preinscrito en este evento" },
        { status: 400 },
      );
    }

    if (existing.participants.length >= existing.maxParticipants) {
      return NextResponse.json(
        { error: "Se alcanzó el cupo máximo" },
        { status: 400 },
      );
    }

    const userDoc = await User.findById(session.user.id).select("popid");
    const popId = popidForStorage(
      userDoc && typeof userDoc.popid === "string" ? userDoc.popid : "",
    );

    existing.participants.push({
      displayName,
      userId,
      createdAt: now,
      popId,
      table: "",
      opponentId: "",
    });
    await existing.save();

    return NextResponse.json(
      {
        ok: true,
        participantNames: existing.participants.map(
          (p: { displayName: string }) => p.displayName,
        ),
        participantCount: existing.participants.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/events/[id]/register:", error);
    return NextResponse.json(
      { error: "Error al preinscribirse" },
      { status: 500 },
    );
  }
}

/** Quita la preinscripción del usuario actual. */
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
    const now = new Date();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    const existing = await WeeklyEvent.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    if (!canUnregisterNow(existing.startsAt, now)) {
      return NextResponse.json(
        { error: "Ya no puedes desinscribirte (el evento ya comenzó)" },
        { status: 400 },
      );
    }

    const had = existing.participants.some(
      (p: { userId?: mongoose.Types.ObjectId }) =>
        p.userId && String(p.userId) === String(userId),
    );
    if (!had) {
      return NextResponse.json(
        { error: "No estás preinscrito en este evento" },
        { status: 400 },
      );
    }

    const myEntry = existing.participants.find(
      (p: { userId?: mongoose.Types.ObjectId; confirmed?: boolean }) =>
        p.userId && String(p.userId) === String(userId),
    );
    if (myEntry?.confirmed) {
      return NextResponse.json(
        {
          error:
            "No puedes desinscribirte: tu asistencia ya fue confirmada por la tienda.",
        },
        { status: 400 },
      );
    }

    existing.participants = existing.participants.filter(
      (p: { userId?: mongoose.Types.ObjectId }) =>
        !(p.userId && String(p.userId) === String(userId)),
    );
    await existing.save();

    return NextResponse.json(
      {
        ok: true,
        participantNames: existing.participants.map(
          (p: { displayName: string }) => p.displayName,
        ),
        participantCount: existing.participants.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE /api/events/[id]/register:", error);
    return NextResponse.json(
      { error: "Error al desinscribirse" },
      { status: 500 },
    );
  }
}
