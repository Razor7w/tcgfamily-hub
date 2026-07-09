'use client'

import Link from 'next/link'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import Badge from '@mui/material/Badge'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/hooks/useNotifications'

export default function HeaderNotificationsButton() {
  const { status } = useSession()
  const { data } = useNotifications()
  const count = data?.unreadCount ?? 0

  if (status !== 'authenticated') return null

  return (
    <Tooltip title={count > 0 ? `${count} notificación(es)` : 'Notificaciones'}>
      <IconButton
        component={Link}
        href="/dashboard/notificaciones"
        color="inherit"
        size="small"
        aria-label="Notificaciones"
      >
        <Badge
          color="error"
          badgeContent={count}
          max={9}
          invisible={count === 0}
        >
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  )
}
