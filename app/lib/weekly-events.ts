/** Cierra la preinscripción 1 segundo antes de la hora de inicio. */
export const REGISTRATION_CUTOFF_MS_BEFORE_START = 1000;

export function registrationClosesAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() - REGISTRATION_CUTOFF_MS_BEFORE_START);
}

export function canPreRegisterNow(startsAt: Date, now = new Date()): boolean {
  return (
    now.getTime() <= startsAt.getTime() - REGISTRATION_CUTOFF_MS_BEFORE_START
  );
}

/** Puede desinscribirse mientras el evento no haya comenzado. */
export function canUnregisterNow(startsAt: Date, now = new Date()): boolean {
  return now.getTime() < startsAt.getTime();
}

export const DISPLAY_NAME_MAX = 80;

export function normalizeDisplayName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, DISPLAY_NAME_MAX);
}
