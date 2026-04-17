import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import WeeklyEvent from "@/models/WeeklyEvent";
import { popidForStorage } from "@/lib/rut-chile";

const ROUND_NUM_MAX = 9999;

type MatchInput = {
  tableNumber?: string;
  player1PopId?: string;
  player2PopId?: string;
};

/**
 * POST — Fija la ronda actual del evento y aplica mesa + oponente (por POP ID) según el TDF.
 */
export async function POST(
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

    const rawRound = rec.roundNum;
    let roundNum = 0;
    if (typeof rawRound === "number" && Number.isFinite(rawRound)) {
      roundNum = Math.round(rawRound);
    } else if (typeof rawRound === "string" && rawRound.trim() !== "") {
      const n = Number(rawRound);
      if (Number.isFinite(n)) roundNum = Math.round(n);
    }
    if (roundNum < 0 || roundNum > ROUND_NUM_MAX) {
      return NextResponse.json(
        { error: "Número de ronda inválido" },
        { status: 400 },
      );
    }

    const rawMatches = rec.matches;
    if (!Array.isArray(rawMatches)) {
      return NextResponse.json(
        { error: "Se requiere matches (array)" },
        { status: 400 },
      );
    }

    await connectDB();

    const doc = await WeeklyEvent.findById(eventId.trim());
    if (!doc) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    doc.roundNum = roundNum;

    type Sub = mongoose.Types.Subdocument & {
      popId?: string;
      table?: string;
      opponentId?: string;
      _id: mongoose.Types.ObjectId;
    };

    const participants = doc.participants as unknown as Sub[];

    function findByPop(popRaw: string): Sub | undefined {
      const n = popidForStorage(popRaw);
      if (!n) return undefined;
      return participants.find(
        (p) => popidForStorage(typeof p.popId === "string" ? p.popId : "") === n,
      );
    }

    let applied = 0;
    const skipped: { tableNumber: string; reason: string }[] = [];

    for (const row of rawMatches as MatchInput[]) {
      const tableStr = String(row.tableNumber ?? "").trim();
      const p1Raw = typeof row.player1PopId === "string" ? row.player1PopId : "";
      const p2Raw = typeof row.player2PopId === "string" ? row.player2PopId : "";
      const n1 = popidForStorage(p1Raw);
      const n2 = popidForStorage(p2Raw);

      if (!n1 && !n2) {
        skipped.push({
          tableNumber: tableStr || "—",
          reason: "Sin POP en ambos jugadores",
        });
        continue;
      }

      if (n1 && !n2) {
        const part1 = findByPop(p1Raw);
        if (!part1) {
          skipped.push({
            tableNumber: tableStr || "—",
            reason: `POP ${n1} no está en el listado del evento`,
          });
          continue;
        }
        part1.table = tableStr;
        part1.opponentId = "";
        applied++;
        continue;
      }

      if (!n1 && n2) {
        const part2 = findByPop(p2Raw);
        if (!part2) {
          skipped.push({
            tableNumber: tableStr || "—",
            reason: `POP ${n2} no está en el listado del evento`,
          });
          continue;
        }
        part2.table = tableStr;
        part2.opponentId = "";
        applied++;
        continue;
      }

      const part1 = findByPop(p1Raw);
      const part2 = findByPop(p2Raw);

      if (!part1 || !part2) {
        skipped.push({
          tableNumber: tableStr || "—",
          reason: !part1
            ? `POP ${n1} no está en el listado`
            : `POP ${n2} no está en el listado`,
        });
        continue;
      }

      if (String(part1._id) === String(part2._id)) {
        skipped.push({
          tableNumber: tableStr || "—",
          reason: "Mismo participante",
        });
        continue;
      }

      const id1 = String(part1._id);
      const id2 = String(part2._id);

      part1.table = tableStr;
      part1.opponentId = id2;
      part2.table = tableStr;
      part2.opponentId = id1;
      applied++;
    }

    doc.markModified("participants");
    await doc.save();

    return NextResponse.json(
      {
        ok: true,
        roundNum: doc.roundNum,
        appliedMatches: applied,
        skipped,
        participantCount: doc.participants.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/admin/events/[id]/sync-round:", error);
    return NextResponse.json(
      { error: "Error al setear la ronda" },
      { status: 500 },
    );
  }
}
