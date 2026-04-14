'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import { useTheme, useMediaQuery } from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
import PersonIcon from '@mui/icons-material/Person'
import { useAppStore } from '@/store/useAppStore'

const ACCOUNT_DRAWER_WIDTH = 300

export default function Header() {
  const { data: session } = useSession()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), {
    defaultMatches: false,
    noSsr: true
  })
  const toggleSidebar = useAppStore(s => s.toggleSidebar)

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleAccountClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isDesktop) handleMenu(event)
    else setAccountDrawerOpen(true)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const closeAccountDrawer = () => setAccountDrawerOpen(false)

  const handleLogout = async () => {
    handleClose()
    closeAccountDrawer()
    await signOut({ callbackUrl: '/' })
  }

  return (
    <AppBar position="static">
      <Toolbar>
        {!isDesktop && (
          <Tooltip title="Menú">
            <IconButton
              color="inherit"
              aria-label="abrir menú"
              onClick={toggleSidebar}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
        )}
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': { opacity: 0.9 }
          }}
        >
          TCGFamily HUB
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* User Menu */}
          {session?.user && (
            <>
              <Tooltip title="Configuración de cuenta">
                <IconButton
                  size="large"
                  onClick={handleAccountClick}
                  color="inherit"
                  sx={{ ml: 1 }}
                >
                  {session.user.image ? (
                    <Avatar
                      src={session.user.image}
                      alt={session.user.name || 'Usuario'}
                      sx={{ width: 32, height: 32 }}
                    />
                  ) : (
                    <AccountCircleIcon />
                  )}
                </IconButton>
              </Tooltip>
              {isDesktop ? (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  disableScrollLock
                  slotProps={{
                    paper: {
                      sx: { maxHeight: 'min(70vh, 480px)' }
                    }
                  }}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                  }}
                >
                  <MenuItem disabled>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {session.user.name}
                    </Typography>
                  </MenuItem>
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      {session.user.email}
                    </Typography>
                  </MenuItem>
                  <MenuItem component={Link} href="/dashboard/perfil" onClick={handleClose}>
                    <PersonIcon sx={{ mr: 1 }} />
                    Perfil
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    Cerrar sesión
                  </MenuItem>
                </Menu>
              ) : (
                <Drawer
                  anchor="right"
                  open={accountDrawerOpen}
                  onClose={closeAccountDrawer}
                  disableScrollLock
                  ModalProps={{ keepMounted: true }}
                  slotProps={{
                    paper: {
                      sx: {
                        width: `min(100vw, ${ACCOUNT_DRAWER_WIDTH}px)`,
                        boxSizing: 'border-box'
                      }
                    }
                  }}
                >
                  <Toolbar
                    sx={{
                      justifyContent: 'space-between',
                      borderBottom: 1,
                      borderColor: 'divider'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>
                      Cuenta
                    </Typography>
                    <IconButton
                      edge="end"
                      aria-label="cerrar"
                      onClick={closeAccountDrawer}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Toolbar>
                  <Box sx={{ px: 2, py: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {session.user.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {session.user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ py: 1 }}>
                    <ListItemButton
                      component={Link}
                      href="/dashboard/perfil"
                      onClick={closeAccountDrawer}
                    >
                      <ListItemIcon>
                        <PersonIcon />
                      </ListItemIcon>
                      <ListItemText primary="Perfil" />
                    </ListItemButton>
                    <ListItemButton onClick={handleLogout}>
                      <ListItemIcon>
                        <LogoutIcon />
                      </ListItemIcon>
                      <ListItemText primary="Cerrar sesión" />
                    </ListItemButton>
                  </Box>
                </Drawer>
              )}
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
