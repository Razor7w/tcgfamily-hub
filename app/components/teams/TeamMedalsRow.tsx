'use client'

import { useState } from 'react'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TeamMedalChip from '@/components/teams/TeamMedalChip'
import TeamMedalsGuideDialog from '@/components/teams/TeamMedalsGuideDialog'
import type { TeamMedalDTO } from '@/lib/teams/medals/types'

const DEFAULT_VISIBLE = 5

type Props = {
  medals?: TeamMedalDTO[]
  title?: string
}

export default function TeamMedalsRow({
  medals = [],
  title = 'Medallas'
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const visible = expanded ? medals : medals.slice(0, DEFAULT_VISIBLE)
  const hiddenCount = medals.length - DEFAULT_VISIBLE

  return (
    <>
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: medals.length > 0 ? 1 : 0 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={700}
            sx={{
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}
          >
            {title}
          </Typography>
          <Button
            size="small"
            color="inherit"
            startIcon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => setGuideOpen(true)}
            sx={{
              flexShrink: 0,
              minWidth: 0,
              px: 1,
              py: 0.25,
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'none'
            }}
          >
            Cómo ganarlas
          </Button>
        </Stack>

        {medals.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
            {visible.map(medal => (
              <TeamMedalChip key={medal.instanceKey} medal={medal} />
            ))}
            {!expanded && hiddenCount > 0 ? (
              <Button
                size="small"
                color="inherit"
                onClick={() => setExpanded(true)}
                sx={{
                  minWidth: 0,
                  px: 1,
                  py: 0.25,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'none'
                }}
              >
                +{hiddenCount} más
              </Button>
            ) : null}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Aún no hay medallas. Revisa el catálogo para ver cómo conseguirlas.
          </Typography>
        )}
      </Box>

      <TeamMedalsGuideDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        earnedMedals={medals}
      />
    </>
  )
}
