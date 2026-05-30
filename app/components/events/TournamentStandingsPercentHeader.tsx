'use client'

import { useId, useState, type MouseEvent } from 'react'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import InfoOutlined from '@mui/icons-material/InfoOutlined'

const TIPS = {
  owp: {
    title: 'OWP',
    subtitle: '¿Qué tan fuertes eran tus rivales?',
    body: 'A veces dos jugadores terminan con las mismas victorias. Para decidir quién va más arriba, se mira cómo le fue en el torneo a la gente que tú enfrentaste: si tus rivales ganaron mucho, tu número sube; si casi todos perdían, baja. Es el promedio de eso. Nunca cuenta menos del 25 %.'
  },
  oowp: {
    title: 'OOWP',
    subtitle: 'Si el OWP no alcanza, se mira un paso más',
    body: 'Cuando el OWP deja a dos personas igualadas, entra este segundo número. Pregunta lo mismo, pero sobre los rivales de tus rivales: qué tan bien les fue a quienes jugaron contra la gente que a ti te tocó. También es un promedio; más alto significa que tus mesas eran más difíciles en general.'
  }
} as const

export function TournamentStandingsPercentHeader({
  label,
  tipKey,
  /** Tabla móvil: ícono más pequeño para no robar ancho a columnas %. */
  density = 'default'
}: {
  label: string
  tipKey: keyof typeof TIPS
  density?: 'default' | 'compact'
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const compact = density === 'compact' && isMobile
  const tip = TIPS[tipKey]
  const popoverId = useId()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const infoControl = (
    <IconButton
      size="small"
      component="span"
      role={isMobile ? 'button' : undefined}
      tabIndex={0}
      onClick={
        isMobile
          ? (e: MouseEvent<HTMLElement>) => {
              setAnchorEl(prev =>
                prev ? null : (e.currentTarget as HTMLElement)
              )
            }
          : undefined
      }
      aria-label={`Qué es ${label}`}
      aria-expanded={isMobile ? open : undefined}
      aria-controls={isMobile && open ? popoverId : undefined}
      sx={{
        p: compact ? 0.25 : isMobile ? 1 : 0.25,
        ml: 0.25,
        verticalAlign: 'middle',
        ...(isMobile
          ? {
              minWidth: compact ? 28 : 44,
              minHeight: compact ? 28 : 44,
              color: open ? 'primary.main' : 'text.secondary'
            }
          : { color: 'text.secondary', opacity: 0.75 })
      }}
    >
      <InfoOutlined sx={{ fontSize: compact ? 16 : isMobile ? 20 : 16 }} />
    </IconButton>
  )

  return (
    <>
      <Stack
        direction="row"
        spacing={0}
        alignItems="center"
        justifyContent="flex-end"
        component="span"
      >
        <span>{label}</span>
        {isMobile ? (
          infoControl
        ) : (
          <Tooltip
            title={
              <Typography
                variant="body2"
                component="span"
                sx={{ display: 'block', maxWidth: 280 }}
              >
                <strong>{tip.subtitle}</strong>
                <br />
                {tip.body}
              </Typography>
            }
            arrow
            placement="top"
            enterDelay={200}
            describeChild
            slotProps={{
              tooltip: { sx: { typography: 'body2', p: 1.25, maxWidth: 300 } }
            }}
          >
            <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
              {infoControl}
            </span>
          </Tooltip>
        )}
      </Stack>

      {isMobile ? (
        <Popover
          id={popoverId}
          open={open}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          marginThreshold={12}
          slotProps={{
            paper: {
              sx: {
                p: 2,
                maxWidth: 'min(300px, calc(100vw - 32px))',
                borderRadius: 2,
                boxShadow: theme.shadows[8]
              }
            }
          }}
        >
          <Typography variant="subtitle2" fontWeight={800}>
            {tip.title}
          </Typography>
          <Typography
            variant="caption"
            color="primary.main"
            fontWeight={700}
            sx={{ display: 'block', mt: 0.25 }}
          >
            {tip.subtitle}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, lineHeight: 1.5 }}
          >
            {tip.body}
          </Typography>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block', mt: 1.25 }}
          >
            Toca fuera o el ícono otra vez para cerrar.
          </Typography>
        </Popover>
      ) : null}
    </>
  )
}
