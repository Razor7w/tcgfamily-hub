import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage
} from 'pdf-lib'
import {
  parseDecklistText,
  type DeckCardLine,
  type DeckSectionId
} from '@/lib/decklist'
import {
  PLAY_POKEMON_PDF_CALIBRATION,
  type PlayPokemonPdfCalibration
} from '@/lib/play-pokemon-pdf-calibration'

export type AgeDivisionPdf = 'junior' | 'senior' | 'masters'

export type PlayPokemonDecklistPdfInput = {
  deckText: string
  playerName: string
  playerId: string
  /** ISO yyyy-mm-dd */
  dateOfBirthIso: string
  ageDivision: AgeDivisionPdf
}

/** Desplaza todo el texto superpuesto (pt). La plantilla PNG no se mueve. */
export type PlayPokemonDecklistPdfOptions = Partial<PlayPokemonPdfCalibration>

type CalPt = { ox: number; oy: number }

type DobSegmentValues = { month: string; day: string; year: string }

function pickCalOffsetX(
  overrides: PlayPokemonDecklistPdfOptions | undefined
): number {
  if (overrides != null && typeof overrides.offsetX === 'number') {
    return overrides.offsetX
  }
  return PLAY_POKEMON_PDF_CALIBRATION.offsetX
}

function pickCalOffsetY(
  overrides: PlayPokemonDecklistPdfOptions | undefined
): number {
  if (overrides != null && typeof overrides.offsetY === 'number') {
    return overrides.offsetY
  }
  return PLAY_POKEMON_PDF_CALIBRATION.offsetY
}

function resolveCalibration(overrides?: PlayPokemonDecklistPdfOptions): CalPt {
  return { ox: pickCalOffsetX(overrides), oy: pickCalOffsetY(overrides) }
}

/** Plantilla visual tipo hoja oficial (pokedata / mismo layout que PDF Play! Pokemon A4). */
export const PLAY_POKEMON_FORM_PNG_URL =
  'https://www.pokedata.ovh/paper/play-pokemon-deck-list-a4.png'

const A4_W = 595.28
const A4_H = 841.89

/** En PDF no hay font-weight CSS: se usa Helvetica (normal) o HelveticaBold. */
export type PlayPokemonPdfFontWeight = 'normal' | 'bold'

export const PLAY_POKEMON_PDF_TEXT_STYLE = {
  playerName: {
    fontSize: 10,
    fontWeight: 'normal' as PlayPokemonPdfFontWeight
  },
  playerId: { fontSize: 10, fontWeight: 'normal' as PlayPokemonPdfFontWeight },
  dateOfBirth: {
    fontSize: 10,
    fontWeight: 'normal' as PlayPokemonPdfFontWeight
  },
  pokemon: { fontSize: 7.2, fontWeight: 'normal' as PlayPokemonPdfFontWeight },
  trainer: { fontSize: 7.2, fontWeight: 'normal' as PlayPokemonPdfFontWeight },
  energy: { fontSize: 7.2, fontWeight: 'normal' as PlayPokemonPdfFontWeight }
} as const

function pdfFontForWeight(
  weight: PlayPokemonPdfFontWeight,
  font: PDFFont,
  fontBold: PDFFont
): PDFFont {
  return weight === 'bold' ? fontBold : font
}

/**
 * Coordenadas en pt (origen abajo-izquierda) sobre la PNG A4 a pantalla completa.
 * Ajusta tambien `PLAY_POKEMON_PDF_CALIBRATION` o los offsets en vista previa.
 */
