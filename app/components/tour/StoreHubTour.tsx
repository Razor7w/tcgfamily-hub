'use client'

import { useSession } from 'next-auth/react'
import ProductTourJoyride from '@/components/tour/ProductTourJoyride'
import { useProductTourRunner } from '@/hooks/useProductTourRunner'
import { sessionNeedsProfileCompletion } from '@/lib/product-tour-profile-gate'
import { PRODUCT_TOUR_KEYS } from '@/lib/product-tour-storage'
import { STORE_HUB_TOUR_STEPS } from '@/lib/product-tour-steps'

type StoreHubTourProps = {
  hubReady: boolean
}

export default function StoreHubTour({ hubReady }: StoreHubTourProps) {
  const { data: session, status } = useSession()
  const enabled =
    status === 'authenticated' &&
    hubReady &&
    !sessionNeedsProfileCompletion(session)

  const { run, finish } = useProductTourRunner({
    tourKey: PRODUCT_TOUR_KEYS.storeHub,
    enabled,
    delayMs: 600,
    steps: STORE_HUB_TOUR_STEPS
  })

  return (
    <ProductTourJoyride
      steps={STORE_HUB_TOUR_STEPS}
      run={run}
      onFinish={finish}
    />
  )
}
