"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import {
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
import TanStackQueryExample from "@/examples/TanStackQueryExample";
import ZustandExample from "@/examples/ZustandExample";
import { useGetMailById } from "@/hooks/useMails";

interface Module {
  id: string;
  name: string;
  icon: React.ReactNode;
  route?: string;
}

const modules: Module[] = [
  { id: "1", name: "Usuarios", icon: <PeopleIcon />, route: "/Admin/Users" },
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
  const [mailId, setMailId] = useState("");
  const { data: mail, isLoading, error, isFetching } = useGetMailById(
    mailId.trim() || null,
  );

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

        {/* Ejemplo useGetMailById: buscar mail por ID */}
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Buscar mail por ID (useGetMailById)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Escribe un ObjectId de MongoDB (ej. de la lista de mails) y se
            cargará al tener algo válido.
          </Typography>
          <TextField
            label="ID del mail"
            placeholder="ej. 507f1f77bcf86cd799439011"
            value={mailId}
            onChange={(e) => setMailId(e.target.value)}
            fullWidth
            sx={{ maxWidth: 400 }}
            size="small"
          />
          <Box sx={{ mt: 2, minHeight: 80 }}>
            {!mailId.trim() && (
              <Typography variant="body2" color="text.secondary">
                Escribe un ID para buscar.
              </Typography>
            )}
            {mailId.trim() && isLoading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Cargando mail…</Typography>
              </Box>
            )}
            {mailId.trim() && isFetching && !isLoading && (
              <Typography variant="caption" color="text.secondary">
                Actualizando…
              </Typography>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error.message}
              </Alert>
            )}
            {mail && !error && (
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                }}
              >
                <Typography variant="subtitle2">Mail encontrado</Typography>
                <Typography variant="body2">
                  De: {mail.fromUserId?.name ?? "—"} (
                  {mail.fromUserId?.rut ?? "—"})
                </Typography>
                <Typography variant="body2">
                  Para: {mail.toUserId?.name ?? "—"} (
                  {mail.toUserId?.rut ?? "—"})
                </Typography>
                <Typography variant="body2">
                  Recibido: {mail.isRecived ? "Sí" : "No"}
                </Typography>
                {mail.observations && (
                  <Typography variant="body2">
                    Observaciones: {mail.observations}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Paper>

        <TanStackQueryExample />
        <ZustandExample />
      </Container>
    </Box>
  );
}
