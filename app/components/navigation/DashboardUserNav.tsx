'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ExpandLess,
  ExpandMore,
  Home,
  Insights,
  Layers,
  Storefront,
  Person,
  Public,
  Style,
  ViewModule
} from '@mui/icons-material'
import {
  Box,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack
} from '@mui/material'
import AppVersion from '@/components/AppVersion'
import { isStoreContextHubPath } from '@/lib/store-context-hub-path'
import { useStoreHubHref } from '@/hooks/useStoreHubHref'
import SignOutList from '@/components/auth/SignOutList'
import AdminSidebarClient from '@/components/navigation/AdminSidebarClient'

function isUnderDecklistNav(path: string) {
  return (
    path === '/dashboard/decklists' ||
    path.startsWith('/dashboard/decklists/') ||
    path.startsWith('/dashboard/deck-builder')
  )
}

export default function DashboardUserNav({
  isAdmin,
  isOwner
}: {
  isAdmin: boolean
  isOwner: boolean
}) {
  const pathname = usePathname() ?? ''
  const storeHubHref = useStoreHubHref()
  const [decklistOpen, setDecklistOpen] = useState(() =>
    isUnderDecklistNav(pathname)
  )
  useEffect(() => {
    if (!isUnderDecklistNav(pathname)) return
    queueMicrotask(() => {
      setDecklistOpen(true)
    })
  }, [pathname])

  return (
    <Stack>
      <nav aria-label="main mailbox folders">
        <List data-tour="dashboard-main-nav">
          {isAdmin && <AdminSidebarClient isOwner={isOwner} />}
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/dashboard"
              selected={pathname === '/dashboard'}
            >
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary="Inicio" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href={storeHubHref}
              selected={
                pathname === '/dashboard/tiendas' ||
                isStoreContextHubPath(pathname)
              }
            >
              <ListItemIcon>
                <Storefront />
              </ListItemIcon>
              <ListItemText primary="Tiendas" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/dashboard/tu-actividad"
              selected={
                pathname === '/dashboard/tu-actividad' ||
                pathname.startsWith('/dashboard/tu-actividad/')
              }
            >
              <ListItemIcon>
                <Insights />
              </ListItemIcon>
              <ListItemText primary="Tu actividad" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setDecklistOpen(s => !s)}
              aria-expanded={decklistOpen}
            >
              <ListItemIcon>
                <Style />
              </ListItemIcon>
              <ListItemText primary="Mazos" />
              {decklistOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          <Collapse in={decklistOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem disablePadding>
                <ListItemButton href="/dashboard/decklists" sx={{ pl: 3 }}>
                  <ListItemIcon>
                    <Layers fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Mis listas" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  href="/dashboard/decklists/publicos"
                  sx={{ pl: 3 }}
                >
                  <ListItemIcon>
                    <Public fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Listas públicas" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton href="/dashboard/deck-builder" sx={{ pl: 3 }}>
                  <ListItemIcon>
                    <ViewModule fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Armar mazo" />
                </ListItemButton>
              </ListItem>
            </List>
          </Collapse>
          <ListItem disablePadding>
            <ListItemButton href="/dashboard/perfil">
              <ListItemIcon>
                <Person />
              </ListItemIcon>
              <ListItemText primary="Perfil" />
            </ListItemButton>
          </ListItem>
        </List>
      </nav>

      <Divider />

      <nav aria-label="secondary mailbox folders">
        <List>
          <SignOutList />
        </List>
      </nav>

      <Box sx={{ px: 2, pt: 2 }}>
        <AppVersion align="left" />
      </Box>
    </Stack>
  )
}