const FORM = {
  playerName: { x: 85, y: 760 },
  playerId: { x: 290, y: 760 },
  /** Nacimiento en tres casillas: MM / DD / AAAA (coordenadas por segmento) */
  dateOfBirth: {
    y: 760,
    xMonth: 490,
    xDay: 517,
    xYear: 545
  },
  /** Marcas formato (solo Standard rellenado) */
  formatStandard: { x: 147, y: 785 },
  /** Division de edad: una X en la elegida */
  ageJunior: { x: 368, y: 725 },
  ageSenior: { x: 368, y: 710 },
  ageMasters: { x: 368, y: 696 },
  pokemon: {
    xQty: 265,
    xName: 300,
    xSet: 470,
    xColl: 505,
    xReg: 520,
    yFirst: 648,
    dy: 10,
    maxRows: 14
  },
  /** Trainer: dos columnas (12 filas cada una) como en la hoja oficial */
  trainer: {
    xQtyL: 265,
    xNameL: 300,
    xQtyR: 402,
    xNameR: 424,
    yFirst: 470,
    dy: 10,
    rowsPerCol: 12
  },
  energy: {
    xQty: 265,
    xName: 300,
    yFirst: 190,
    dy: 11.9,
    maxRows: 6
  }
}

/** Partes de fecha para casillas separadas (orden US: mes, día, año). */
function parseDobParts(iso: string): DobSegmentValues {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return { month: '', day: '', year: '' }
  return { month: m[2], day: m[3], year: m[1] }
}

function safePdfText(s: string): string {
  let out = ''
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0
    out += c <= 255 ? ch : '?'
  }
  return out
}

function truncate(s: string, max: number): string {
  const t = safePdfText(s.trim())
  if (t.length <= max) return t
  const cut = Math.max(0, max - 3)
  return `${t.slice(0, cut)}...`
}

function collectLines(
  id: DeckSectionId,
  sections: ReturnType<typeof parseDecklistText>['sections']
): DeckCardLine[] {
  const sec = sections.find(s => s.id === id)
  return sec ? sec.cards : []
}

async function loadFormPngBytes(): Promise<Uint8Array> {
  const res = await fetch(PLAY_POKEMON_FORM_PNG_URL, {
    headers: { Accept: 'image/png' }
  })
  if (!res.ok) {
    throw new Error(
      `No se pudo descargar la plantilla A4 (${res.status}). Comprueba la red o vuelve a intentar.`
    )
  }
  return new Uint8Array(await res.arrayBuffer())
}

async function drawFormBackgroundAsync(
  pdf: PDFDocument,
  pngBytes: Uint8Array
): Promise<{ page: PDFPage; font: PDFFont; fontBold: PDFFont }> {
  const page = pdf.addPage([A4_W, A4_H])
  const pngImage = await pdf.embedPng(pngBytes)
  /** Toma toda la pagina A4 para que las coordenadas de texto fijas alineen con la plantilla. */
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: A4_W,
    height: A4_H
  })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  return { page, font, fontBold }
}

function drawPlayerOverlay(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  input: PlayPokemonDecklistPdfInput,
  cal: CalPt
) {
  const n = safePdfText(input.playerName)
  const id = safePdfText(input.playerId)
  const { month, day, year } = parseDobParts(input.dateOfBirthIso)
  const dobM = month ? safePdfText(month) : ''
  const dobD = day ? safePdfText(day) : ''
  const dobY = year ? safePdfText(year) : ''

  const sName = PLAY_POKEMON_PDF_TEXT_STYLE.playerName
  const sId = PLAY_POKEMON_PDF_TEXT_STYLE.playerId
  const sDob = PLAY_POKEMON_PDF_TEXT_STYLE.dateOfBirth
  const fName = pdfFontForWeight(sName.fontWeight, font, fontBold)
  const fId = pdfFontForWeight(sId.fontWeight, font, fontBold)
  const fDob = pdfFontForWeight(sDob.fontWeight, font, fontBold)

  page.drawText(truncate(n, 48), {
    x: FORM.playerName.x + cal.ox,
    y: FORM.playerName.y + cal.oy,
    size: sName.fontSize,
    font: fName,
    color: rgb(0, 0, 0)
  })
  page.drawText(truncate(id, 36), {
    x: FORM.playerId.x + cal.ox,
    y: FORM.playerId.y + cal.oy,
    size: sId.fontSize,
    font: fId,
    color: rgb(0, 0, 0)
  })
  const posDob = FORM.dateOfBirth
  page.drawText(dobM, {
    x: posDob.xMonth + cal.ox,
    y: posDob.y + cal.oy,
    size: sDob.fontSize,
    font: fDob,
    color: rgb(0, 0, 0)
  })
  page.drawText(dobD, {
    x: posDob.xDay + cal.ox,
    y: posDob.y + cal.oy,
    size: sDob.fontSize,
    font: fDob,
    color: rgb(0, 0, 0)
  })
  page.drawText(dobY, {
    x: posDob.xYear + cal.ox,
    y: posDob.y + cal.oy,
    size: sDob.fontSize,
    font: fDob,
    color: rgb(0, 0, 0)
  })

  page.drawText('X', {
    x: FORM.formatStandard.x + cal.ox,
    y: FORM.formatStandard.y + cal.oy,
    size: 9,
    font: fontBold,
    color: rgb(0, 0, 0)
  })

  const agePos =
    input.ageDivision === 'junior'
      ? FORM.ageJunior
      : input.ageDivision === 'senior'
        ? FORM.ageSenior
        : FORM.ageMasters
  page.drawText('X', {
    x: agePos.x + cal.ox,
    y: agePos.y + cal.oy,
    size: 9,
    font: fontBold,
    color: rgb(0, 0, 0)
  })
}

