'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import {
  getLimitlessPokemonSpriteUrl,
  limitlessSpriteDimensions
} from '@/lib/limitless-pokemon-sprite'

const SPRITE_BOX = limitlessSpriteDimensions(22)

type Props = {
  slugs: string[]
  /** Etiqueta del listado guardado (solo visible para ti). */
  decklistLabel?: string | null
}

/** Resumen privado de sprites / listado vinculado (no se muestra a otros jugadores). */
export default function TournamentDeckSpritesSummary({
  slugs,
  decklistLabel
}: Props) {
  if (slugs.length === 0 && !decklistLabel) return null

  return (
    <Stack spacing={1}>
      {decklistLabel ? (
        <Typography variant="caption" color="text.secondary">
          Listado: <strong>{decklistLabel}</strong>
        </Typography>
      ) : null}
      {slugs.length > 0 ? (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {slugs.map(slug => (
            <Chip
              key={slug}
              size="small"
              variant="outlined"
              label={
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Box
                    component="img"
                    alt=""
                    src={getLimitlessPokemonSpriteUrl(slug)}
                    sx={{
                      width: SPRITE_BOX.width,
                      height: SPRITE_BOX.height,
                      imageRendering: 'pixelated',
                      objectFit: 'contain'
                    }}
                  />
                  <Typography variant="caption" component="span">
                    {slug}
                  </Typography>
                </Stack>
              }
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary" fontStyle="italic">
          Sin sprites configurados
        </Typography>
      )}
    </Stack>
  )
}
