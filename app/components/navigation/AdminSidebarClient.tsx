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
  LocalOfferOutlined,
  MilitaryTech,
  People,
  Settings,
  StickyNote2Outlined,
  Storefront,
  SportsEsports,
  WorkspacePremium
} from '@mui/icons-material'
import {
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useMeStores } from '@/hooks/useMeStores'
import { isTcgFamilyStoreSlug } from '@/lib/store-points-clp'

export default function AdminSidebarClient({ isOwner }: { isOwner: boolean }) {
  const { data: session } = useSession()
  const { data: meStores } = useMeStores()
  const { visibility } = useDashboardModulesFromLayout()
  const showWeeklyEvents = visibility.weeklyEvents
  const showLeagues = visibility.leagues
  const showMail = visibility.mail
  const { storeCredit } = useDashboardModulesFromLayout()
  const showStorePointsMenu =
    storeCredit.csvEnabled || storeCredit.tournamentPointsEnabled
  const showShiftNotes = useMemo(() => {
    const aid = session?.user?.activeStoreId?.trim() ?? ''
    if (!aid) return false
    const hit = (meStores?.stores ?? []).find(row => row.id === aid)
    return isTcgFamilyStoreSlug(hit?.slug)
  }, [meStores?.stores, session?.user?.activeStoreId])

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
        {showShiftNotes ? (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} href="/admin/notas">
              <ListItemIcon>
                <StickyNote2Outlined />
              </ListItemIcon>
              <ListItemText primary="Notas" />
            </ListItemButton>
          </List>
        ) : null}
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
            <ListItemButton sx={{ pl: 4 }} href="/admin/equipos">
              <ListItemIcon>
                <SportsEsports />
              </ListItemIcon>
              <ListItemText primary="Equipos" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} href="/admin/sugerencias">
              <ListItemIcon>
                <LightbulbOutlined />
              </ListItemIcon>
              <ListItemText primary="Sugerencias" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} href="/admin/vendedores">
              <ListItemIcon>
                <Storefront />
              </ListItemIcon>
              <ListItemText primary="Vendedores" />
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
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} href="/admin/precios">
            <ListItemIcon>
              <LocalOfferOutlined />
            </ListItemIcon>
            <ListItemText primary="Precios" />
          </ListItemButton>
        </List>
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
            <ListItemButton sx={{ pl: 4 }} href="/admin/contribucion">
              <ListItemIcon>
                <WorkspacePremium />
              </ListItemIcon>
              <ListItemText primary="Contribución" />
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
