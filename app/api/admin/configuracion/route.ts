import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import connectDB from '@/lib/mongodb'
import { requireAdminSession } from '@/lib/api-auth'
import {
  MAIL_REGISTER_DAILY_LIMIT,
  MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX
} from '@/lib/mail-register-constants'
import { invalidateMailRegisterDailyLimitCache } from '@/lib/mail-register-daily'
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

function normalizeMailRegisterDailyLimit(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return MAIL_REGISTER_DAILY_LIMIT
  }
  const r = Math.round(raw)
  return Math.min(MAIL_REGISTER_DAILY_LIMIT_ADMIN_MAX, Math.max(1, r))
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
      mailRegisterDailyLimit?: number
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
        resendNotifyPickupInStoreEnabled: readPickupNotifyEnabled(d),
        mailRegisterDailyLimit: normalizeMailRegisterDailyLimit(
          d?.mailRegisterDailyLimit
        )
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
    const mailLimitRaw = body?.mailRegisterDailyLimit

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
      typeof shortcutsBody.createTournament === 'boolean' &&
      typeof (shortcutsBody as { playPokemonDecklistPdf?: boolean })
        .playPokemonDecklistPdf === 'boolean'
    const updatingMailRegisterLimit =
      typeof mailLimitRaw === 'number' && Number.isFinite(mailLimitRaw)

    if (
      !updatingDashboard &&
      !updatingEmail &&
      !updatingShortcuts &&
      !updatingMailRegisterLimit
    ) {
      return NextResponse.json(
        {
          error:
            'Envía visibility+order, shortcuts (createMail, createTournament, playPokemonDecklistPdf), resendNotifyPickupInStoreEnabled (boolean) y/o mailRegisterDailyLimit (número)'
        },
        { status: 400 }
      )
    }

    let normalizedOrder: DashboardModuleSettingsDTO['order'] | null = null
    if (updatingDashboard) {
      if (
        typeof vis.weeklyEvents !== 'boolean' ||
        typeof vis.recentPublicDecklists !== 'boolean' ||
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
        recentPublicDecklists: vis.recentPublicDecklists,
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
      const sb = shortcutsBody as {
        createMail: boolean
        createTournament: boolean
        playPokemonDecklistPdf: boolean
      }
      doc.set('shortcuts', {
        createMail: sb.createMail,
        createTournament: sb.createTournament,
        playPokemonDecklistPdf: sb.playPokemonDecklistPdf
      })
    }

    if (updatingMailRegisterLimit) {
      doc.mailRegisterDailyLimit = normalizeMailRegisterDailyLimit(mailLimitRaw)
    }

    await doc.save()

    if (updatingMailRegisterLimit) {
      invalidateMailRegisterDailyLimitCache()
    }

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
    revalidatePath('/dashboard/mail/registrar-multiples')
    revalidatePath('/dashboard/estadisticas')

    return NextResponse.json(
      {
        settings,
        resendNotifyPickupInStoreEnabled: readPickupNotifyEnabled(doc),
        mailRegisterDailyLimit: normalizeMailRegisterDailyLimit(
          doc.mailRegisterDailyLimit
        )
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
