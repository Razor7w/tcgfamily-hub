import { NextResponse } from 'next/server'
import { requireStoreOwnerSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import UserSuggestion from '@/models/UserSuggestion'

export const runtime = 'nodejs'

type PopulatedUser = {
  _id: { toString(): string }
  name?: string
  email?: string
  rut?: string
  popid?: string
}

export async function GET() {
  try {
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    await connectDB()

    const docs = await UserSuggestion.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email rut popid')
      .lean<
        Array<{
          _id: { toString(): string }
          text: string
          createdAt?: Date
          updatedAt?: Date
          userId?: PopulatedUser | null
        }>
      >()

    const suggestions = docs.map(doc => {
      const u = doc.userId && typeof doc.userId === 'object' ? doc.userId : null
      return {
        id: doc._id.toString(),
        text: doc.text,
        createdAt:
          doc.createdAt instanceof Date
            ? doc.createdAt.toISOString()
            : new Date().toISOString(),
        updatedAt:
          doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
        user: u
          ? {
              id: u._id.toString(),
              name: typeof u.name === 'string' ? u.name : '',
              email: typeof u.email === 'string' ? u.email : '',
              rut: typeof u.rut === 'string' ? u.rut : '',
              popid: typeof u.popid === 'string' ? u.popid : ''
            }
          : null
      }
    })

    return NextResponse.json(
      { suggestions, total: suggestions.length },
      { status: 200 }
    )
  } catch (e) {
    console.error('GET /api/admin/suggestions:', e)
    return NextResponse.json(
      { error: 'No se pudieron cargar las sugerencias' },
      { status: 500 }
    )
  }
}
