'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  BarChart,
  Email,
  EmojiEvents,
  Event,
  ExpandLess,
  ExpandMore,
  Home,
  Layers,
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
import SignOutList from '@/components/auth/SignOutList'
import AdminSidebarClient from '@/components/navigation/AdminSidebarClient'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'

function isUnderDecklistNav(path: string) {
  return (
    path === '/dashboard/decklists' ||
    path.startsWith('/dashboard/decklists/') ||
    path.startsWith('/dashboard/deck-builder')
  )
}

export default function DashboardUserNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname() ?? ''
  const { visibility } = useDashboardModulesFromLayout()
  const [decklistOpen, setDecklistOpen] = useState(() =>
    isUnderDecklistNav(pathname)
  )
  useEffect(() => {
    if (!isUnderDecklistNav(pathname)) return
    queueMicrotask(() => {
      setDecklistOpen(true)
    })
  }, [pathname])
  const showEvents = visibility.weeklyEvents
  const showMyTournaments = visibility.myTournaments
  const showStatistics = visibility.statistics
  const showMail = visibility.mail

  return (
    <Stack>
      <nav aria-label="main mailbox folders">
        <List>
          {isAdmin && <AdminSidebarClient />}
          <ListItem disablePadding>
            <ListItemButton href="/dashboard">
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary="Inicio" />
            </ListItemButton>
          </ListItem>
          {showEvents ? (
            <ListItem disablePadding>
              <ListItemButton href="/dashboard/eventos">
                <ListItemIcon>
                  <Event />
                </ListItemIcon>
                <ListItemText primary="Eventos" />
              </ListItemButton>
            </ListItem>
          ) : null}
          {showMyTournaments ? (
            <ListItem disablePadding>
              <ListItemButton href="/dashboard/torneos-semana">
                <ListItemIcon>
                  <EmojiEvents />
                </ListItemIcon>
                <ListItemText primary="Mis torneos" />
              </ListItemButton>
            </ListItem>
          ) : null}
          {showStatistics ? (
            <ListItem disablePadding>
              <ListItemButton href="/dashboard/estadisticas">
                <ListItemIcon>
                  <BarChart />
                </ListItemIcon>
                <ListItemText primary="Estadísticas" />
              </ListItemButton>
            </ListItem>
          ) : null}
          {showMail ? (
            <ListItem disablePadding>
              <ListItemButton href="/dashboard/mail">
                <ListItemIcon>
                  <Email />
                </ListItemIcon>
                <ListItemText primary="Correo" />
              </ListItemButton>
            </ListItem>
          ) : null}
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
