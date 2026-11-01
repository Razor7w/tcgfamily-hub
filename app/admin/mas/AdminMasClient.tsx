'use client'

import Link from 'next/link'
import type { SvgIconComponent } from '@mui/icons-material'
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined'
import Groups from '@mui/icons-material/Groups'
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import SportsEsports from '@mui/icons-material/SportsEsports'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

const ITEMS: {
  href: string
  title: string
  description: string
  icon: SvgIconComponent
}[] = [
  {
    href: '/admin/users',
    title: 'Usuarios',
    description: 'Cuentas de la tienda: altas, roles y contraseñas.',
    icon: PeopleOutlined
  },
  {
    href: '/admin/tiendas',
    title: 'Tiendas',
    description: 'Locales del hub, marca y quién administra cada uno.',
    icon: StorefrontOutlined
  },
  {
    href: '/admin/equipos',
    title: 'Equipos',
    description: 'Aprueba o rechaza las solicitudes de equipos de jugadores.',
    icon: Groups
  },
  {
    href: '/admin/sugerencias',
    title: 'Sugerencias',
    description: 'Comentarios que los usuarios envían desde el inicio.',
    icon: LightbulbOutlined
  },
  {
    href: '/admin/vendedores',
    title: 'Vendedores',
    description: 'Quién puede crear y gestionar carpetas de singles.',
    icon: StorefrontOutlined
  },
  {
    href: '/admin/reporte-manual',
    title: 'Reporte manual',
    description: 'Sprites y decklist de torneos, en cualquier tienda.',
    icon: AssignmentOutlined
  },
  {
    href: '/admin/torneos-custom',
    title: 'Torneos custom',
    description: 'Torneos creados a mano, fuera del calendario semanal.',
    icon: SportsEsports
  }
]

export default function AdminMasClient() {
  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        py: 4,
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.05)} 0%, ${t.palette.background.default} 42%)`
      })}
    >
      <Container maxWidth="md">
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          Más
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.75, maxWidth: 520, lineHeight: 1.6 }}
        >
          Herramientas que no usas en el día a día. Entra a la que necesites.
        </Typography>

        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5
          }}
        >
          {ITEMS.map(item => {
            const Icon = item.icon
            return (
              <Card key={item.href} variant="outlined" sx={{ borderRadius: 3 }}>
                <CardActionArea
                  component={Link}
                  href={item.href}
                  sx={{ height: '100%', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          color: 'primary.main',
                          bgcolor: t => alpha(t.palette.primary.main, 0.1)
                        }}
                      >
                        <Icon />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, lineHeight: 1.3 }}>
                          {item.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5, lineHeight: 1.5 }}
                        >
                          {item.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            )
          })}
        </Box>
      </Container>
    </Box>
  )
}
