'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

export default function LinearCapacity({ value }: { value: number }) {
  return (
    <Box sx={{ mt: 0.5 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 0.5 }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          letterSpacing="0.04em"
        >
          Cupo
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}
        >
          {value}%
        </Typography>
      </Stack>
      <Box
        sx={{
          height: 7,
          borderRadius: 99,
          bgcolor: t => alpha(t.palette.text.primary, 0.07),
          overflow: 'hidden',
          border: '1px solid',
          borderColor: t => alpha(t.palette.text.primary, 0.06)
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${value}%`,
            borderRadius: 99,
            bgcolor: t =>
              value >= 90 ? t.palette.warning.main : t.palette.primary.main,
            transition: 'width 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: t =>
              `inset 0 -1px 0 ${alpha(t.palette.common.black, 0.08)}`
          }}
        />
      </Box>
    </Box>
  )
}
