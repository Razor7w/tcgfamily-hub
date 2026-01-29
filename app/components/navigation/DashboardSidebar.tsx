import { Email, Home } from '@mui/icons-material'
import {
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack
} from '@mui/material'
import SignOutList from '@/components/auth/SignOutList'
import AdminSidebarClient from './AdminSidebarClient'

export default function DashboardSidebar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Stack>
      <nav aria-label="main mailbox folders">
        <List>
          {isAdmin && <AdminSidebarClient />}
          <ListItem disablePadding>
            <ListItemButton href="/Dashboard">
              <ListItemIcon>
                <Home />
              </ListItemIcon>
              <ListItemText primary="Inicio" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton href="/Dashboard/Mail">
              <ListItemIcon>
                <Email />
              </ListItemIcon>
              <ListItemText primary="Correo" />
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
    </Stack>
  )
}
