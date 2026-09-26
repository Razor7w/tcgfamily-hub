'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { limitlessCardImageUrl } from '@/lib/decklist'
import type {
  LimitlessDmCardDetail,
  LimitlessDmSearchHit
} from '@/lib/limitless-dm-api'

export type LimitlessCardPick = {
  hit: LimitlessDmSearchHit
  detail: LimitlessDmCardDetail | null
}

type Props = {
  onPick: (pick: LimitlessCardPick) => void
  disabled?: boolean
}

/** Limitless puede devolver el mismo `id` en varias filas (set/región distinta). */
function limitlessHitKey(o: LimitlessDmSearchHit): string {
  return [
    o.id,
    o.set,
    o.number,
    o.region,
    o.special ?? '',
    o.translation ?? 0
  ].join('|')
}

function dedupeHits(hits: LimitlessDmSearchHit[]): LimitlessDmSearchHit[] {
  const seen = new Set<string>()
  const out: LimitlessDmSearchHit[] = []
  for (const h of hits) {
    const k = limitlessHitKey(h)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(h)
  }
  return out
}

export default function LimitlessCardSearchField({ onPick, disabled }: Props) {
  const [text, setText] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(text.trim()), 380)
    return () => window.clearTimeout(t)
  }, [text])

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['limitless-search', 'carpetas', debounced],
    queryFn: async (): Promise<LimitlessDmSearchHit[]> => {
      const params = new URLSearchParams({ text: debounced, format: 'all' })
      const res = await fetch(`/api/limitless/search?${params}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          typeof j.error === 'string' ? j.error : 'Error en la búsqueda'
        )
      }
      return dedupeHits((j.results as LimitlessDmSearchHit[]) ?? [])
    },
    enabled: debounced.length >= 1 && !disabled
  })

  return (
    <Autocomplete
      options={results}
      loading={isFetching}
      disabled={disabled}
      filterOptions={x => x}
      value={null}
      getOptionKey={limitlessHitKey}
      getOptionLabel={o =>
        `${o.name} · ${o.set} ${o.number}${o.region === 'tpc' ? ' (JP)' : ''}`
      }
      isOptionEqualToValue={(a, b) => limitlessHitKey(a) === limitlessHitKey(b)}
      onChange={async (_e, hit) => {
        if (!hit) return
        let detail: LimitlessDmCardDetail | null = null
        try {
          const params = new URLSearchParams({
            set: hit.set,
            number: String(hit.number),
            region: hit.region || 'int'
          })
          const res = await fetch(`/api/limitless/cards?${params}`)
          const j = await res.json().catch(() => ({}))
          if (res.ok && j.card) detail = j.card as LimitlessDmCardDetail
        } catch {
          detail = null
        }
        onPick({ hit, detail })
        setText('')
      }}
      inputValue={text}
      onInputChange={(_e, v, reason) => {
        if (reason === 'reset') return
        setText(v)
      }}
      renderOption={(props, option, { index }) => {
        // MUI pasa `key` en props; hay que aplicarla en el <li> (no en Box).
        // Incluir index: Limitless a veces repite id entre filas distintas.
        const { key: _muiKey, ...liProps } = props
        const src = limitlessCardImageUrl({
          set: option.set,
          number: option.number,
          size: 'SM',
          cardName: option.name
        })
        return (
          <li
            key={`ll-${index}-${limitlessHitKey(option)}`}
            {...liProps}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              ...(typeof liProps.style === 'object' && liProps.style
                ? liProps.style
                : null)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              width={36}
              height={50}
              style={{ objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap fontWeight={600}>
                {option.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {option.set} · {option.number}
                {option.region === 'tpc' ? ' · JP' : ''}
              </Typography>
            </Box>
          </li>
        )
      }}
      renderInput={params => (
        <TextField
          {...params}
          label="Buscar carta"
          placeholder="Nombre, set…"
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isFetching ? (
                  <CircularProgress color="inherit" size={16} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  )
}
