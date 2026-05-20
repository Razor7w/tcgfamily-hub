'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ProductTourJoyride from '@/components/tour/ProductTourJoyride'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useMeStores } from '@/hooks/useMeStores'
import {
  useProductTourRunner,
  useProductTourViewport
} from '@/hooks/useProductTourRunner'
import { sessionNeedsProfileCompletion } from '@/lib/product-tour-profile-gate'
import { PRODUCT_TOUR_KEYS } from '@/lib/product-tour-storage'
import {
  DASHBOARD_PLAYER_TOUR_STEPS,
  filterDashboardPlayerTourSteps
} from '@/lib/product-tour-steps'

export default function DashboardPlayerTour() {
  const pathname = usePathname() ?? ''
  const { data: session, status } = useSession()
  const { data: meStores } = useMeStores()
  const { shortcuts } = useDashboardModulesFromLayout()
  const viewport = useProductTourViewport()

  const showQuickActions =
    shortcuts.createMail ||
    shortcuts.createTournament ||
    shortcuts.playPokemonDecklistPdf

  const showStoreSwitcher =
    (meStores?.stores?.filter(s => Boolean(s.id)).length ?? 0) >= 1

  const enabled =
    status === 'authenticated' &&
    pathname === '/dashboard' &&
    !sessionNeedsProfileCompletion(session)

  const steps = useMemo(
    () =>
      filterDashboardPlayerTourSteps(DASHBOARD_PLAYER_TOUR_STEPS, {
        showStoreSwitcher,
        showQuickActions,
        showDesktopNav: viewport.showDesktopNav,
        showMobileNav: viewport.showMobileNav
      }),
    [
      showStoreSwitcher,
      showQuickActions,
      viewport.showDesktopNav,
      viewport.showMobileNav
    ]
  )

  const { run, finish } = useProductTourRunner({
    tourKey: PRODUCT_TOUR_KEYS.dashboard,
    enabled,
    steps
  })

  return <ProductTourJoyride steps={steps} run={run} onFinish={finish} />
}
