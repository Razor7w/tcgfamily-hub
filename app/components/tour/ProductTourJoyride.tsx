'use client'

import { useState } from 'react'
import {
  Joyride,
  EVENTS,
  STATUS,
  type EventData,
  type Step
} from 'react-joyride'
import { useTheme } from '@mui/material/styles'
import type { ProductTourOutcome } from '@/lib/product-tour-storage'

const LOCALE = {
  back: 'Atrás',
  close: 'Cerrar',
  last: 'Listo',
  next: 'Siguiente',
  nextWithProgress: 'Siguiente ({current} de {total})',
  skip: 'Omitir'
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
  const [mounted] = useState(() => typeof window !== 'undefined')

  if (!mounted || steps.length === 0) return null

  const primary = theme.palette.primary.main
  const paper = theme.palette.background.paper
  const text = theme.palette.text.primary

  const handleEvent = (data: EventData) => {
    if (data.type !== EVENTS.TOUR_END) return
    if (data.status === STATUS.FINISHED) {
      onFinish('done')
    } else if (data.status === STATUS.SKIPPED) {
      onFinish('skipped')
    }
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      locale={LOCALE}
      onEvent={handleEvent}
      options={{
        primaryColor: primary,
        textColor: text,
        backgroundColor: paper,
        zIndex: theme.zIndex.modal + 2,
        showProgress: true,
        overlayClickAction: false
      }}
    />
  )
}
