'use client'

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import TeamMedalChip from '@/components/teams/TeamMedalChip'
import {
  listTeamMedalCatalog,
  TEAM_MEDAL_CATEGORY_LABELS,
  teamHasMedalSlug
} from '@/lib/teams/medals/definitions'
import type { TeamMedalCategory, TeamMedalDTO } from '@/lib/teams/medals/types'

type Props = {
  open: boolean
  onClose: () => void
  earnedMedals?: TeamMedalDTO[]
}

function medalsByCategory(medals: TeamMedalDTO[]) {
  const map = new Map<TeamMedalCategory, TeamMedalDTO[]>()
  for (const medal of medals) {
    const list = map.get(medal.category) ?? []
    list.push(medal)
    map.set(medal.category, list)
  }
  return map
}

export default function TeamMedalsGuideDialog({
  open,
  onClose,
  earnedMedals = []
}: Props) {
  const catalog = listTeamMedalCatalog()
  const earnedByCategory = medalsByCategory(earnedMedals)

  const categories: TeamMedalCategory[] = [
    'competitive',
    'community',
    'longevity'
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          pr: 1
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em">
            Medallas de equipo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Logros colectivos que tu equipo puede obtener en TCGFamily.
          </Typography>
        </Box>
        <IconButton aria-label="Cerrar" onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 2.5 }, py: 2 }}>
        <Stack spacing={2.5}>
          {categories.map(category => {
            const items = catalog.filter(d => d.category === category)
            if (items.length === 0) return null

            return (
              <Box key={category}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: 800, letterSpacing: '0.08em' }}
                >
                  {TEAM_MEDAL_CATEGORY_LABELS[category]}
                </Typography>
                <Stack spacing={1.25} sx={{ mt: 1 }}>
                  {items.map(def => {
                    const earned = teamHasMedalSlug(earnedMedals, def.slug)
                    const earnedInstances =
                      earnedByCategory
                        .get(category)
                        ?.filter(m => m.slug === def.slug) ?? []

                    return (
                      <Box
                        key={def.slug}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: t =>
                            earned
                              ? alpha(t.palette.success.main, 0.35)
                              : alpha(t.palette.text.primary, 0.1),
                          bgcolor: t =>
                            earned
                              ? alpha(t.palette.success.main, 0.06)
                              : 'transparent'
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="flex-start"
                          justifyContent="space-between"
                        >
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              flexWrap="wrap"
                              useFlexGap
                              sx={{ mb: 0.75 }}
                            >
                              <TeamMedalChip
                                medal={{
                                  slug: def.slug,
                                  instanceKey: def.slug,
                                  label: def.label,
                                  description: def.description,
                                  category: def.category,
                                  tier: def.tier,
                                  kind: 'dynamic',
                                  earnedAt: null
                                }}
                              />
                              {earned ? (
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  alignItems="center"
                                  sx={{ color: 'success.main' }}
                                >
                                  <CheckCircleOutlineIcon
                                    sx={{ fontSize: 16 }}
                                  />
                                  <Typography
                                    variant="caption"
                                    fontWeight={700}
                                  >
                                    Conseguida
                                  </Typography>
                                </Stack>
                              ) : null}
                            </Stack>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ lineHeight: 1.55 }}
                            >
                              <Box
                                component="span"
                                sx={{ color: 'text.primary', fontWeight: 600 }}
                              >
                                Cómo ganarla:{' '}
                              </Box>
                              {def.description}
                            </Typography>
                            {earnedInstances.length > 0 ? (
                              <Stack spacing={0.25} sx={{ mt: 1 }}>
                                {earnedInstances.map(instance => (
                                  <Typography
                                    key={instance.instanceKey}
                                    variant="caption"
                                    color="success.dark"
                                    fontWeight={600}
                                  >
                                    · {instance.label}
                                  </Typography>
                                ))}
                              </Stack>
                            ) : null}
                          </Box>
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )
          })}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
