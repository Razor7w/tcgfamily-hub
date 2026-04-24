'use client'

import PublicIcon from '@mui/icons-material/Public'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'
import { useRecentPublicDecklists } from '@/hooks/useSavedDecklists'

const PREVIEW_LIMIT = 3

export default function RecentPublicDecklistsHomeCard() {
  const {
    data: decklists,
    isPending,
    isError,
    error
  } = useRecentPublicDecklists(PREVIEW_LIMIT)

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardHeader
        avatar={<PublicIcon color="primary" />}
        title="Últimos mazos públicos"
        subheader="Compartidos recientemente por la comunidad"
        slotProps={{ title: { variant: 'h6' } }}
        action={
          <Button
            component={Link}
            href="/dashboard/decklists/publicos"
            size="small"
            variant="text"
            sx={{ fontWeight: 700 }}
          >
            Ver todos
          </Button>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : isError ? (
          <Typography color="text.secondary" variant="body2">
            {error instanceof Error ? error.message : 'No se pudo cargar'}
          </Typography>
        ) : !decklists?.length ? (
          <Typography variant="body2" color="text.secondary">
            Todavía no hay mazos públicos. Podés compartir el tuyo desde{' '}
            <Link href="/dashboard/decklists" style={{ fontWeight: 600 }}>
              Mis decklists
            </Link>
            .
          </Typography>
        ) : (
          <List disablePadding>
            {decklists.map((row, i) => {
              const sub = new Date(row.updatedAt).toLocaleString('es-CL', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })
              const ownerInitial =
                row.ownerName.trim().charAt(0).toUpperCase() || '?'
              return (
                <ListItem
                  key={row.id}
                  disablePadding
                  divider={i < decklists.length - 1}
                >
                  <ListItemButton
                    component={Link}
                    href={`/dashboard/decklists/publicos/${row.id}`}
                    sx={{ alignItems: 'center', gap: 2, py: 1.5 }}
                  >
                    <Avatar
                      src={row.ownerImage ?? undefined}
                      alt=""
                      sx={{ width: 40, height: 40, flexShrink: 0 }}
                    >
                      {ownerInitial}
                    </Avatar>
                    <ListItemIcon sx={{ minWidth: 0 }}>
                      <DecklistSpritePair slugs={row.pokemonSlugs} size={32} />
                    </ListItemIcon>
                    <ListItemText
                      primary={row.name}
                      secondary={`${row.ownerName} · ${sub}`}
                      primaryTypographyProps={{
                        fontWeight: 700,
                        noWrap: true
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        noWrap: true
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        )}
      </CardContent>
    </Card>
  )
}
