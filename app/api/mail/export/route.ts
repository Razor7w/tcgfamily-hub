import { NextRequest, NextResponse } from 'next/server'
import { requireStoreStaffSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import { mongoFilterByStore } from '@/lib/multitenancy/store-scope'
import {
  listMailsForAdminExport,
  parseMailAdminListFiltersFromSearchParams
} from '@/lib/mail-admin-list'
import { buildMailsCsv, mailCsvFilename } from '@/lib/mail-csv-export'

/** GET — CSV de correos de la tienda activa (mismos filtros que el listado). */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireStoreStaffSession()
    if (!gate.ok) return gate.response
    await connectDB()

    const scope = mongoFilterByStore(
      gate.activeStoreOid,
      gate.primaryStoreOid ?? null
    ) as Record<string, unknown>

    const { searchParams } = new URL(request.url)
    const filters = parseMailAdminListFiltersFromSearchParams(searchParams)
    const result = await listMailsForAdminExport({
      storeScope: scope,
      filters
    })

    const csv = buildMailsCsv(result.mails)
    const filename = mailCsvFilename()

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Mail-Export-Count': String(result.mails.length),
        'X-Mail-Export-Total': String(result.total),
        'X-Mail-Export-Truncated': result.truncated ? '1' : '0',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('GET /api/mail/export:', error)
    return NextResponse.json(
      { error: 'Error al exportar correos' },
      { status: 500 }
    )
  }
}
