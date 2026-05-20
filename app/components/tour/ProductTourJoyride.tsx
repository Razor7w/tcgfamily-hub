'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Joyride,
  EVENTS,
  STATUS,
  type Controls,
  type EventData,
  type Step
} from 'react-joyride'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { ProductTourOutcome } from '@/lib/product-tour-storage'
import { cleanupProductTourUi } from '@/lib/product-tour-cleanup'
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
    () => enrichTourStepsWithMobileRailScroll(steps, { mobileRailLayout }),
    [steps, mobileRailLayout]
  )

  useEffect(() => {
    if (!run) {
      void resetTourScrollPosition()
      cleanupProductTourUi()
    }
  }, [run])

  useEffect(() => {
    return () => {
      void resetTourScrollPosition()
      cleanupProductTourUi()
    }
  }, [])

  if (!mounted || tourSteps.length === 0 || !run) return null

  const primary = theme.palette.primary.main
  const paper = theme.palette.background.paper
  const text = theme.palette.text.primary

  const endTour = (outcome: ProductTourOutcome) => {
    void resetTourScrollPosition()
    cleanupProductTourUi()
    onFinish(outcome)
  }

  const handleEvent = (data: EventData, controls: Controls) => {
    if (data.type === EVENTS.TARGET_NOT_FOUND || data.type === EVENTS.ERROR) {
      controls.skip()
      endTour('skipped')
      return
    }

    if (data.type === EVENTS.TOUR_END) {
      if (data.status === STATUS.FINISHED) {
        endTour('done')
      } else if (data.status === STATUS.SKIPPED) {
        endTour('skipped')
      }
    }
  }

  return (
    <Joyride
      steps={tourSteps}
      run
      continuous
      scrollToFirstStep={false}
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
        overlayClickAction: 'close',
        width: 'min(380px, calc(100vw - 32px))',
        spotlightRadius: 12
      }}
    />
  )
}
