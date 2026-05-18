'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import ProductTourJoyride from '@/components/tour/ProductTourJoyride'
import {
  useProductTourRunner,
  useProductTourViewport
} from '@/hooks/useProductTourRunner'
import { sessionNeedsProfileCompletion } from '@/lib/product-tour-profile-gate'
import { PRODUCT_TOUR_KEYS } from '@/lib/product-tour-storage'
import {
  STORE_HUB_TOUR_STEPS,
  filterStoreHubTourSteps
} from '@/lib/product-tour-steps'

type StoreHubTourProps = {
  hubReady: boolean
}

export default function StoreHubTour({ hubReady }: StoreHubTourProps) {
  const { data: session, status } = useSession()
  const viewport = useProductTourViewport()

  const enabled =
    status === 'authenticated' &&
    hubReady &&
    !sessionNeedsProfileCompletion(session)

  const { run, finish } = useProductTourRunner({
    tourKey: PRODUCT_TOUR_KEYS.storeHub,
    enabled,
    delayMs: 600
  })

  const steps = useMemo(
    () =>
      filterStoreHubTourSteps(
        STORE_HUB_TOUR_STEPS,
        viewport.showMobileRailHint
      ),
    [viewport.showMobileRailHint]
  )

  return <ProductTourJoyride steps={steps} run={run} onFinish={finish} />
}
