import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import WeeklyEvent from "@/models/WeeklyEvent";
import type { IRoundPairingSnapshot, IRoundSnapshot } from "@/models/WeeklyEvent";

function clampWlt(n: unknown): number {
  return Math.max(0, Math.min(999, Math.round(Number(n) || 0)));
}

function publicPairing(row: IRoundPairingSnapshot) {
  return {
    tableNumber: typeof row.tableNumber === "string" ? row.tableNumber : "",
    player1Name: typeof row.player1Name === "string" ? row.player1Name : "",
    player2Name: typeof row.player2Name === "string" ? row.player2Name : "",
    player1Record: {
      wins: clampWlt(row.player1Record?.wins),
      losses: clampWlt(row.player1Record?.losses),
      ties: clampWlt(row.player1Record?.ties),
    },
    player2Record: {
      wins: clampWlt(row.player2Record?.wins),
      losses: clampWlt(row.player2Record?.losses),
      ties: clampWlt(row.player2Record?.ties),
    },
    isBye: Boolean(row.isBye),
  };
}

type LeanForRound = {
  _id: unknown;
  kind: string;
  roundNum?: number;
  participants?: { userId?: unknown }[];
  roundSnapshots?: IRoundSnapshot[];
};

/** Emparejamientos de la ronda en curso (snapshot guardado por staff). Solo participantes con cuenta. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await connectDB();
    const uid = session.user.id;

    const doc = await WeeklyEvent.findById(id)
      .select("kind roundNum participants.userId roundSnapshots")
      .lean<LeanForRound | null>();

    if (!doc) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    if (doc.kind !== "tournament") {
      return NextResponse.json(
        { error: "Solo aplica a torneos" },
        { status: 400 },
      );
    }

    const isParticipant = (doc.participants ?? []).some(
      (p) => p.userId && String(p.userId) === uid,
    );
    if (!isParticipant) {
      return NextResponse.json(
        { error: "Debes estar inscrito en este evento" },
        { status: 403 },
      );
    }

    const roundNum =
      typeof doc.roundNum === "number" && Number.isFinite(doc.roundNum)
        ? Math.max(0, Math.round(doc.roundNum))
        : 0;

    const snapshots = doc.roundSnapshots ?? [];
    const snap = snapshots.find((s) => s.roundNum === roundNum);

    if (!snap) {
      return NextResponse.json(
        {
          roundNum,
          syncedAt: null,
          hasSnapshot: false,
          pairings: [] as ReturnType<typeof publicPairing>[],
          skipped: [] as { tableNumber: string; reason: string }[],
        },
        { status: 200 },
      );
    }

    const pairings = (snap.pairings ?? []).map((row) => publicPairing(row));
    const skipped = (snap.skipped ?? []).map((s) => ({
      tableNumber:
        typeof s.tableNumber === "string" ? s.tableNumber.slice(0, 40) : "",
      reason: typeof s.reason === "string" ? s.reason.slice(0, 500) : "",
    }));

    return NextResponse.json(
      {
        roundNum,
        syncedAt:
          snap.syncedAt instanceof Date
            ? snap.syncedAt.toISOString()
            : typeof snap.syncedAt === "string"
              ? snap.syncedAt
              : null,
        hasSnapshot: true,
        pairings,
        skipped,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/events/[id]/current-round:", error);
    return NextResponse.json(
      { error: "Error al obtener la ronda" },
      { status: 500 },
    );
  }
}
