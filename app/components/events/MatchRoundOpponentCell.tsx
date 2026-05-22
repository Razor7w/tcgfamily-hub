'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { ParticipantMatchRoundDTO } from '@/lib/participant-match-round'
import { getLimitlessPokemonSpriteUrl } from '@/lib/limitless-pokemon-sprite'
import { formatPersonDisplayName } from '@/lib/weekly-events'

type Props = {
  row: ParticipantMatchRoundDTO
  slugToLabel?: Map<string, string>
  spriteSize?: number
  /** Nombre y sprites del rival en una sola fila (meta / tablas compactas). */
  inline?: boolean
  /** Solo el nombre del rival (sprites se muestran aparte, p. ej. bajo el resultado en compartir móvil). */
  nameOnly?: boolean
}

function slugLabel(slug: string, slugToLabel?: Map<string, string>): string {
  return slugToLabel?.get(slug) ?? slug
}

/** Rival: nombre (TDF o manual) y sprites del deck reportado. */
export default function MatchRoundOpponentCell({
  row,
  slugToLabel,
  spriteSize = 36,
  inline = false,
  nameOnly = false
}: Props) {
  const rawName =
    typeof row.opponentDisplayName === 'string' &&
    row.opponentDisplayName.trim()
      ? row.opponentDisplayName.trim()
      : null
  const name = rawName ? formatPersonDisplayName(rawName) : null

  if (row.specialOutcome && !name && row.opponentDeckSlugs.length === 0) {
    return (
      <Chip size="small" label={row.specialOutcome === 'bye' ? 'Bye' : '—'} />
    )
  }

  const sprites =
    row.opponentDeckSlugs.length > 0 ? (
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        {row.opponentDeckSlugs.map(slug => (
          <Tooltip
            key={slug}
            title={slugLabel(slug, slugToLabel)}
            placement="top"
          >
            <Box
              component="img"
              src={getLimitlessPokemonSpriteUrl(slug)}
              alt=""
              sx={{
                width: spriteSize,
                height: Math.round((spriteSize * 30) / 36),
                objectFit: 'contain',
                imageRendering: 'pixelated',
                borderRadius: 0.75,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}
            />
          </Tooltip>
        ))}
      </Stack>
    ) : null

  if (nameOnly) {
    if (!name) {
      return (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      )
    }
    return (
      <Tooltip title={name} placement="top" enterDelay={400}>
        <Typography
          variant="body2"
          fontWeight={700}
          noWrap
          sx={{
            minWidth: 0,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {name}
        </Typography>
      </Tooltip>
    )
  }

  if (inline) {
    return (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ minWidth: 0 }}
      >
        {name ? (
          <Typography variant="body2" fontWeight={700} sx={{ minWidth: 0 }}>
            {name}
          </Typography>
        ) : null}
        {sprites}
        {!name && !sprites ? (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ) : null}
      </Stack>
    )
  }

  return (
    <Stack spacing={0.75}>
      {name ? (
        <Typography variant="body2" fontWeight={700}>
          {name}
        </Typography>
      ) : null}
      {sprites}
      {!name && !sprites ? (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      ) : null}
    </Stack>
  )
}
