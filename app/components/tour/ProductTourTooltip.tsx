'use client'

import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import type { TooltipRenderProps } from 'react-joyride'

const focusVisibleSx = {
  '&:focus': { outline: 'none' },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 2
  }
} as const

export default function ProductTourTooltip({
  backProps,
  closeProps,
  index,
  primaryProps,
  size,
  step,
  tooltipProps
}: TooltipRenderProps) {
  const { content, title } = step
  const showBack = index > 0

  return (
    <Paper
      elevation={12}
      {...tooltipProps}
      sx={{
        position: 'relative',
        width: 'min(380px, calc(100vw - 32px))',
        maxWidth: '100%',
        borderRadius: 2,
        overflow: 'visible',
        bgcolor: 'background.paper',
        color: 'text.primary'
      }}
    >
      <IconButton
        size="small"
        aria-label={closeProps['aria-label']}
        onClick={closeProps.onClick}
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          color: 'text.secondary',
          ...focusVisibleSx
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <Stack spacing={1.25} sx={{ px: 2, pt: 2, pb: 1.5, pr: 5 }}>
        {title ? (
          <Typography
            id="joyride-tooltip-title"
            component="h4"
            variant="subtitle1"
            sx={{ fontWeight: 700, lineHeight: 1.3, pr: 1 }}
          >
            {title}
          </Typography>
        ) : null}
        <Typography
          id="joyride-tooltip-content"
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.55 }}
        >
          {content}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ pt: 0.5 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, flexShrink: 0 }}
            aria-live="polite"
          >
            {index + 1} de {size}
          </Typography>

          <Stack direction="row" spacing={0.75} alignItems="center">
            {showBack ? (
              <Button
                size="small"
                color="inherit"
                onClick={backProps.onClick}
                aria-label={backProps['aria-label']}
                sx={{
                  minWidth: 0,
                  px: 1.25,
                  color: 'text.secondary',
                  fontWeight: 600,
                  ...focusVisibleSx
                }}
              >
                {backProps.children}
              </Button>
            ) : null}
            <Button
              size="small"
              variant="contained"
              onClick={primaryProps.onClick}
              aria-label={primaryProps['aria-label']}
              sx={{
                fontWeight: 700,
                px: 2,
                boxShadow: 'none',
                ...focusVisibleSx
              }}
            >
              {primaryProps.children}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  )
}
