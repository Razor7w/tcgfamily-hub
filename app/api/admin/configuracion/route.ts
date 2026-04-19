import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import connectDB from '@/lib/mongodb'
import { requireAdminSession } from '@/lib/api-auth'
import {
  mergeDashboardSettings,
  normalizeDashboardOrder,
  type DashboardModuleSettingsDTO
} from '@/lib/dashboard-module-config'
import DashboardModuleSettings from '@/models/DashboardModuleSettings'

function readPickupNotifyEnabled(
  doc: {
    resendNotifyPickupInStoreEnabled?: boolean
  } | null
): boolean {
  return doc?.resendNotifyPickupInStoreEnabled !== false
}

export async function GET() {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    await connectDB()
    const doc = await DashboardModuleSettings.findOne().lean()
    const d = doc as {
      visibility?: DashboardModuleSettingsDTO['visibility']
      order?: DashboardModuleSettingsDTO['order']
      shortcuts?: DashboardModuleSettingsDTO['shortcuts']
      resendNotifyPickupInStoreEnabled?: boolean
    } | null
    const raw: Partial<DashboardModuleSettingsDTO> | null = d
      ? {
          visibility: d.visibility,
          order: d.order,
          shortcuts: d.shortcuts
        }
      : null

    const settings = mergeDashboardSettings(raw)
    return NextResponse.json(
      {
        settings,
        resendNotifyPickupInStoreEnabled: readPickupNotifyEnabled(d)
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('GET /api/admin/configuracion:', e)
    return NextResponse.json(
      { error: 'Error al cargar configuración' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    const body = await request.json()
    const vis = body?.visibility
    const orderRaw = body?.order
    const emailFlag = body?.resendNotifyPickupInStoreEnabled
    const shortcutsBody = body?.shortcuts

    const updatingDashboard =
      vis &&
      typeof vis === 'object' &&
      orderRaw !== undefined &&
      orderRaw !== null
    const updatingEmail = typeof emailFlag === 'boolean'
    const updatingShortcuts =
      shortcutsBody &&
      typeof shortcutsBody === 'object' &&
      typeof shortcutsBody.createMail === 'boolean' &&
      typeof shortcutsBody.createTournament === 'boolean'

    if (!updatingDashboard && !updatingEmail && !updatingShortcuts) {
      return NextResponse.json(
        {
          error:
            'Envía visibility+order, shortcuts (createMail, createTournament) y/o resendNotifyPickupInStoreEnabled (boolean)'
        },
        { status: 400 }
      )
    }

    let normalizedOrder: DashboardModuleSettingsDTO['order'] | null = null
    if (updatingDashboard) {
      if (
        typeof vis.weeklyEvents !== 'boolean' ||
        typeof vis.myTournaments !== 'boolean' ||
        typeof vis.statistics !== 'boolean' ||
        typeof vis.mail !== 'boolean' ||
        typeof vis.storePoints !== 'boolean'
      ) {
        return NextResponse.json(
          { error: 'Cada clave de visibility debe ser boolean' },
          { status: 400 }
        )
      }

      normalizedOrder = normalizeDashboardOrder(orderRaw)
      if (!normalizedOrder) {
        return NextResponse.json(
          {
            error:
              'order debe ser una permutación válida de los módulos del dashboard'
          },
          { status: 400 }
        )
      }
    }

    await connectDB()

    let doc = await DashboardModuleSettings.findOne()
    if (!doc) {
      doc = await DashboardModuleSettings.create({})
    }

    if (updatingDashboard && normalizedOrder) {
      doc.visibility = {
        weeklyEvents: vis.weeklyEvents,
        myTournaments: vis.myTournaments,
        statistics: vis.statistics,
        mail: vis.mail,
        storePoints: vis.storePoints
      }
      doc.order = normalizedOrder
    }

    if (updatingEmail) {
      doc.resendNotifyPickupInStoreEnabled = emailFlag
    }

    if (updatingShortcuts) {
      doc.set('shortcuts', {
        createMail: shortcutsBody.createMail,
        createTournament: shortcutsBody.createTournament
      })
    }

    await doc.save()

    const dShortcuts = doc.shortcuts as
      | DashboardModuleSettingsDTO['shortcuts']
      | undefined
    const settings = mergeDashboardSettings({
      visibility: doc.visibility,
      order: doc.order as DashboardModuleSettingsDTO['order'],
      shortcuts: dShortcuts
    })

    revalidatePath('/dashboard', 'layout')
    revalidatePath('/dashboard/eventos')
    revalidatePath('/dashboard/torneos-semana')
    revalidatePath('/dashboard/mail')
    revalidatePath('/dashboard/estadisticas')

    return NextResponse.json(
      {
        settings,
        resendNotifyPickupInStoreEnabled: readPickupNotifyEnabled(doc)
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('PUT /api/admin/configuracion:', e)
    return NextResponse.json(
      { error: 'Error al guardar configuración' },
      { status: 500 }
    )
  }
}
