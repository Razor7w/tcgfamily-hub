"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
          Módulos
        </Typography>
        <Grid container spacing={3}>
          {modules.map((module) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={module.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    py: 4,
                  }}
                >
                  <Box
                    sx={{
                      fontSize: 48,
                      color: "primary.main",
                      mb: 2,
                    }}
                  >
                    {module.icon}
                  </Box>
                  <Typography variant="h6" component="h2">
                    {module.name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
