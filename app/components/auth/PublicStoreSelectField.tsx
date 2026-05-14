'use client'

import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormHelperText from '@mui/material/FormHelperText'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

export type PublicStoreOption = { id: string; name: string; slug: string }

type Props = {
  label?: string
  labelId?: string
  selectId?: string
  value: string
  onChange: (storeId: string) => void
  options: PublicStoreOption[]
  loading?: boolean
  disabled?: boolean
  required?: boolean
  emptyListMessage?: string
}

export default function PublicStoreSelectField({
  label = 'Tienda de preferencia',
  labelId = 'public-store-select-label',
  selectId = 'public-store-select',
  value,
  onChange,
  options,
  loading = false,
  disabled = false,
  required = true,
  emptyListMessage = 'No hay tiendas disponibles. Contacta a un administrador.'
}: Props) {
  if (loading && options.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={28} aria-label="Cargando tiendas" />
      </Box>
    )
  }

  if (!loading && options.length === 0) {
    return <FormHelperText error>{emptyListMessage}</FormHelperText>
  }

  return (
    <FormControl fullWidth required={required} disabled={disabled || loading}>
      <InputLabel id={labelId} shrink>
        {label}
      </InputLabel>
      <Select
        labelId={labelId}
        id={selectId}
        label={label}
        notched
        value={value}
        displayEmpty={false}
        onChange={e => onChange(String(e.target.value ?? '').trim())}
      >
        {options.map(s => (
          <MenuItem key={s.id} value={s.id}>
            {s.name}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>
        Obligatoria. Define tu tienda predeterminada al usar el sitio.
      </FormHelperText>
    </FormControl>
  )
}
