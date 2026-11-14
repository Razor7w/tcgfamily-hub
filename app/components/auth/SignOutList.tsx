'use client'

import { signOut } from 'next-auth/react'
import { Logout } from '@mui/icons-material'
import SidebarNavItem from '@/components/navigation/SidebarNavItem'

export default function SignOutList() {
  return (
    <SidebarNavItem
      label="Cerrar sesión"
      icon={<Logout />}
      onClick={() => {
        void signOut({ callbackUrl: '/' })
      }}
    />
  )
}
