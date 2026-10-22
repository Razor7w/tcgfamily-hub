export const SHIFT_NOTE_BODY_MAX = 2000
export const SHIFT_NOTE_OPEN_LIMIT = 80
export const SHIFT_NOTE_DONE_LIMIT = 30
export const SHIFT_NOTE_IMAGE_MAX_MB = 8

export type ShiftNoteStatus = 'open' | 'done'

export type ShiftNoteDto = {
  id: string
  body: string
  imageUrl: string | null
  status: ShiftNoteStatus
  createdAt: string
  authorId: string
  authorName: string
  resolvedAt: string | null
  resolvedByName: string | null
}

export function normalizeShiftNoteBody(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/\r\n/g, '\n').trim()
}

export function isValidShiftNoteBody(body: string): boolean {
  return body.length > 0 && body.length <= SHIFT_NOTE_BODY_MAX
}