function drawPokemonOverlay(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  cards: DeckCardLine[],
  cal: CalPt
) {
  const st = PLAY_POKEMON_PDF_TEXT_STYLE.pokemon
  const fRow = pdfFontForWeight(st.fontWeight, font, fontBold)
  const { xQty, xName, xSet, xColl, yFirst, dy, maxRows } = FORM.pokemon
  const slice = cards.slice(0, maxRows)
  let i = 0
  for (const c of slice) {
    const y = yFirst - i * dy + cal.oy
    page.drawText(String(c.count), {
      x: xQty + cal.ox,
      y,
      size: st.fontSize,
      font: fRow,
      color: rgb(0, 0, 0)
    })
    page.drawText(truncate(c.name, 22), {
      x: xName + cal.ox,
      y,
      size: st.fontSize,
      font: fRow,
      color: rgb(0, 0, 0)
    })
    page.drawText(truncate(c.set, 5), {
      x: xSet + cal.ox,
      y,
      size: st.fontSize,
      font: fRow,
      color: rgb(0, 0, 0)
    })
    page.drawText(String(c.number), {
      x: xColl + cal.ox,
      y,
      size: st.fontSize,
      font: fRow,
      color: rgb(0, 0, 0)
    })
    i += 1
  }
  if (cards.length > maxRows) {
    page.drawText(`+${cards.length - maxRows} Pokemon (no caben)`, {
      x: xName + cal.ox,
      y: yFirst - maxRows * dy - 2 + cal.oy,
      size: Math.min(6, st.fontSize),
      font: fRow,
      color: rgb(0.5, 0, 0)
    })
  }
}

function drawTrainerOverlay(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  cards: DeckCardLine[],
  cal: CalPt
) {
  const st = PLAY_POKEMON_PDF_TEXT_STYLE.trainer
  const fRow = pdfFontForWeight(st.fontWeight, font, fontBold)
  const { xQtyL, xNameL, xQtyR, xNameR, yFirst, dy, rowsPerCol } = FORM.trainer
  const maxTotal = rowsPerCol * 2
  const slice = cards.slice(0, maxTotal)
  for (let i = 0; i < slice.length; i++) {
    const c = slice[i]
    const col = i < rowsPerCol ? 0 : 1
    const row = col === 0 ? i : i - rowsPerCol
    const y = yFirst - row * dy + cal.oy
    const xQ = (col === 0 ? xQtyL : xQtyR) + cal.ox
    const xN = (col === 0 ? xNameL : xNameR) + cal.ox
    page.drawText(String(c.count), {
      x: xQ,
      y,
      size: st.fontSize,
      font: fRow,
      color: rgb(0, 0, 0)
    })
    page.drawText(truncate(c.name, col === 0 ? 20 : 20), {
      x: xN,
      y,
      size: st.fontSize,
      font: fRow,
      color: rgb(0, 0, 0)
    })
  }
  if (cards.length > maxTotal) {
    page.drawText(`+${cards.length - maxTotal} trainer`, {
      x: xNameL + cal.ox,
      y: yFirst - rowsPerCol * dy - 2 + cal.oy,
      size: Math.min(6, st.fontSize),
      font: fRow,
      color: rgb(0.5, 0, 0)
    })
  }
}

