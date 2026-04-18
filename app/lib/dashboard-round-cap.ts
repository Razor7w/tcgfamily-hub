/**
 * Tope opcional de ronda para el dashboard público: si el torneo va por la ronda 5
 * pero el tope es 4, los jugadores ven «ronda 4» y los emparejamientos del snapshot 4.
 * `0` o ausente = sin tope.
 */

export function normalizeStoredDashboardRoundCap(
  raw: unknown,
): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(n)) return undefined;
  const r = Math.round(n);
  if (r <= 0) return undefined;
  return Math.min(99, Math.max(1, r));
}

export function effectivePublicRoundNum(
  roundNum: unknown,
  dashboardRoundCap: unknown,
): number {
  const r =
    typeof roundNum === "number" && Number.isFinite(roundNum)
      ? Math.max(0, Math.round(roundNum))
      : 0;
  const cap = normalizeStoredDashboardRoundCap(dashboardRoundCap);
  if (cap === undefined) return r;
  return Math.min(r, cap);
}
