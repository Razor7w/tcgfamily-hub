"use client";

import { Email, Event, Home, Person } from "@mui/icons-material";
import {
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
} from "@mui/material";
import SignOutList from "@/components/auth/SignOutList";
import AdminSidebarClient from "@/components/navigation/AdminSidebarClient";
import { useDashboardModuleSettings } from "@/hooks/useDashboardModules";
import { mergeDashboardSettings } from "@/lib/dashboard-module-config";

export default function DashboardUserNav({ isAdmin }: { isAdmin: boolean }) {
  const { data: settings, isPending } = useDashboardModuleSettings();
  const merged = settings ?? mergeDashboardSettings(null);
  const showEvents = merged.visibility.weeklyEvents;
  const showMail = merged.visibility.mail;

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
          {(isPending || showEvents) && (
            <ListItem disablePadding>
              <ListItemButton href="/dashboard/eventos">
                <ListItemIcon>
                  <Event />
                </ListItemIcon>
                <ListItemText primary="Eventos" />
              </ListItemButton>
            </ListItem>
          )}
          {(isPending || showMail) && (
            <ListItem disablePadding>
              <ListItemButton href="/dashboard/mail">
                <ListItemIcon>
                  <Email />
                </ListItemIcon>
                <ListItemText primary="Correo" />
              </ListItemButton>
            </ListItem>
          )}
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
    </Stack>
  );
}
