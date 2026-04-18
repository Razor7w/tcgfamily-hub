import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { adminWeeklyEventForbiddenResponse } from "@/lib/admin-weekly-event-access";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import WeeklyEvent from "@/models/WeeklyEvent";
import type {
  IRoundPairingSnapshot,
  IRoundSnapshot,
  ITournamentCategoryStandings,
} from "@/models/WeeklyEvent";
import { normalizeDisplayName } from "@/lib/weekly-events";
import { popidForStorage, validatePopidOptional } from "@/lib/rut-chile";

const NAME_MAX = 200;
const MAX_PAIRINGS = 512;
const MAX_ROUNDS = 64;
const MAX_PARTICIPANTS_IMPORT = 2048;
const WLT_MAX = 999;
const PLACE_MAX = 9999;

function clampWlt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(WLT_MAX, Math.round(n)));
}

function trimStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

type PairingIn = {
  tableNumber?: unknown;
  player1PopId?: unknown;
  player2PopId?: unknown;
  player1Name?: unknown;
  player2Name?: unknown;
  player1Record?: { wins?: unknown; losses?: unknown; ties?: unknown };
  player2Record?: { wins?: unknown; losses?: unknown; ties?: unknown };
  isBye?: unknown;
};

function sanitizePairingSnapshot(p: PairingIn): IRoundPairingSnapshot {
  const isBye = Boolean(p.isBye);
  return {
    tableNumber: trimStr(p.tableNumber, 40),
    player1PopId: trimStr(p.player1PopId, 32),
    player2PopId: trimStr(p.player2PopId, 32),
    player1Name: trimStr(p.player1Name, NAME_MAX),
    player2Name: trimStr(p.player2Name, NAME_MAX),
    player1Record: {
      wins: clampWlt(p.player1Record?.wins),
      losses: clampWlt(p.player1Record?.losses),
      ties: clampWlt(p.player1Record?.ties),
    },
    player2Record: {
      wins: clampWlt(p.player2Record?.wins),
      losses: clampWlt(p.player2Record?.losses),
      ties: clampWlt(p.player2Record?.ties),
    },
    isBye,
  };
}

function sanitizeStandings(raw: unknown): ITournamentCategoryStandings[] {
  if (!Array.isArray(raw)) return [];
  const out: ITournamentCategoryStandings[] = [];
  for (const row of raw.slice(0, 8)) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const ci = Number(r.categoryIndex);
    if (ci !== 0 && ci !== 1 && ci !== 2) continue;
    const finished: { popId: string; place: number }[] = [];
    if (Array.isArray(r.finished)) {
      for (const f of r.finished.slice(0, MAX_PAIRINGS)) {
        if (typeof f !== "object" || f === null) continue;
        const fr = f as Record<string, unknown>;
        const popId = trimStr(fr.popId, 32);
        if (!popId) continue;
        const place = Math.max(
          0,
          Math.min(PLACE_MAX, Math.round(Number(fr.place) || 0)),
        );
        finished.push({ popId, place });
      }
    }
    const dnf: { popId: string }[] = [];
    if (Array.isArray(r.dnf)) {
      for (const d of r.dnf.slice(0, MAX_PAIRINGS)) {
        if (typeof d !== "object" || d === null) continue;
        const dr = d as Record<string, unknown>;
        const popId = trimStr(dr.popId, 32);
        if (!popId) continue;
        dnf.push({ popId });
      }
    }
    out.push({ categoryIndex: ci, finished, dnf });
  }
  return out;
}

type Sub = mongoose.Types.Subdocument & {
  popId?: string;
  table?: string;
  opponentId?: string;
  wins?: number;
  losses?: number;
  ties?: number;
  displayName?: string;
  userId?: mongoose.Types.ObjectId;
  _id: mongoose.Types.ObjectId;
};

