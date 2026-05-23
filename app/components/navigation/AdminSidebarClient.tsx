'use client'
import {
  AdminPanelSettings,
  CalendarMonth,
  CloudUpload,
  Email,
  ExpandLess,
  ExpandMore,
  AssignmentOutlined,
  LightbulbOutlined,
  MilitaryTech,
  People,
  Settings,
  Storefront,
  SportsEsports
} from '@mui/icons-material'
import {
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import { useState } from 'react'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'

export default function AdminSidebarClient({ isOwner }: { isOwner: boolean }) {
  const { visibility } = useDashboardModulesFromLayout()
  const showWeeklyEvents = visibility.weeklyEvents
  const showLeagues = visibility.leagues
  const showMail = visibility.mail
  const { storeCredit } = useDashboardModulesFromLayout()
  const showStorePointsMenu =
    storeCredit.csvEnabled || storeCredit.tournamentPointsEnabled
  const hasStoreStaffNav =
    showWeeklyEvents || showLeagues || showMail || showStorePointsMenu

  const [open, setOpen] = useState(true)

  const handleClick = () => {
    setOpen(!open)
  }

  if (!isOwner && !hasStoreStaffNav) {
    return null
  }

  return (
    <>
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>
          <AdminPanelSettings />
        </ListItemIcon>
        <ListItemText primary="Admin" />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        {isOwner ? (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} href="/admin/users">
              <ListItemIcon>
                <People />
              </ListItemIcon>
              <ListItemText primary="Usuarios" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} href="/admin/tiendas">
              <ListItemIcon>
                <Storefront />
              </ListItemIcon>
              <ListItemText primary="Tiendas" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} href="/admin/sugerencias">
              <ListItemIcon>
                <LightbulbOutlined />
              </ListItemIcon>
              <ListItemText primary="Sugerencias" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} href="/admin/reporte-manual">
              <ListItemIcon>
                <AssignmentOutlined />
              </ListItemIcon>
              <ListItemText primary="Reporte manual" />
            </ListItemButton>
          </List>
        ) : null}
        {showWeeklyEvents ? (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} href="/admin/eventos">
              <ListItemIcon>
                <CalendarMonth />
              </ListItemIcon>
              <ListItemText primary="Eventos" />
            </ListItemButton>
          </List>
        ) : null}
        {isOwner ? (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} href="/admin/torneos-custom">
              <ListItemIcon>
                <SportsEsports />
              </ListItemIcon>
              <ListItemText primary="Torneos custom" />
            </ListItemButton>
          </List>
        ) : null}
        {showLeagues ? (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} href="/admin/ligas">
              <ListItemIcon>
                <MilitaryTech />
              </ListItemIcon>
              <ListItemText primary="Ligas" />
            </ListItemButton>
          </List>
        ) : null}
        {showMail ? (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} href="/admin/mails">
              <ListItemIcon>
                <Email />
              </ListItemIcon>
              <ListItemText primary="Correos" />
            </ListItemButton>
          </List>
        ) : null}
        {showStorePointsMenu ? (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} href="/admin/puntos">
              <ListItemIcon>
                <CloudUpload />
              </ListItemIcon>
              <ListItemText primary="Puntos de tienda" />
            </ListItemButton>
          </List>
        ) : null}
        {isOwner ? (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} href="/admin/configuracion">
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Configuración" />
            </ListItemButton>
          </List>
        ) : null}
      </Collapse>
    </>
  )
}
