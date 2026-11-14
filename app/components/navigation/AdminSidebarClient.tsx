'use client'
import {
  AdminPanelSettings,
  CalendarMonth,
  CasinoOutlined,
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
import { Collapse, List } from '@mui/material'
import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useMeStores } from '@/hooks/useMeStores'
import { isTcgFamilyStoreSlug } from '@/lib/store-points-clp'
import SidebarNavItem from '@/components/navigation/SidebarNavItem'
import { useSidebarRail } from '@/components/navigation/useSidebarRail'

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
  const rail = useSidebarRail()

  const [open, setOpen] = useState(true)

  const handleClick = () => {
    setOpen(!open)
  }

  return (
    <>
      {rail ? null : (
        <SidebarNavItem
          label="Admin"
          icon={<AdminPanelSettings />}
          onClick={handleClick}
          ariaExpanded={open}
          trailing={open ? <ExpandLess /> : <ExpandMore />}
        />
      )}
      <Collapse in={rail || open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {showMail ? (
            <SidebarNavItem
              label="Correos"
              icon={<Email />}
              href="/admin/mails"
              inset={4}
            />
          ) : null}
          <SidebarNavItem
            label="Precios"
            icon={<LocalOfferOutlined />}
            href="/admin/precios"
            inset={4}
          />
          {showShiftNotes ? (
            <SidebarNavItem
              label="Notas"
              icon={<StickyNote2Outlined />}
              href="/admin/notas"
              inset={4}
            />
          ) : null}
          {showWeeklyEvents ? (
            <SidebarNavItem
              label="Eventos"
              icon={<CalendarMonth />}
              href="/admin/eventos"
              inset={4}
            />
          ) : null}
          <SidebarNavItem
            label="Precon"
            icon={<CasinoOutlined />}
            href="/admin/precon"
            inset={4}
          />
          {showLeagues ? (
            <SidebarNavItem
              label="Ligas"
              icon={<MilitaryTech />}
              href="/admin/ligas"
              inset={4}
            />
          ) : null}
          {showStorePointsMenu ? (
            <SidebarNavItem
              label="Puntos de tienda"
              icon={<CloudUpload />}
              href="/admin/puntos"
              inset={4}
            />
          ) : null}
          {isOwner ? (
            <>
              <SidebarNavItem
                label="Contribución"
                icon={<WorkspacePremium />}
                href="/admin/contribucion"
                inset={4}
              />
              <SidebarNavItem
                label="Configuración"
                icon={<Settings />}
                href="/admin/configuracion"
                inset={4}
              />
              <SidebarNavItem
                label="Más"
                icon={<MoreHoriz />}
                href="/admin/mas"
                inset={4}
              />
            </>
          ) : null}
        </List>
      </Collapse>
    </>
  )
}