function drawEnergyOverlay(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  cards: DeckCardLine[],
  cal: CalPt
) {
  const st = PLAY_POKEMON_PDF_TEXT_STYLE.energy
  const fRow = pdfFontForWeight(st.fontWeight, font, fontBold)
  const { xQty, xName, yFirst, dy, maxRows } = FORM.energy
  const slice = cards.slice(0, maxRows)
  let i = 0
  for (const c of slice) {
    const y = yFirst - i * dy + cal.oy
    page.drawText(String(c.count), {
      x: xQty + cal.ox,
      y,
      size: st.fontSize,
      font: fRow,
      color: rgb(0, 0, 0)
    })
    page.drawText(truncate(c.name, 32), {
      x: xName + cal.ox,
      y,
      size: st.fontSize,
      font: fRow,
      color: rgb(0, 0, 0)
    })
    i += 1
  }
  if (cards.length > maxRows) {
    page.drawText(`+${cards.length - maxRows} energy`, {
      x: xName + cal.ox,
      y: yFirst - maxRows * dy - 2 + cal.oy,
      size: Math.min(6, st.fontSize),
      font: fRow,
      color: rgb(0.5, 0, 0)
    })
  }
}

/** Pagina extra sin plantilla si hay cartas en "Otros" */
function drawOtherOverflowPage(
  pdf: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont,
  cards: DeckCardLine[],
  cal: CalPt
) {
  const page = pdf.addPage([A4_W, A4_H])
  let y = A4_H - 56
  page.drawText('Otros (no cabian en la hoja principal)', {
    x: 48 + cal.ox,
    y: y + cal.oy,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0)
  })
  y -= 22
  const stOther = PLAY_POKEMON_PDF_TEXT_STYLE.pokemon
  const fOther = pdfFontForWeight(stOther.fontWeight, font, fontBold)
  for (const c of cards) {
    page.drawText(`${c.count} ${truncate(c.name, 40)} ${c.set} ${c.number}`, {
      x: 48 + cal.ox,
      y: y + cal.oy,
      size: stOther.fontSize,
      font: fOther,
      color: rgb(0, 0, 0)
    })
    y -= 14
    if (y < 48) break
  }
}

export async function buildPlayPokemonDecklistPdf(
  input: PlayPokemonDecklistPdfInput,
  options?: PlayPokemonDecklistPdfOptions
): Promise<Uint8Array> {
  const cal = resolveCalibration(options)
  const parsed = parseDecklistText(input.deckText)
  const pokemon = collectLines('pokemon', parsed.sections)
  const trainer = collectLines('trainer', parsed.sections)
  const energy = collectLines('energy', parsed.sections)
  const other = collectLines('other', parsed.sections)

  const pngBytes = await loadFormPngBytes()
  const pdf = await PDFDocument.create()
  const { page, font, fontBold } = await drawFormBackgroundAsync(pdf, pngBytes)

  drawPlayerOverlay(page, font, fontBold, input, cal)
  drawPokemonOverlay(page, font, fontBold, pokemon, cal)
  drawTrainerOverlay(page, font, fontBold, trainer, cal)
  drawEnergyOverlay(page, font, fontBold, energy, cal)

  if (other.length > 0) {
    drawOtherOverflowPage(pdf, font, fontBold, other, cal)
  }

  return pdf.save()
}
