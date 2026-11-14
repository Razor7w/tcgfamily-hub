'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  ExpandLess,
  ExpandMore,
  FolderOpen,
  Home,
  Insights,
  Layers,
  MarkunreadMailboxOutlined,
  CatchingPokemon,
  Storefront,
  Person,
  Public,
  Style,
  ViewModule
} from '@mui/icons-material'
import { Box, Collapse, Divider, List, Stack } from '@mui/material'
import AppVersion from '@/components/AppVersion'
import { isStoreContextHubPath } from '@/lib/store-context-hub-path'
import { useStoreHubHref } from '@/hooks/useStoreHubHref'
import SignOutList from '@/components/auth/SignOutList'
import AdminSidebarClient from '@/components/navigation/AdminSidebarClient'
import SidebarNavItem from '@/components/navigation/SidebarNavItem'
import { useSidebarRail } from '@/components/navigation/useSidebarRail'
import { useDashboardModulesFromLayout } from '@/contexts/DashboardModulesContext'
import { useMe } from '@/hooks/useMe'
import { useAppStore } from '@/store/useAppStore'

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
  const { visibility } = useDashboardModulesFromLayout()
  const showMail = visibility.mail
  const { data: me } = useMe()
  const showCarpetas = Boolean(me?.sellerModuleAccess)
  const rail = useSidebarRail()
  const sidebarCompact = useAppStore(s => s.sidebarCompact)
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
          <SidebarNavItem
            label="Inicio"
            icon={<Home />}
            href="/dashboard"
            selected={pathname === '/dashboard'}
          />
          <SidebarNavItem
            label="Tiendas"
            icon={<Storefront />}
            href={storeHubHref}
            selected={
              pathname === '/dashboard/tiendas' ||
              isStoreContextHubPath(pathname)
            }
          />
          {showMail ? (
            <SidebarNavItem
              label="Correos"
              icon={<MarkunreadMailboxOutlined />}
              href="/dashboard/mail"
              selected={
                pathname === '/dashboard/mail' ||
                pathname.startsWith('/dashboard/mail/')
              }
            />
          ) : null}
          <SidebarNavItem
            label="Tu actividad"
            icon={<Insights />}
            href="/dashboard/tu-actividad"
            selected={
              pathname === '/dashboard/tu-actividad' ||
              pathname.startsWith('/dashboard/tu-actividad/')
            }
          />
          <SidebarNavItem
            label="Pokédex 30"
            icon={<CatchingPokemon />}
            href="/dashboard/pokedex-30"
            selected={
              pathname === '/dashboard/pokedex-30' ||
              pathname.startsWith('/dashboard/pokedex-30/')
            }
          />
          {showCarpetas ? (
            <SidebarNavItem
              label="Carpetas"
              icon={<FolderOpen />}
              href="/dashboard/carpetas"
              selected={
                pathname === '/dashboard/carpetas' ||
                pathname.startsWith('/dashboard/carpetas/')
              }
            />
          ) : null}
          {rail ? null : (
            <SidebarNavItem
              label="Mazos"
              icon={<Style />}
              onClick={() => setDecklistOpen(s => !s)}
              ariaExpanded={decklistOpen}
              trailing={decklistOpen ? <ExpandLess /> : <ExpandMore />}
            />
          )}
          <Collapse in={rail || decklistOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <SidebarNavItem
                label="Mis listas"
                icon={<Layers fontSize="small" />}
                href="/dashboard/decklists"
                inset={3}
                selected={
                  pathname === '/dashboard/decklists' ||
                  (pathname.startsWith('/dashboard/decklists/') &&
                    !pathname.startsWith('/dashboard/decklists/publicos'))
                }
              />
              <SidebarNavItem
                label="Listas públicas"
                icon={<Public fontSize="small" />}
                href="/dashboard/decklists/publicos"
                inset={3}
                selected={pathname.startsWith('/dashboard/decklists/publicos')}
              />
              <SidebarNavItem
                label="Armar mazo"
                icon={<ViewModule fontSize="small" />}
                href="/dashboard/deck-builder"
                inset={3}
                selected={pathname.startsWith('/dashboard/deck-builder')}
              />
            </List>
          </Collapse>
          <SidebarNavItem
            label="Perfil"
            icon={<Person />}
            href="/dashboard/perfil"
            selected={
              pathname === '/dashboard/perfil' ||
              pathname.startsWith('/dashboard/perfil/')
            }
          />
        </List>
      </nav>

      <Divider />

      <nav aria-label="secondary mailbox folders">
        <List>
          <SignOutList />
        </List>
      </nav>

      <Box
        sx={{
          px: 2,
          pt: 2,
          display: sidebarCompact ? { xs: 'block', md: 'none' } : 'block'
        }}
      >
        <AppVersion align="left" />
      </Box>
    </Stack>
  )
}
