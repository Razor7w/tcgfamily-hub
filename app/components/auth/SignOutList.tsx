'use client'

import { signOut } from 'next-auth/react'
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import { Logout } from '@mui/icons-material'

export default function SignOutList() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
  }
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={handleLogout}>
        <ListItemIcon>
          <Logout />
        </ListItemIcon>
        <ListItemText primary="Cerrar sesión" />
      </ListItemButton>
    </ListItem>
  )
}
