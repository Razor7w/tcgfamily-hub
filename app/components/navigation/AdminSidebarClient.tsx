'use client'
import {
  AdminPanelSettings,
  CalendarMonth,
  CloudUpload,
  Email,
  ExpandLess,
  ExpandMore,
  LocalOfferOutlined,
  MilitaryTech,
  MoreHoriz,
  Settings,
  StickyNote2Outlined,
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
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} href="/admin/precios">
            <ListItemIcon>
              <LocalOfferOutlined />
            </ListItemIcon>
            <ListItemText primary="Precios" />
          </ListItemButton>
        </List>
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
            <ListItemButton sx={{ pl: 4 }} href="/admin/configuracion">
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText primary="Configuración" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} href="/admin/mas">
              <ListItemIcon>
                <MoreHoriz />
              </ListItemIcon>
              <ListItemText primary="Más" />
            </ListItemButton>
          </List>
        ) : null}
      </Collapse>
    </>
  )
}
