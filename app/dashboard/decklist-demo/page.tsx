'use client'

import { useMemo, useState } from 'react'
import { Button, Container, Stack, TextField, Typography } from '@mui/material'
import DecklistModule from '@/components/decklist/DecklistModule'

const SAMPLE = `Pokémon: 21
4 Cynthia's Gible DRI 102
4 Cynthia's Gabite DRI 103
3 Cynthia's Garchomp ex DRI 104
4 Cynthia's Roselia DRI 7
4 Cynthia's Roserade DRI 8
1 Cynthia's Spiritomb DRI 129
1 Budew ASC 16

Trainer: 31
4 Lillie's Determination MEG 119
3 Boss's Orders MEG 114
2 Hilda WHT 84
2 Surfer SSP 187
2 Judge POR 76
4 Buddy-Buddy Poffin TEF 144
3 Fighting Gong MEG 116
3 Poké Pad POR 81
2 Premium Power Pro MEG 124
2 Night Stretcher ASC 196
1 Ultra Ball MEG 131
3 Cynthia's Power Weight DRI 162

Energy: 8
4 Fighting Energy MEE 6
3 Rocky Fighting Energy POR 87
1 Neo Upper Energy TEF 162
`

export default function DecklistDemoPage() {
  const [value, setValue] = useState(SAMPLE)
  const title = useMemo(() => (value.trim() ? 'Decklist' : 'Ejemplo'), [value])

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2.5}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          Decklist demo
        </Typography>
        <TextField
          label="Pega tu decklist"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Ej:\nPokémon: 21\n4 Cynthia's Gible DRI 102\n..."
          multiline
          minRows={10}
          maxRows={22}
          fullWidth
          size="small"
          helperText="Formato: Sección: total, luego líneas: <cantidad> <nombre> <SET> <número>"
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            onClick={() => setValue(SAMPLE)}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            Cargar ejemplo
          </Button>
          <Button
            variant="text"
            color="inherit"
            onClick={() => setValue('')}
            sx={{ fontWeight: 700, textTransform: 'none' }}
          >
            Limpiar
          </Button>
        </Stack>
        <DecklistModule value={value.trim() ? value : SAMPLE} title={title} />
      </Stack>
    </Container>
  )
}
