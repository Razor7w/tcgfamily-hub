/**
 * Unifica separadores al buscar códigos de correo: algunos lectores envían
 * apóstrofos u otros caracteres en lugar de guiones (p. ej. 19'04'2026'001 vs 19-04-2026-001).
 */
export function normalizeMailCodeForSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[''`´]/g, "-");
}
