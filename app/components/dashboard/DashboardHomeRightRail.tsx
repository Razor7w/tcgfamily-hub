'use client'

import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

type DashboardHomeRightRailProps = {
  /** Hub `/{slug}`: copy anclado a la tienda de la URL. */
  storeName?: string
}

/** Panel derecho de hubs; preparado para chat / torneos online. */
export default function DashboardHomeRightRail({
  storeName
}: DashboardHomeRightRailProps = {}) {
  const storeLine = typeof storeName === 'string' ? storeName.trim() : ''
  const onStoreHub = storeLine.length > 0

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: t => alpha(t.palette.text.primary, 0.1),
        minHeight: { xs: 280, lg: 360 },
        height: { lg: 'auto' }
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.1),
              color: 'primary.main'
            }}
          >
            <ForumOutlinedIcon fontSize="small" aria-hidden />
          </Box>
        }
        title="Torneos online"
        subheader={
          onStoreHub
            ? `Coordinación en ${storeLine}`
            : 'Coordinación entre rondas'
        }
        slotProps={{
          title: { variant: 'subtitle1', sx: { fontWeight: 800 } },
          subheader: { sx: { lineHeight: 1.45 } }
        }}
      />
      <CardContent sx={{ pt: 0 }}>
        <Stack spacing={1.5}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.6 }}
          >
            {onStoreHub
              ? `Chat y avisos de partida para torneos online en ${storeLine}.`
              : 'Aquí irá el chat para emparejamientos y salas por mesa cuando actives torneos en línea.'}
          </Typography>
          <Box
            sx={{
              py: 3,
              px: 2,
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'divider',
              bgcolor: t => alpha(t.palette.text.primary, 0.02),
              textAlign: 'center'
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Próximamente
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
