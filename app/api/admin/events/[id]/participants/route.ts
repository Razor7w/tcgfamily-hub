import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import WeeklyEvent from "@/models/WeeklyEvent";

/**
 * PATCH — Confirmar o anular confirmación de participación (por userId del preinscrito).
 * Localiza el índice del participante comparando userId como string (ObjectId o string en BSON)
 * y hace $set en `participants.{idx}.confirmed` para evitar fallos del operador `$` posicional.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    if (!eventId?.trim()) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const rec =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};
    const userIdRaw = rec.userId;
    const confirmedRaw = rec.confirmed;

    if (typeof userIdRaw !== "string" || !userIdRaw.trim()) {
      return NextResponse.json(
        { error: "userId del participante es requerido" },
        { status: 400 },
      );
    }
    if (typeof confirmedRaw !== "boolean") {
      return NextResponse.json(
        { error: "confirmed debe ser booleano" },
        { status: 400 },
      );
    }

    const userIdNormalized = userIdRaw.trim();

    try {
      new mongoose.Types.ObjectId(userIdNormalized);
    } catch {
      return NextResponse.json({ error: "userId inválido" }, { status: 400 });
    }

    await connectDB();

    let eventObjectId: mongoose.Types.ObjectId;
    try {
      eventObjectId = new mongoose.Types.ObjectId(eventId.trim());
    } catch {
      return NextResponse.json({ error: "ID de evento inválido" }, { status: 400 });
    }

    const raw = await WeeklyEvent.collection.findOne(
      { _id: eventObjectId },
      { projection: { participants: 1 } },
    );

    if (!raw) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const participants = (raw.participants ?? []) as {
      userId?: unknown;
    }[];

    const idx = participants.findIndex(
      (p) => p.userId != null && String(p.userId) === userIdNormalized,
    );

    if (idx < 0) {
      return NextResponse.json(
        { error: "No hay participante con ese usuario vinculado" },
        { status: 400 },
      );
    }

    const setPath = `participants.${idx}.confirmed`;

    const result = await WeeklyEvent.collection.updateOne(
      { _id: eventObjectId },
      { $set: { [setPath]: confirmedRaw } },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/admin/events/[id]/participants:", error);
    return NextResponse.json(
      { error: "Error al actualizar participación" },
      { status: 500 },
    );
  }
}
