import { isValidPokedexSlug } from "@/lib/limitless-pokemon-sprite";

export type GameResultLetter = "W" | "L" | "T";
export type TurnOrder = "first" | "second";
export type SpecialRoundOutcome = "intentional_draw" | "no_show" | "bye";

export type ParticipantMatchRoundDTO = {
  /** Id estable del subdocumento en Mongo (si existe). */
  id?: string;
  roundNum: number;
  opponentDeckSlugs: string[];
  gameResults: GameResultLetter[];
  turnOrders: TurnOrder[];
  specialOutcome?: SpecialRoundOutcome | null;
};

const SPECIAL: SpecialRoundOutcome[] = [
  "intentional_draw",
  "no_show",
  "bye",
];

export function summarizeRoundResult(r: ParticipantMatchRoundDTO): string {
  if (r.specialOutcome === "bye") return "Bye";
  if (r.specialOutcome === "intentional_draw") return "ID";
  if (r.specialOutcome === "no_show") return "NS";
  if (r.gameResults.length === 0) return "—";
  return r.gameResults.join("");
}

/** Victoria en la mesa (no cuenta ID como victoria). */
export function isRoundMatchWin(r: ParticipantMatchRoundDTO): boolean {
  if (r.specialOutcome === "bye") return true;
  if (r.specialOutcome === "intentional_draw" || r.specialOutcome === "no_show") {
    return false;
  }
  const w = r.gameResults.filter((g) => g === "W").length;
  const l = r.gameResults.filter((g) => g === "L").length;
  if (r.gameResults.length === 0) return false;
  return w > l;
}

export function isRoundMatchLoss(r: ParticipantMatchRoundDTO): boolean {
  if (r.specialOutcome === "bye" || r.specialOutcome === "intentional_draw") return false;
  if (r.specialOutcome === "no_show") return true;
  const w = r.gameResults.filter((g) => g === "W").length;
  const l = r.gameResults.filter((g) => g === "L").length;
  if (r.gameResults.length === 0) return false;
  return l > w;
}

/** Resultado de la mesa (una ronda): victoria, derrota, empate o sin dato. */
export function roundTableOutcome(
  r: ParticipantMatchRoundDTO,
): "win" | "loss" | "tie" | "neutral" {
  if (r.specialOutcome === "bye") return "win";
  if (r.specialOutcome === "intentional_draw") return "tie";
  if (r.specialOutcome === "no_show") return "loss";
  if (r.gameResults.length === 0) return "neutral";
  if (isRoundMatchWin(r)) return "win";
  if (isRoundMatchLoss(r)) return "loss";
  return "tie";
}

/** Récord agregado por mesas reportadas (W‑L‑T), alineado al torneo sin emparejamientos oficiales. */
/** Convierte subdocumentos `matchRounds` guardados en Mongo a DTOs (p. ej. GET evento / reportes). */
export function parseParticipantMatchRoundsFromLean(
  raw: unknown,
): ParticipantMatchRoundDTO[] {
  if (!Array.isArray(raw)) return [];
  const myMatchRounds: ParticipantMatchRoundDTO[] = [];
  for (const mr of raw) {
    if (!mr || typeof mr !== "object") continue;
    const m = mr as Record<string, unknown>;
    const roundNum = Math.round(Number(m.roundNum));
    if (!Number.isFinite(roundNum)) continue;
    const opponentDeckSlugs = Array.isArray(m.opponentDeckSlugs)
      ? m.opponentDeckSlugs.filter((s): s is string => typeof s === "string")
      : [];
    const gameResults = Array.isArray(m.gameResults)
      ? (m.gameResults.filter((g): g is "W" | "L" | "T" =>
          g === "W" || g === "L" || g === "T",
        ) as ("W" | "L" | "T")[])
      : [];
    const turnOrders = Array.isArray(m.turnOrders)
      ? (m.turnOrders.filter((t): t is "first" | "second" =>
          t === "first" || t === "second",
        ) as ("first" | "second")[])
      : [];
    const special =
      m.specialOutcome === "intentional_draw" ||
      m.specialOutcome === "no_show" ||
      m.specialOutcome === "bye"
        ? m.specialOutcome
        : undefined;
    const row: ParticipantMatchRoundDTO = {
      ...(m._id != null ? { id: String(m._id) } : {}),
      roundNum,
      opponentDeckSlugs,
      gameResults,
      turnOrders,
      ...(special ? { specialOutcome: special } : { specialOutcome: null }),
    };
    myMatchRounds.push(row);
  }
  myMatchRounds.sort((a, b) => a.roundNum - b.roundNum);
  return myMatchRounds;
}

