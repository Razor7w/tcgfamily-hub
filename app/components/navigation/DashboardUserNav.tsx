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
import { useDashboardModulesFromLayout } from "@/contexts/DashboardModulesContext";

export default function DashboardUserNav({ isAdmin }: { isAdmin: boolean }) {
  const { visibility } = useDashboardModulesFromLayout();
  const showEvents = visibility.weeklyEvents;
  const showMail = visibility.mail;

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
