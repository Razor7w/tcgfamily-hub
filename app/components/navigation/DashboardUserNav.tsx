'use client'

import {
  BarChart,
  Email,
  EmojiEvents,
  Event,
  Home,
  Layers,
  Person
} from '@mui/icons-material'
import {
  Box,
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

export default function DashboardUserNav({ isAdmin }: { isAdmin: boolean }) {
  const { visibility } = useDashboardModulesFromLayout()
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
            <ListItemButton href="/dashboard/decklists">
              <ListItemIcon>
                <Layers />
              </ListItemIcon>
              <ListItemText primary="Decklists" />
            </ListItemButton>
          </ListItem>
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