export function matchRecordFromRounds(
  rounds: ParticipantMatchRoundDTO[],
): { wins: number; losses: number; ties: number } {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const r of rounds) {
    const o = roundTableOutcome(r);
    if (o === "win") wins++;
    else if (o === "loss") losses++;
    else if (o === "tie") ties++;
  }
  return { wins, losses, ties };
}

export function normalizeMatchRoundInput(
  raw: unknown,
): ParticipantMatchRoundDTO | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const roundNum = Math.round(Number(o.roundNum));
  if (!Number.isFinite(roundNum) || roundNum < 1 || roundNum > 99) return null;

  const opponentDeckSlugs: string[] = [];
  if (Array.isArray(o.opponentDeckSlugs)) {
    for (const s of o.opponentDeckSlugs) {
      if (typeof s !== "string") return null;
      const t = s.trim().toLowerCase();
      if (!t) continue;
      if (!isValidPokedexSlug(t)) return null;
      if (!opponentDeckSlugs.includes(t)) opponentDeckSlugs.push(t);
      if (opponentDeckSlugs.length > 2) return null;
    }
  }

  let specialOutcome: SpecialRoundOutcome | null | undefined;
  if (o.specialOutcome == null || o.specialOutcome === "") {
    specialOutcome = null;
  } else if (
    typeof o.specialOutcome === "string" &&
    (SPECIAL as string[]).includes(o.specialOutcome)
  ) {
    specialOutcome = o.specialOutcome as SpecialRoundOutcome;
  } else {
    return null;
  }

  const gameResults: GameResultLetter[] = [];
  if (Array.isArray(o.gameResults)) {
    for (const g of o.gameResults) {
      if (g !== "W" && g !== "L" && g !== "T") return null;
      gameResults.push(g);
    }
  }
  if (gameResults.length > 5) return null;

  const turnOrders: TurnOrder[] = [];
  if (Array.isArray(o.turnOrders)) {
    for (const t of o.turnOrders) {
      if (t !== "first" && t !== "second") return null;
      turnOrders.push(t);
    }
  }
  if (turnOrders.length > 0 && turnOrders.length !== gameResults.length) {
    return null;
  }

  if (specialOutcome) {
    return {
      roundNum,
      opponentDeckSlugs: [],
      gameResults: [],
      turnOrders: [],
      specialOutcome,
    };
  }

  if (gameResults.length < 1) return null;

  return {
    roundNum,
    opponentDeckSlugs,
    gameResults,
    turnOrders,
    specialOutcome: null,
  };
}

export function normalizeMatchRoundsPayload(
  raw: unknown,
): ParticipantMatchRoundDTO[] | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { rounds?: unknown };
  if (!Array.isArray(body.rounds)) return null;
  if (body.rounds.length > 40) return null;
  const seen = new Set<number>();
  const out: ParticipantMatchRoundDTO[] = [];
  for (const item of body.rounds) {
    const r = normalizeMatchRoundInput(item);
    if (!r) return null;
    if (seen.has(r.roundNum)) return null;
    seen.add(r.roundNum);
    out.push(r);
  }
  out.sort((a, b) => a.roundNum - b.roundNum);
  return out;
}
