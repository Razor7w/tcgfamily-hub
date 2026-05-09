'use client'
import {
  AdminPanelSettings,
  CalendarMonth,
  CloudUpload,
  Email,
  ExpandLess,
  ExpandMore,
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

export default function AdminSidebarClient({
  isOwner
}: {
  isOwner: boolean
}) {
  const [open, setOpen] = useState(true)

  const handleClick = () => {
    setOpen(!open)
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
          </List>
        ) : null}
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} href="/admin/eventos">
            <ListItemIcon>
              <CalendarMonth />
            </ListItemIcon>
            <ListItemText primary="Eventos" />
          </ListItemButton>
        </List>
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
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} href="/admin/ligas">
            <ListItemIcon>
              <MilitaryTech />
            </ListItemIcon>
            <ListItemText primary="Ligas" />
          </ListItemButton>
        </List>
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} href="/admin/mails">
            <ListItemIcon>
              <Email />
            </ListItemIcon>
            <ListItemText primary="Correos" />
          </ListItemButton>
        </List>
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} href="/admin/puntos">
            <ListItemIcon>
              <CloudUpload />
            </ListItemIcon>
            <ListItemText primary="Puntos (CSV)" />
          </ListItemButton>
        </List>
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
