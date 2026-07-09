'use client'

import MarkunreadMailbox from '@mui/icons-material/MarkunreadMailbox'
import Box from '@mui/material/Box'
import { DashboardActionTile } from '@/components/dashboard/DashboardQuickActions'

type DashboardRegisterMailShortcutProps = {
  onRegisterMail: () => void
}

export default function DashboardRegisterMailShortcut({
  onRegisterMail
}: DashboardRegisterMailShortcutProps) {
  return (
    <Box
      data-tour="dashboard-register-mail"
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 320 },
        justifySelf: { sm: 'end' }
      }}
    >
      <DashboardActionTile
        icon={<MarkunreadMailbox />}
        title="Registrar correo"
        titleAttr="Añade un envío a la tienda."
        description="Añade un envío a la tienda."
        onClick={onRegisterMail}
        dense
      />
    </Box>
  )
}
