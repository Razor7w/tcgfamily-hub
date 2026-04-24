'use client'

import { useMemo, useState } from 'react'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import DecklistModule from '@/components/decklist/DecklistModule'
import type { DecklistVariantDTO } from '@/components/decklist/DecklistVariantsPanel'

type Props = {
  baseDeckText: string
  principalVariantId: string | null
  variants: DecklistVariantDTO[]
}

/**
 * Tabs Principal + variantes en solo lectura (vista pública).
 */
export default function PublicDecklistVariantsPanel({
  baseDeckText,
  principalVariantId,
  variants
}: Props) {
  const theme = useTheme()
  const [selectedTab, setSelectedTab] = useState<string>('principal')
  const [principalView, setPrincipalView] = useState<'main' | 'baseRef'>('main')

  const resolvedTab = useMemo(() => {
    if (selectedTab === 'principal') return 'principal'
    if (variants.some(v => v.id === selectedTab)) return selectedTab
    return 'principal'
  }, [selectedTab, variants])

  const principalDisplayText = useMemo(() => {
    if (!principalVariantId) return baseDeckText
    const v = variants.find(x => x.id === principalVariantId)
    return v?.deckText ?? baseDeckText
  }, [baseDeckText, principalVariantId, variants])

  const activeDeckText = useMemo(() => {
    if (resolvedTab === 'principal') {
      if (principalVariantId && principalView === 'baseRef') {
        return baseDeckText
      }
      return principalDisplayText
    }
    return variants.find(v => v.id === resolvedTab)?.deckText ?? ''
  }, [
    resolvedTab,
    principalVariantId,
    principalView,
    baseDeckText,
    principalDisplayText,
    variants
  ])

  const deckModuleKey =
    resolvedTab === 'principal'
      ? `principal-${principalVariantId ?? 'root'}-${principalView}`
      : resolvedTab

  const principalLabel = principalVariantId
    ? (variants.find(v => v.id === principalVariantId)?.label ?? 'Variante')
    : null

  const editing = variants.find(v => v.id === resolvedTab) ?? null

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow:
          theme.palette.mode === 'dark'
            ? `0 12px 36px -20px ${alpha('#000', 0.45)}`
            : `0 14px 40px -28px ${alpha(theme.palette.primary.dark, 0.12)}`
      }}
    >
      <Box
        sx={{
          px: { xs: 1, sm: 1.5 },
          pt: { xs: 1, sm: 1.25 },
          pb: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(
            theme.palette.primary.main,
            theme.palette.mode === 'dark' ? 0.06 : 0.03
          )
        }}
      >
        <Stack spacing={1.25}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'text.secondary',
              px: { xs: 0.5, sm: 0 }
            }}
          >
            Listas del mazo
          </Typography>

          <Tabs
            value={resolvedTab}
            onChange={(_e, v) => {
              const next = v as string
              setSelectedTab(next)
              if (next !== 'principal') setPrincipalView('main')
            }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 44,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0'
              },
              '& .MuiTab-root': {
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
                letterSpacing: '-0.01em',
                '&.Mui-selected': { fontWeight: 800 }
              }
            }}
          >
            <Tab
              value="principal"
              label={
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={0.5}
                  component="span"
                >
                  Principal
                  {principalVariantId ? (
                    <StarRoundedIcon
                      sx={{ fontSize: 18, opacity: 0.9 }}
                      color="primary"
                      aria-hidden
                    />
                  ) : null}
                </Stack>
              }
            />
            {variants.map(v => (
              <Tab
                key={v.id}
                value={v.id}
                label={
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={0.5}
                    component="span"
                  >
                    <span>
                      {v.label.length > 22
                        ? `${v.label.slice(0, 20)}…`
                        : v.label}
                    </span>
                    {principalVariantId === v.id ? (
                      <StarRoundedIcon
                        sx={{ fontSize: 16, opacity: 0.85 }}
                        color="primary"
                        aria-hidden
                      />
                    ) : null}
                  </Stack>
                }
              />
            ))}
          </Tabs>

          {resolvedTab === 'principal' && principalVariantId ? (
            <Stack spacing={1.25} sx={{ pb: 1, px: { xs: 0.5, sm: 0 } }}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{
                  maxWidth: '62ch',
                  lineHeight: 1.55,
                  textWrap: 'pretty'
                }}
              >
                El listado principal es la variante «{principalLabel}». Podés
                alternar con el listado base (referencia).
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={principalView}
                onChange={(_e, v) => {
                  if (v !== null) setPrincipalView(v)
                }}
                aria-label="Vista del listado principal"
                sx={{
                  alignSelf: { xs: 'stretch', sm: 'flex-start' },
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.65,
                    fontWeight: 600,
                    textTransform: 'none'
                  }
                }}
              >
                <ToggleButton
                  value="main"
                  aria-label="Mostrar listado principal"
                >
                  Listado en uso (principal)
                </ToggleButton>
                <ToggleButton value="baseRef" aria-label="Mostrar listado base">
                  Listado base (referencia)
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          ) : null}

          {resolvedTab !== 'principal' && editing ? (
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ px: { xs: 0.5, sm: 0 }, pb: 1 }}
            >
              Variante «{editing.label}»
              {principalVariantId === editing.id
                ? ' · Es el listado principal del mazo.'
                : ''}
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <DecklistModule
          key={deckModuleKey}
          value={activeDeckText}
          showCopyListButton
        />
      </Box>
    </Paper>
  )
}
