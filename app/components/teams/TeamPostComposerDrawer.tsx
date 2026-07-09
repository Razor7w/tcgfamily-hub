'use client'

import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import TeamPostComposer from '@/components/teams/TeamPostComposer'
import type { TeamPostDTO } from '@/lib/teams/post-payload'

type Props = {
  open: boolean
  teamId: string
  teamSlug: string
  editPost?: TeamPostDTO | null
  onClose: () => void
}

export default function TeamPostComposerDrawer({
  open,
  teamId,
  teamSlug,
  editPost = null,
  onClose
}: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isEditing = editPost != null

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : { sm: 440, md: 500 },
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0
        }}
      >
        <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em">
          {isEditing ? 'Editar publicación' : 'Nueva publicación'}
        </Typography>
        <IconButton aria-label="Cerrar" onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2.5 }}>
        <TeamPostComposer
          key={editPost?.id ?? 'new'}
          teamId={teamId}
          teamSlug={teamSlug}
          editPost={editPost}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </Box>
    </Drawer>
  )
}
