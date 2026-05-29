'use client'

import Link from 'next/link'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import PublicDecklistVariantsPanel from '@/components/decklist/PublicDecklistVariantsPanel'
import type { OwnerTopContributionBadgeData } from '@/components/contribution/OwnerTopContributionBadge'
import OwnerTopContributionBadge from '@/components/contribution/OwnerTopContributionBadge'
import type { DecklistVariantDTO } from '@/components/decklist/DecklistVariantsPanel'
import { DecklistSpritePair } from '@/components/decklist/DecklistPokemonSlotPickers'

export type PublicDecklistDetailProps = {
  name: string
  pokemonSlugs: string[]
  updatedAtLabel: string
  ownerName: string
  ownerImage: string | null
  ownerTopContribution: OwnerTopContributionBadgeData | null
  baseDeckText: string
  principalVariantId: string | null
  variants: DecklistVariantDTO[]
}

export default function PublicDecklistDetailClient({
  name,
  pokemonSlugs,
  updatedAtLabel,
  ownerName,
  ownerImage,
  ownerTopContribution,
  baseDeckText,
  principalVariantId,
  variants
}: PublicDecklistDetailProps) {
  const theme = useTheme()
  const initial = ownerName.trim().charAt(0).toUpperCase() || '?'

  return (
    <Box
      component="main"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100%',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: theme.palette.mode === 'dark' ? 0.04 : 0.06,
          backgroundImage: `radial-gradient(circle at 12% 14%, ${alpha(theme.palette.primary.main, 0.16)} 0%, transparent 42%)`
        }
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          py: { xs: 3, sm: 4 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Stack spacing={3}>
          <Button
            component={Link}
            href="/dashboard/decklists/publicos"
            startIcon={<ArrowBackIcon />}
            variant="text"
            color="inherit"
            sx={{
              alignSelf: 'flex-start',
              px: 1,
              minWidth: 0,
              color: 'text.secondary',
              fontWeight: 600,
              '&:hover': {
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.06)
              }
            }}
          >
            Listas públicas
          </Button>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2.5}
            alignItems={{ xs: 'stretch', md: 'flex-start' }}
            justifyContent="space-between"
            gap={2}
          >
            <Stack spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                component="h1"
                variant="h5"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  textWrap: 'balance',
                  fontSize: { xs: '1.65rem', md: '2rem' }
                }}
              >
                {name}
              </Typography>

              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  width: '100%',
                  maxWidth: { xs: '100%', md: 480 }
                }}
              >
                <Avatar
                  src={ownerImage ?? undefined}
                  alt=""
                  sx={{ width: 48, height: 48, flexShrink: 0 }}
                >
                  {initial}
                </Avatar>
                <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} noWrap>
                    {ownerName}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={500}
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.45
                    }}
                  >
                    Dueño del mazo · Actualizado {updatedAtLabel}
                  </Typography>
                  {ownerTopContribution ? (
                    <Box sx={{ mt: 0.5 }}>
                      <OwnerTopContributionBadge badge={ownerTopContribution} />
                    </Box>
                  ) : null}
                </Stack>
                <Box
                  sx={{
                    display: { xs: 'flex', sm: 'flex', md: 'none' },
                    flexShrink: 0,
                    alignSelf: 'center',
                    ml: 'auto'
                  }}
                >
                  <DecklistSpritePair slugs={pokemonSlugs} size={40} />
                </Box>
              </Stack>
            </Stack>

            <Box
              sx={{
                display: { xs: 'none', sm: 'none', md: 'block' },
                p: 1.25,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                alignSelf: 'flex-start'
              }}
            >
              <DecklistSpritePair slugs={pokemonSlugs} size={44} />
            </Box>
          </Stack>

          <PublicDecklistVariantsPanel
            baseDeckText={baseDeckText}
            principalVariantId={principalVariantId}
            variants={variants}
          />
        </Stack>
      </Container>
    </Box>
  )
}
