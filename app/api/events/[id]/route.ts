import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import WeeklyEvent from "@/models/WeeklyEvent";
import {
  canPreRegisterNow,
  canUnregisterNow,
  pairingExtrasForUser,
} from "@/lib/weekly-events";

type LeanEvent = {
  _id: unknown;
  startsAt: Date;
  title: string;
  kind: string;
  game: string;
  pokemonSubtype?: string;
  priceClp: number;
  maxParticipants: number;
  formatNotes?: string;
  prizesNotes?: string;
  location?: string;
  roundNum?: number;
  participants?: {
    _id: unknown;
    displayName: string;
    userId?: unknown;
    confirmed?: boolean;
    table?: string;
    opponentId?: string;
  }[];
};

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
    const now = new Date();

    const doc = await WeeklyEvent.findById(id).lean<LeanEvent | null>();
    if (!doc) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const startsAt = doc.startsAt;
    const uid = session.user.id;
    const parts = doc.participants ?? [];
    const mine = parts.find(
      (p) =>
        p.userId &&
        String(p.userId) === uid,
    );
    const myRegistration = mine?.displayName ?? null;
    const myAttendanceConfirmed = Boolean(mine?.confirmed);
    const roundNum =
      typeof doc.roundNum === "number" && Number.isFinite(doc.roundNum)
        ? Math.max(0, Math.round(doc.roundNum))
        : 0;
    const { myTable, myOpponentName } = pairingExtrasForUser(parts, uid);
    const event = {
      _id: String(doc._id),
      startsAt: startsAt.toISOString(),
      title: doc.title,
      kind: doc.kind,
      game: doc.game,
      pokemonSubtype: doc.pokemonSubtype ?? null,
      priceClp: doc.priceClp,
      maxParticipants: doc.maxParticipants,
      formatNotes: doc.formatNotes ?? "",
      prizesNotes: doc.prizesNotes ?? "",
      location: doc.location ?? "",
      roundNum,
      participantNames: parts.map((p) => p.displayName),
      participantCount: parts.length,
      canPreRegister: canPreRegisterNow(startsAt, now),
      myRegistration,
      myAttendanceConfirmed,
      myTable,
      myOpponentName,
      canUnregister:
        Boolean(myRegistration) &&
        canUnregisterNow(startsAt, now) &&
        !myAttendanceConfirmed,
    };

    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error("GET /api/events/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener evento" },
      { status: 500 },
    );
  }
}
