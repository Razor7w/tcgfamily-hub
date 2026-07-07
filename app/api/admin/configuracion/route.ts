import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import connectDB from '@/lib/mongodb'
import { requireStoreOwnerSession } from '@/lib/api-auth'
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
import { getDashboardDocForStore } from '@/lib/dashboard-settings-for-store'
import {
  applyStoreCreditAdminToDoc,
  mergeStoreCreditAdmin,
  normalizeTournamentPointsCustomName,
  resolveTournamentPointsDisplayName,
  validateStoreCreditAdmin,
  type StoreCreditAdminSettings
} from '@/lib/store-credit-admin-settings'
import {
  applyContributionPointsAdminToDoc,
  mergeContributionPointsAdmin,
  normalizeContributionPointsAdminBody,
  validateContributionPointsAdmin,
  type ContributionPointsAdminSettings
} from '@/lib/contribution-points-admin-settings'

function readPickupNotifyEnabled(
  doc: {
    resendNotifyPickupInStoreEnabled?: boolean
  } | null
): boolean {
  return doc?.resendNotifyPickupInStoreEnabled !== false
}

function buildStoreCreditFromBody(
  body: Partial<StoreCreditAdminSettings>
): StoreCreditAdminSettings {
  const tournamentPointsCustomName = normalizeTournamentPointsCustomName(
    body.tournamentPointsCustomName
  )
  return {
    csvEnabled: body.csvEnabled === true,
    tournamentPointsEnabled: body.tournamentPointsEnabled === true,
    tournamentPointsCustomName,
    tournamentPointsLabel: resolveTournamentPointsDisplayName(
      tournamentPointsCustomName
    )
  }
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
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    await connectDB()
    const doc = await getDashboardDocForStore(gate.activeStoreOid.toString())
    const plain = doc.toObject() as {
      visibility?: DashboardModuleSettingsDTO['visibility']
      order?: DashboardModuleSettingsDTO['order']
      shortcuts?: DashboardModuleSettingsDTO['shortcuts']
      resendNotifyPickupInStoreEnabled?: boolean
      mailRegisterDailyLimit?: number
      tournamentPointsEnabled?: boolean
      storeCreditCsvEnabled?: boolean
      storeCreditTournamentPointsEnabled?: boolean
      tournamentPointsDisplayName?: string
      contributionPointsEnabled?: boolean
      contributionTierThresholds?: number[]
      contributionTierLabels?: string[]
      contributionPointRules?: Record<string, number>
    }
    const raw: Partial<DashboardModuleSettingsDTO> | null = {
      visibility: plain.visibility,
      order: plain.order,
      shortcuts: plain.shortcuts,
      storeCredit: mergeStoreCreditAdmin(plain),
      contributionPoints: mergeContributionPointsAdmin(plain)
    }

    const settings = mergeDashboardSettings(raw)
    return NextResponse.json(
      {
        settings,
        resendNotifyPickupInStoreEnabled: readPickupNotifyEnabled(plain),
        mailRegisterDailyLimit: normalizeMailRegisterDailyLimit(
          plain.mailRegisterDailyLimit
        ),
        storeCredit: settings.storeCredit,
        contributionPoints: settings.contributionPoints
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
    const gate = await requireStoreOwnerSession()
    if (!gate.ok) return gate.response

    const body = await request.json()
    const vis = body?.visibility
    const orderRaw = body?.order
    const emailFlag = body?.resendNotifyPickupInStoreEnabled
    const shortcutsBody = body?.shortcuts
    const mailLimitRaw = body?.mailRegisterDailyLimit
    const storeCreditBody = body?.storeCredit as
      | Partial<StoreCreditAdminSettings>
      | undefined
    const tournamentPointsFlag = body?.tournamentPointsEnabled
    const contributionPointsBody = body?.contributionPoints

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
    const updatingTournamentPoints = typeof tournamentPointsFlag === 'boolean'
    const updatingStoreCredit =
      storeCreditBody &&
      typeof storeCreditBody === 'object' &&
      typeof storeCreditBody.csvEnabled === 'boolean' &&
      typeof storeCreditBody.tournamentPointsEnabled === 'boolean'
    const updatingContributionPoints =
      contributionPointsBody != null &&
      normalizeContributionPointsAdminBody(contributionPointsBody) != null

    if (
      !updatingDashboard &&
      !updatingEmail &&
      !updatingShortcuts &&
      !updatingMailRegisterLimit &&
      !updatingTournamentPoints &&
      !updatingStoreCredit &&
      !updatingContributionPoints
    ) {
      return NextResponse.json(
        {
          error:
            'Envía visibility+order, storeCredit, contributionPoints, shortcuts, resendNotifyPickupInStoreEnabled y/o mailRegisterDailyLimit'
        },
        { status: 400 }
      )
    }

    let normalizedOrder: DashboardModuleSettingsDTO['order'] | null = null
    if (updatingDashboard) {
      if (
        typeof vis.weeklyEvents !== 'boolean' ||
        typeof vis.leagues !== 'boolean' ||
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

    const doc = await getDashboardDocForStore(gate.activeStoreOid.toString())

    if (updatingDashboard && normalizedOrder) {
      doc.visibility = {
        weeklyEvents: vis.weeklyEvents,
        leagues: vis.leagues,
        recentPublicDecklists: true,
        myTournaments: vis.myTournaments,
        statistics: vis.statistics,
        mail: vis.mail,
        storePoints: vis.storePoints
      }
      doc.order = normalizedOrder

      if (
        storeCreditBody &&
        typeof storeCreditBody.csvEnabled === 'boolean' &&
        typeof storeCreditBody.tournamentPointsEnabled === 'boolean'
      ) {
        const next = buildStoreCreditFromBody(storeCreditBody)
        const validationError = validateStoreCreditAdmin(next)
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 })
        }
        applyStoreCreditAdminToDoc(doc, next)
      }
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

    if (updatingTournamentPoints) {
      doc.storeCreditTournamentPointsEnabled = tournamentPointsFlag
      doc.tournamentPointsEnabled = tournamentPointsFlag
    }

    if (updatingStoreCredit && storeCreditBody) {
      const next = buildStoreCreditFromBody(storeCreditBody)
      const validationError = validateStoreCreditAdmin(next)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
      applyStoreCreditAdminToDoc(doc, next)
    }

    if (updatingContributionPoints) {
      const next = normalizeContributionPointsAdminBody(
        contributionPointsBody
      ) as ContributionPointsAdminSettings
      const validationError = validateContributionPointsAdmin(next)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
      applyContributionPointsAdminToDoc(doc, next)
    }

    await doc.save()

    if (updatingMailRegisterLimit) {
      invalidateMailRegisterDailyLimitCache(gate.activeStoreOid.toString())
    }

    const dShortcuts = doc.shortcuts as
      | DashboardModuleSettingsDTO['shortcuts']
      | undefined
    const settings = mergeDashboardSettings({
      visibility: doc.visibility,
      order: doc.order as DashboardModuleSettingsDTO['order'],
      shortcuts: dShortcuts,
      storeCredit: mergeStoreCreditAdmin(doc),
      contributionPoints: mergeContributionPointsAdmin(doc)
    })

    revalidatePath('/', 'layout')
    revalidatePath('/admin/puntos')
    revalidatePath('/admin/contribucion')
    revalidatePath('/admin/configuracion')
    revalidatePath('/dashboard', 'layout')
    revalidatePath('/dashboard/tu-actividad')
    revalidatePath('/dashboard/eventos')
    revalidatePath('/dashboard/torneos-semana')
    revalidatePath('/dashboard/mail')
    revalidatePath('/dashboard/mail/registrar-multiples')
    revalidatePath('/dashboard/estadisticas')
    revalidatePath('/admin/ligas')

    return NextResponse.json(
      {
        settings,
        resendNotifyPickupInStoreEnabled: readPickupNotifyEnabled(doc),
        mailRegisterDailyLimit: normalizeMailRegisterDailyLimit(
          doc.mailRegisterDailyLimit
        ),
        storeCredit: settings.storeCredit,
        contributionPoints: settings.contributionPoints
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
