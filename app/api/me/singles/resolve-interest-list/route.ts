import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireSellerModuleSession } from '@/lib/seller-module-access'
import { toCardSingleDTO } from '@/lib/card-single-dto'
import {
  interestLineMatchScore,
  parseInterestListMessage
} from '@/lib/parse-interest-list-message'
import connectDB from '@/lib/mongodb'
import CardBinder from '@/models/CardBinder'
import CardSingle from '@/models/CardSingle'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const gate = await requireSellerModuleSession()
    if (!gate.ok) return gate.response
    const session = gate.session

    const body = (await request.json().catch(() => ({}))) as {
      text?: unknown
    }
    const text = typeof body.text === 'string' ? body.text : ''
    const parsed = parseInterestListMessage(text)
    if (!parsed.length) {
      return NextResponse.json({
        matches: [],
        unmatched: [],
        parsedCount: 0,
        error:
          'No se detectaron cartas en el texto. Pega el mensaje con líneas que empiecen con •'
      })
    }

    const userOid = new mongoose.Types.ObjectId(session.user.id)
    await connectDB()

    const [binders, singles] = await Promise.all([
      CardBinder.find({ userId: userOid })
        .select('name')
        .lean<{ _id: mongoose.Types.ObjectId; name: string }[]>(),
      CardSingle.find({ userId: userOid, published: true }).lean()
    ])

    const binderNameById = new Map(binders.map(b => [b._id.toString(), b.name]))

    const pool = singles.map(doc => {
      const dto = toCardSingleDTO(
        doc as unknown as Parameters<typeof toCardSingleDTO>[0]
      )
      return {
        dto,
        binderName: binderNameById.get(dto.binderId) ?? ''
      }
    })

    const used = new Set<string>()
    const matches: {
      single: ReturnType<typeof toCardSingleDTO>
      binderName: string
      parsed: (typeof parsed)[number]
      score: number
    }[] = []
    const unmatched: (typeof parsed)[number][] = []

    for (const line of parsed) {
      let best: (typeof matches)[number] | null = null
      for (const row of pool) {
        if (used.has(row.dto.id)) continue
        const score = interestLineMatchScore(line, {
          name: row.dto.name,
          set: row.dto.set,
          number: row.dto.number,
          language: row.dto.language,
          condition: row.dto.condition,
          priceClp: row.dto.priceClp,
          binderName: row.binderName
        })
        if (score < 10) continue
        if (!best || score > best.score) {
          best = {
            single: row.dto,
            binderName: row.binderName,
            parsed: line,
            score
          }
        }
      }
      if (best) {
        used.add(best.single.id)
        matches.push(best)
      } else {
        unmatched.push(line)
      }
    }

    return NextResponse.json({
      parsedCount: parsed.length,
      matches,
      unmatched
    })
  } catch (e) {
    console.error('POST /api/me/singles/resolve-interest-list:', e)
    return NextResponse.json(
      { error: 'No se pudo interpretar la lista' },
      { status: 500 }
    )
  }
}
