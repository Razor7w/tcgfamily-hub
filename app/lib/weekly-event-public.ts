import { popidForStorage } from "@/lib/rut-chile";

export type TournamentStandingLean = {
  categoryIndex?: number;
  finished?: { popId: string; place: number }[];
  dnf?: { popId: string }[];
};

export function categoryLabelEs(categoryIndex: number): string {
  if (categoryIndex === 0) return "Júnior";
  if (categoryIndex === 1) return "Sénior";
  return "Máster";
}

export function buildTournamentStandingsPublic(
  standings: TournamentStandingLean[] | undefined,
  participants: { displayName: string; popId?: string }[],
  userPopIdRaw: string | undefined,
): {
  standingsTopByCategory: {
    categoryIndex: number;
    rows: { place: number; displayName: string }[];
  }[];
  myTournamentPlacement: {
    categoryIndex: number;
    categoryLabel: string;
    place: number | null;
    isDnf: boolean;
  } | null;
} {
  const popToName = new Map<string, string>();
  for (const p of participants) {
    const k = popidForStorage(typeof p.popId === "string" ? p.popId : "");
    if (k) popToName.set(k, p.displayName || "—");
  }
  const myNorm = userPopIdRaw ? popidForStorage(userPopIdRaw) : "";

  const standingsTopByCategory: {
    categoryIndex: number;
    rows: { place: number; displayName: string }[];
  }[] = [];
  let myTournamentPlacement: {
    categoryIndex: number;
    categoryLabel: string;
    place: number | null;
    isDnf: boolean;
  } | null = null;

  for (const cat of standings ?? []) {
    const ci =
      typeof cat.categoryIndex === "number" ? Math.round(cat.categoryIndex) : -1;
    if (ci !== 0 && ci !== 1 && ci !== 2) continue;

    const sorted = [...(cat.finished ?? [])].sort((a, b) => a.place - b.place);
    const top8 = sorted.slice(0, 8).map((row) => ({
      place: Math.max(0, Math.round(Number(row.place) || 0)),
      displayName: popToName.get(popidForStorage(row.popId))?.trim() || "—",
    }));
    if (top8.length > 0) {
      standingsTopByCategory.push({ categoryIndex: ci, rows: top8 });
    }

    if (myNorm && !myTournamentPlacement) {
      const fin = sorted.find(
        (r) => popidForStorage(r.popId) === myNorm,
      );
      if (fin) {
        myTournamentPlacement = {
          categoryIndex: ci,
          categoryLabel: categoryLabelEs(ci),
          place: Math.max(0, Math.round(Number(fin.place) || 0)),
          isDnf: false,
        };
      } else if (
        (cat.dnf ?? []).some((d) => popidForStorage(d.popId) === myNorm)
      ) {
        myTournamentPlacement = {
          categoryIndex: ci,
          categoryLabel: categoryLabelEs(ci),
          place: null,
          isDnf: true,
        };
      }
    }
  }

  return { standingsTopByCategory, myTournamentPlacement };
}