function applyPairingsFromSnapshot(
  participants: Sub[],
  pairings: IRoundPairingSnapshot[],
): void {
  function findByPop(popRaw: string): Sub | undefined {
    const n = popidForStorage(popRaw);
    if (!n) return undefined;
    return participants.find(
      (p) => popidForStorage(typeof p.popId === "string" ? p.popId : "") === n,
    );
  }

  for (const row of pairings) {
    const tableStr = String(row.tableNumber ?? "").trim();
    const p1Raw = typeof row.player1PopId === "string" ? row.player1PopId : "";
    const p2Raw = typeof row.player2PopId === "string" ? row.player2PopId : "";
    const n1 = popidForStorage(p1Raw);
    const n2 = popidForStorage(p2Raw);
    const isBye = row.isBye || Boolean(n1 && !n2);

    if (!n1 && !n2) continue;

    if (isBye && n1) {
      const part1 = findByPop(p1Raw);
      if (part1) {
        part1.table = tableStr;
        part1.opponentId = "";
      }
      continue;
    }

    if (n1 && !n2) {
      const part1 = findByPop(p1Raw);
      if (part1) {
        part1.table = tableStr;
        part1.opponentId = "";
      }
      continue;
    }

    if (!n1 && n2) {
      const part2 = findByPop(p2Raw);
      if (part2) {
        part2.table = tableStr;
        part2.opponentId = "";
      }
      continue;
    }

    const part1 = findByPop(p1Raw);
    const part2 = findByPop(p2Raw);
    if (!part1 || !part2) continue;
    if (String(part1._id) === String(part2._id)) continue;

    const id1 = String(part1._id);
    const id2 = String(part2._id);
    part1.table = tableStr;
    part1.opponentId = id2;
    part2.table = tableStr;
    part2.opponentId = id1;
  }
}

