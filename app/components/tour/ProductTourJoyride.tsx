'use client'

import { useMemo, useState } from 'react'
import {
  Joyride,
  EVENTS,
  STATUS,
  type EventData,
  type Step
} from 'react-joyride'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { ProductTourOutcome } from '@/lib/product-tour-storage'
import {
  enrichTourStepsWithMobileRailScroll,
  resetTourScrollPosition
} from '@/lib/product-tour-rail-scroll'
import ProductTourTooltip from '@/components/tour/ProductTourTooltip'

const LOCALE = {
  back: 'Atrás',
  close: 'Cerrar',
  last: 'Listo',
  next: 'Siguiente',
  skip: 'Omitir tour'
}

type ProductTourJoyrideProps = {
  steps: Step[]
  run: boolean
  onFinish: (outcome: ProductTourOutcome) => void
}

export default function ProductTourJoyride({
  steps,
  run,
  onFinish
}: ProductTourJoyrideProps) {
  const theme = useTheme()
  const mobileRailLayout = useMediaQuery(theme.breakpoints.down('lg'))
  const [mounted] = useState(() => typeof window !== 'undefined')

  const tourSteps = useMemo(
    () =>
      enrichTourStepsWithMobileRailScroll(steps, { mobileRailLayout }),
    [steps, mobileRailLayout]
  )

  if (!mounted || tourSteps.length === 0) return null

  const primary = theme.palette.primary.main
  const paper = theme.palette.background.paper
  const text = theme.palette.text.primary

  const handleEvent = (data: EventData) => {
    if (data.type === EVENTS.TOUR_END) {
      void resetTourScrollPosition()
      if (data.status === STATUS.FINISHED) {
        onFinish('done')
      } else if (data.status === STATUS.SKIPPED) {
        onFinish('skipped')
      }
    }
  }

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      scrollToFirstStep
      locale={LOCALE}
      tooltipComponent={ProductTourTooltip}
      onEvent={handleEvent}
      floatingOptions={{
        flipOptions: {
          padding: { top: 72, bottom: 20, left: 16, right: 16 },
          fallbackPlacements: [
            'bottom',
            'bottom-start',
            'bottom-end',
            'top',
            'top-start'
          ]
        },
        shiftOptions: { padding: 16 }
      }}
      styles={{
        floater: { filter: 'none' },
        tooltip: {
          backgroundColor: 'transparent',
          borderRadius: 0,
          padding: 0,
          width: 'auto'
        },
        tooltipContainer: { padding: 0, textAlign: 'left' },
        tooltipContent: { padding: 0 },
        tooltipTitle: { display: 'none' },
        tooltipFooter: { display: 'none' },
        buttonBack: { display: 'none' },
        buttonPrimary: { display: 'none' },
        buttonClose: { display: 'none' },
        buttonSkip: { display: 'none' }
      }}
      options={{
        primaryColor: primary,
        textColor: text,
        backgroundColor: paper,
        zIndex: theme.zIndex.modal + 2,
        showProgress: false,
        overlayClickAction: false,
        width: 'min(380px, calc(100vw - 32px))',
        spotlightRadius: 12
      }}
    />
  )
}
