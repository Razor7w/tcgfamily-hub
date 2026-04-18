import {
  buildMatchRecordsFromMatches,
  buildPlayerNameLookup,
  buildRecordsBeforeEachMatch,
  foldStandingsByCategory,
  groupMatchesByRound,
  type ParseTournamentXmlResult,
  type ParsedMatch,
} from "@/lib/tournament-xml";

export type FullTournamentUploadPairingRow = {
  tableNumber: string;
  player1PopId: string;
  player2PopId: string;
  player1Name: string;
  player2Name: string;
  player1Record: { wins: number; losses: number; ties: number };
  player2Record: { wins: number; losses: number; ties: number };
  isBye: boolean;
};

export type FullTournamentUploadSnapshot = {
  roundNum: number;
  pairings: FullTournamentUploadPairingRow[];
  skipped: { tableNumber: string; reason: string }[];
};

export type FullTournamentUploadPayload = {
  roundNum: number;
  roundSnapshots: FullTournamentUploadSnapshot[];
  participants: {
    displayName: string;
    popId: string;
    wins: number;
    losses: number;
    ties: number;
  }[];
  standings: ReturnType<typeof foldStandingsByCategory>;
};

/**
 * Construye el cuerpo para POST /api/admin/events/[id]/full-tournament
 * a partir del XML ya parseado (misma lógica que «Setear ronda» por ronda).
 */
export function buildFullTournamentUploadPayload(
  parsed: ParseTournamentXmlResult,
): FullTournamentUploadPayload {
  const names = buildPlayerNameLookup(parsed.players);
  const matchRecords = buildMatchRecordsFromMatches(parsed.matches);
  const recordsBeforeEachMatch = buildRecordsBeforeEachMatch(parsed.matches);
  const matchIndexByRef = new Map<ParsedMatch, number>();
  parsed.matches.forEach((m, i) => matchIndexByRef.set(m, i));

  const rounds = groupMatchesByRound(parsed.matches);
  const roundSnapshots: FullTournamentUploadSnapshot[] = [];

  for (const [roundNum, list] of rounds) {
    const pairings: FullTournamentUploadPairingRow[] = list.map((m) => {
      const mi = matchIndexByRef.get(m);
      const before =
        mi !== undefined ? recordsBeforeEachMatch[mi] : undefined;
      const p2 = m.player2UserId?.trim() ?? "";
      const isBye = Boolean(m.player1UserId && !p2);
      return {
        tableNumber: m.tableNumber ?? "",
        player1PopId: m.player1UserId,
        player2PopId: p2,
        player1Name: names.get(m.player1UserId) ?? m.player1UserId,
        player2Name: isBye ? "" : names.get(p2) ?? p2,
        player1Record: {
          wins: before?.p1.wins ?? 0,
          losses: before?.p1.losses ?? 0,
          ties: before?.p1.ties ?? 0,
        },
        player2Record: {
          wins: before?.p2.wins ?? 0,
          losses: before?.p2.losses ?? 0,
          ties: before?.p2.ties ?? 0,
        },
        isBye,
      };
    });
    roundSnapshots.push({ roundNum, pairings, skipped: [] });
  }

  const roundNum = roundSnapshots.reduce(
    (max, s) => Math.max(max, s.roundNum),
    0,
  );

  const participants = parsed.players.map((p) => {
    const r = matchRecords.get(p.popId);
    const displayName =
      [p.firstName, p.lastName].filter(Boolean).join(" ").trim() ||
      `Jugador ${p.popId}`;
    return {
      displayName,
      popId: p.popId,
      wins: r?.wins ?? 0,
      losses: r?.losses ?? 0,
      ties: r?.ties ?? 0,
    };
  });

  return {
    roundNum,
    roundSnapshots,
    participants,
    standings: foldStandingsByCategory(parsed.standings),
  };
}
