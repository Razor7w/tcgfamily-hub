"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import {
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Folder as FolderIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
} from "@mui/icons-material";
import { Grid } from "@mui/material";
import CardModule from "@/components/molecule/CardModule";

interface Module {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const modules: Module[] = [
  { id: "1", name: "Dashboard", icon: <DashboardIcon /> },
  { id: "2", name: "Correos", icon: <EmailIcon /> },
  { id: "3", name: "Usuarios", icon: <PeopleIcon /> },
  { id: "4", name: "Configuración", icon: <SettingsIcon /> },
  { id: "5", name: "Analíticas", icon: <AnalyticsIcon /> },
  { id: "6", name: "Archivos", icon: <FolderIcon /> },
  { id: "7", name: "Notificaciones", icon: <NotificationsIcon /> },
  { id: "8", name: "Seguridad", icon: <SecurityIcon /> },
  { id: "9", name: "Ayuda", icon: <HelpIcon /> },
];

export default function DashboardPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          Admin
        </Typography>
        <Grid container spacing={3}>
          {modules.map((module) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={module.id}>
              <CardModule module={module} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
