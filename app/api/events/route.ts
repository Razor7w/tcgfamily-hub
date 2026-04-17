import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import WeeklyEvent from "@/models/WeeklyEvent";
import type { WeeklyEventState } from "@/models/WeeklyEvent";
import {
  canPreRegisterNow,
  canUnregisterNow,
  pairingExtrasForUser,
} from "@/lib/weekly-events";

function toPublicEvent(
  doc: {
    _id: unknown;
    startsAt: Date;
    title: string;
    kind: string;
    game: string;
    pokemonSubtype?: string;
    state?: WeeklyEventState;
    priceClp: number;
    maxParticipants: number;
    formatNotes: string;
    prizesNotes: string;
    location: string;
    roundNum?: number;
    participants: {
      _id: unknown;
      displayName: string;
      userId?: unknown;
      confirmed?: boolean;
      table?: string;
      opponentId?: string;
    }[];
  },
  now: Date,
  currentUserId?: string,
) {
  const startsAt = doc.startsAt;
  const roundNum =
    typeof doc.roundNum === "number" && Number.isFinite(doc.roundNum)
      ? Math.max(0, Math.round(doc.roundNum))
      : 0;
  let myRegistration: string | null = null;
  let myAttendanceConfirmed = false;
  if (currentUserId) {
    const mine = doc.participants.find(
      (p) => p.userId && String(p.userId) === currentUserId,
    );
    myRegistration = mine?.displayName ?? null;
    myAttendanceConfirmed = Boolean(mine?.confirmed);
  }
  const { myTable, myOpponentName } = pairingExtrasForUser(
    doc.participants,
    currentUserId,
  );
  const canUnregister =
    Boolean(myRegistration) &&
    canUnregisterNow(startsAt, now) &&
    !myAttendanceConfirmed;
  return {
    _id: String(doc._id),
    startsAt: startsAt.toISOString(),
    title: doc.title,
    kind: doc.kind,
    game: doc.game,
    pokemonSubtype: doc.pokemonSubtype ?? null,
    priceClp: doc.priceClp,
    maxParticipants: doc.maxParticipants,
    formatNotes: doc.formatNotes,
    prizesNotes: doc.prizesNotes,
    location: doc.location,
    state:
      doc.state === "schedule" ||
      doc.state === "running" ||
      doc.state === "close"
        ? doc.state
        : "schedule",
    roundNum,
    participantNames: doc.participants.map((p) => p.displayName),
    participantCount: doc.participants.length,
    canPreRegister: canPreRegisterNow(startsAt, now),
    myRegistration,
    myAttendanceConfirmed,
    myTable,
    myOpponentName,
    canUnregister,
  };
}

/** Lista eventos en un rango de fechas (para la vista semanal). Requiere sesión. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const fromRaw = searchParams.get("from");
    const toRaw = searchParams.get("to");
    if (!fromRaw || !toRaw) {
      return NextResponse.json(
        { error: "Parámetros from y to requeridos (ISO 8601)" },
        { status: 400 },
      );
    }

    const from = new Date(fromRaw);
    const to = new Date(toRaw);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
    }

    await connectDB();
    const now = new Date();

    const docs = await WeeklyEvent.find({
      startsAt: { $gte: from, $lte: to },
    })
      .sort({ startsAt: 1 })
      .lean();

    const events = docs.map((d) =>
      toPublicEvent(
        {
          _id: d._id,
          startsAt: d.startsAt,
          title: d.title,
          kind: d.kind,
          game: d.game,
          pokemonSubtype: d.pokemonSubtype,
          priceClp: d.priceClp,
          maxParticipants: d.maxParticipants,
          formatNotes: d.formatNotes ?? "",
          prizesNotes: d.prizesNotes ?? "",
          location: d.location ?? "",
          state: d.state,
          roundNum: d.roundNum,
          participants: (d.participants ?? []) as unknown as {
            _id: unknown;
            displayName: string;
            userId?: unknown;
            confirmed?: boolean;
            table?: string;
            opponentId?: string;
          }[],
        },
        now,
        userId,
      ),
    );

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("GET /api/events:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 },
    );
  }
}