/**
 * POST — Importación completa desde TDF final: participantes, rondas, standings, estado close.
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

    const rawParticipants = rec.participants;
    const rawSnapshots = rec.roundSnapshots;
    const rawRoundNum = rec.roundNum;

    if (!Array.isArray(rawParticipants)) {
      return NextResponse.json(
        { error: "Se requiere participants (array)" },
        { status: 400 },
      );
    }

    let roundNum = 0;
    if (typeof rawRoundNum === "number" && Number.isFinite(rawRoundNum)) {
      roundNum = Math.round(rawRoundNum);
    } else if (typeof rawRoundNum === "string" && rawRoundNum.trim() !== "") {
      const n = Number(rawRoundNum);
      if (Number.isFinite(n)) roundNum = Math.round(n);
    }
    if (roundNum < 0 || roundNum > 9999) {
      return NextResponse.json(
        { error: "roundNum inválido" },
        { status: 400 },
      );
    }

    await connectDB();
    const now = new Date();

    const doc = await WeeklyEvent.findById(eventId.trim());
    if (!doc) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    const forbidden = adminWeeklyEventForbiddenResponse(doc);
    if (forbidden) return forbidden;

    const participantsIn = rawParticipants
      .slice(0, MAX_PARTICIPANTS_IMPORT)
      .map((row) => {
        if (typeof row !== "object" || row === null) return null;
        const r = row as Record<string, unknown>;
        const popRaw = typeof r.popId === "string" ? r.popId : "";
        const displayName = normalizeDisplayName(r.displayName);
        return {
          popRaw,
          displayName,
          wins: clampWlt(r.wins),
          losses: clampWlt(r.losses),
          ties: clampWlt(r.ties),
        };
      })
      .filter(
        (x): x is NonNullable<typeof x> =>
          x !== null && Boolean(x.displayName) && Boolean(x.popRaw.trim()),
      );

    const subs = doc.participants as unknown as Sub[];
    const byPop = new Map<string, Sub>();
    for (const p of subs) {
      const k = popidForStorage(typeof p.popId === "string" ? p.popId : "");
      if (k) byPop.set(k, p);
    }

    const uniquePops = [
      ...new Set(
        participantsIn
          .map((p) => popidForStorage(p.popRaw))
          .filter((k) => k && !validatePopidOptional(k)),
      ),
    ];

    const userDocs =
      uniquePops.length > 0
        ? await User.find({ popid: { $in: uniquePops } })
            .select("_id popid")
            .lean()
        : [];
    const popToUserId = new Map<string, mongoose.Types.ObjectId>();
    for (const u of userDocs) {
      const pid = popidForStorage(typeof u.popid === "string" ? u.popid : "");
      if (pid && u._id) {
        popToUserId.set(pid, u._id as mongoose.Types.ObjectId);
      }
    }

    for (const row of participantsIn) {
      const pop = popidForStorage(row.popRaw);
      const err = validatePopidOptional(pop);
      if (err) continue;

      let sub = byPop.get(pop);
      if (sub) {
        sub.displayName = row.displayName;
        sub.wins = row.wins;
        sub.losses = row.losses;
        sub.ties = row.ties;
      } else {
        const uid = popToUserId.get(pop);
        subs.push({
          displayName: row.displayName,
          userId: uid,
          createdAt: now,
          popId: pop,
          table: "",
          opponentId: "",
          wins: row.wins,
          losses: row.losses,
          ties: row.ties,
          confirmed: false,
        } as unknown as Sub);
        const added = subs[subs.length - 1];
        byPop.set(pop, added);
      }
    }

    doc.maxParticipants = Math.max(doc.maxParticipants, subs.length);

    const snapshotsSanitized: IRoundSnapshot[] = [];
    if (Array.isArray(rawSnapshots)) {
      for (const snap of rawSnapshots.slice(0, MAX_ROUNDS)) {
        if (typeof snap !== "object" || snap === null) continue;
        const s = snap as Record<string, unknown>;
        let rn = 0;
        if (typeof s.roundNum === "number" && Number.isFinite(s.roundNum)) {
          rn = Math.round(s.roundNum);
        }
        if (rn < 0) continue;
        const rawPairings = s.pairings;
        const pairings: IRoundPairingSnapshot[] = [];
        if (Array.isArray(rawPairings)) {
          for (const p of rawPairings.slice(0, MAX_PAIRINGS)) {
            if (typeof p !== "object" || p === null) continue;
            pairings.push(sanitizePairingSnapshot(p as PairingIn));
          }
        }
        const rawSkipped = s.skipped;
        const skipped: { tableNumber: string; reason: string }[] = [];
        if (Array.isArray(rawSkipped)) {
          for (const sk of rawSkipped.slice(0, 256)) {
            if (typeof sk !== "object" || sk === null) continue;
            const skr = sk as Record<string, unknown>;
            skipped.push({
              tableNumber: trimStr(skr.tableNumber, 40),
              reason: trimStr(skr.reason, 500),
            });
          }
        }
        snapshotsSanitized.push({
          roundNum: rn,
          syncedAt: now,
          pairings,
          skipped,
        });
      }
    }

    const maxFromSnaps = snapshotsSanitized.reduce(
      (m, s) => Math.max(m, s.roundNum),
      0,
    );
    doc.roundNum = Math.max(roundNum, maxFromSnaps);
    doc.roundSnapshots = snapshotsSanitized as typeof doc.roundSnapshots;
    doc.state = "close";

    const lastSnap = snapshotsSanitized.reduce<IRoundSnapshot | null>(
      (best, cur) => {
        if (!best || cur.roundNum > best.roundNum) return cur;
        return best;
      },
      null,
    );
    if (lastSnap && lastSnap.pairings.length > 0) {
      applyPairingsFromSnapshot(subs, lastSnap.pairings);
    }

    doc.tournamentStandings = sanitizeStandings(rec.standings) as typeof doc.tournamentStandings;

    doc.markModified("participants");
    doc.markModified("roundSnapshots");
    doc.markModified("tournamentStandings");
    await doc.save();

    return NextResponse.json(
      {
        ok: true,
        roundNum: doc.roundNum,
        state: doc.state,
        participantCount: doc.participants.length,
        roundSnapshotsCount: doc.roundSnapshots?.length ?? 0,
        tournamentStandingsCategories: doc.tournamentStandings?.length ?? 0,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/admin/events/[id]/full-tournament:", error);
    return NextResponse.json(
      { error: "Error al importar el torneo" },
      { status: 500 },
    );
  }
}
