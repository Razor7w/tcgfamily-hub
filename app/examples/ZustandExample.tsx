"use client";

/**
 * EJEMPLO DE USO DE ZUSTAND
 * 
 * Este componente muestra diferentes patrones de uso de Zustand:
 * - Estado global compartido
 * - Selectores para performance
 * - Persistencia en localStorage
 * - Acciones y actualizaciones
 */

import { useAppStore, useSidebar, useTheme } from "@/store/useAppStore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export default function ZustandExample() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Ejemplos de Zustand
      </Typography>

      {/* Ejemplo 1: Estado UI simple */}
      <Example1UISate />

      {/* Ejemplo 2: Filtros globales */}
      <Example2GlobalFilters />

      {/* Ejemplo 3: Notificaciones */}
      <Example3Notifications />

      {/* Ejemplo 4: Selectores para performance */}
      <Example4Selectors />
    </Box>
  );
}

// ============================================
// Ejemplo 1: Estado UI simple
// ============================================
function Example1UISate() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        1. Estado UI - Sidebar
      </Typography>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Typography>Sidebar: {sidebarOpen ? "Abierto" : "Cerrado"}</Typography>
        <Button variant="outlined" onClick={toggleSidebar}>
          Toggle
        </Button>
        <Button
          variant="outlined"
          onClick={() => setSidebarOpen(true)}
        >
          Abrir
        </Button>
        <Button
          variant="outlined"
          onClick={() => setSidebarOpen(false)}
        >
          Cerrar
        </Button>
      </Box>
    </Paper>
  );
}

// ============================================
// Ejemplo 2: Filtros globales
// ============================================
function Example2GlobalFilters() {
  const userFilter = useAppStore((state) => state.userFilter);
  const setUserFilter = useAppStore((state) => state.setUserFilter);
  const clearUserFilter = useAppStore((state) => state.clearUserFilter);

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        2. Filtros Globales - Compartidos entre componentes
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Buscar"
          value={userFilter.search || ""}
          onChange={(e) =>
            setUserFilter({ search: e.target.value || undefined })
          }
          placeholder="Buscar por nombre, email o RUT"
        />
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <FormControlLabel
            control={
              <Switch
                checked={userFilter.role === "admin"}
                onChange={(e) =>
                  setUserFilter({
                    role: e.target.checked ? "admin" : undefined,
                  })
                }
              />
            }
            label="Solo Admins"
          />
          <Button size="small" onClick={clearUserFilter}>
            Limpiar Filtros
          </Button>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Filtros activos:
          </Typography>
          {userFilter.role && (
            <Chip
              label={`Rol: ${userFilter.role}`}
              onDelete={() => setUserFilter({ role: undefined })}
              sx={{ mr: 1, mt: 1 }}
            />
          )}
          {userFilter.search && (
            <Chip
              label={`Buscar: ${userFilter.search}`}
              onDelete={() => setUserFilter({ search: undefined })}
              sx={{ mr: 1, mt: 1 }}
            />
          )}
          {!userFilter.role && !userFilter.search && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No hay filtros activos
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

// ============================================
// Ejemplo 3: Notificaciones
// ============================================
function Example3Notifications() {
  const notifications = useAppStore((state) => state.notifications);
  const addNotification = useAppStore((state) => state.addNotification);
  const removeNotification = useAppStore((state) => state.removeNotification);
  const clearNotifications = useAppStore((state) => state.clearNotifications);

  const handleAddNotification = (type: "success" | "error" | "info" | "warning") => {
    addNotification({
      message: `Notificación de tipo ${type} - ${new Date().toLocaleTimeString()}`,
      type,
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        3. Sistema de Notificaciones Global
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button
          size="small"
          variant="contained"
          color="success"
          onClick={() => handleAddNotification("success")}
        >
          Success
        </Button>
        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={() => handleAddNotification("error")}
        >
          Error
        </Button>
        <Button
          size="small"
          variant="contained"
          color="info"
          onClick={() => handleAddNotification("info")}
        >
          Info
        </Button>
        <Button
          size="small"
          variant="contained"
          color="warning"
          onClick={() => handleAddNotification("warning")}
        >
          Warning
        </Button>
        <Button size="small" onClick={clearNotifications}>
          Limpiar Todas
        </Button>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay notificaciones
          </Typography>
        ) : (
          notifications.map((notification) => (
            <Box
              key={notification.id}
              sx={{
                p: 1,
                bgcolor: "#f5f5f5",
                borderRadius: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  [{notification.type.toUpperCase()}]
                </Typography>
                <Typography variant="body2">{notification.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(notification.timestamp).toLocaleString()}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => removeNotification(notification.id)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}

// ============================================
// Ejemplo 4: Selectores para performance
// ============================================
function Example4Selectors() {
  // Usando selectores personalizados (más eficiente)
  const sidebarOpen = useSidebar();
  const theme = useTheme();

  // O usando directamente (también funciona, pero menos eficiente si hay muchos componentes)
  const setTheme = useAppStore((state) => state.setTheme);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        4. Selectores para Performance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Los selectores personalizados (useSidebar, useTheme) solo se
        re-renderizan cuando cambia ese valor específico, mejorando el
        performance.
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box>
          <Typography variant="body2">
            Sidebar: {sidebarOpen ? "Abierto" : "Cerrado"}
          </Typography>
          <Typography variant="body2">Tema: {theme}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            Cambiar Tema
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Nota: El tema se persiste en localStorage gracias a la
          configuración de persist en el store.
        </Typography>
      </Box>
    </Paper>
  );
}
