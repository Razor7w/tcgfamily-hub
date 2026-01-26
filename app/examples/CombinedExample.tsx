"use client";

/**
 * EJEMPLO COMBINADO: TanStack Query + Zustand
 * 
 * Este ejemplo muestra cómo usar ambas librerías juntas:
 * - TanStack Query para datos del servidor
 * - Zustand para estado UI y filtros
 * - Sincronización entre ambos
 */

import { useUsers } from "@/hooks/useUsers";
import { useAppStore } from "@/store/useAppStore";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

export default function CombinedExample() {
  // TanStack Query: Obtener datos del servidor
  const { data: users = [], isLoading, error } = useUsers();

  // Zustand: Estado UI y filtros
  const userFilter = useAppStore((state) => state.userFilter);
  const setUserFilter = useAppStore((state) => state.setUserFilter);
  const clearUserFilter = useAppStore((state) => state.clearUserFilter);

  // Aplicar filtros (lógica combinada)
  const filteredUsers = users.filter((user) => {
    // Filtro por rol
    if (userFilter.role && user.role !== userFilter.role) {
      return false;
    }

    // Filtro por búsqueda
    if (userFilter.search) {
      const search = userFilter.search.toLowerCase();
      return (
        user.name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.rut?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Ejemplo Combinado: TanStack Query + Zustand
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        TanStack Query maneja los datos del servidor, Zustand maneja los
        filtros UI. Ambos trabajan juntos perfectamente.
      </Typography>

      {/* Filtros usando Zustand */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros (Zustand)
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            label="Buscar"
            value={userFilter.search || ""}
            onChange={(e) =>
              setUserFilter({ search: e.target.value || undefined })
            }
            placeholder="Nombre, email o RUT"
            sx={{ flex: 1 }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Rol</InputLabel>
            <Select
              value={userFilter.role || ""}
              label="Rol"
              onChange={(e) =>
                setUserFilter({
                  role: (e.target.value as "user" | "admin") || undefined,
                })
              }
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="user">Usuario</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {userFilter.role && (
            <Chip
              label={`Rol: ${userFilter.role}`}
              onDelete={() => setUserFilter({ role: undefined })}
            />
          )}
          {userFilter.search && (
            <Chip
              label={`Buscar: ${userFilter.search}`}
              onDelete={() => setUserFilter({ search: undefined })}
            />
          )}
          {(userFilter.role || userFilter.search) && (
            <Chip
              label="Limpiar todo"
              onClick={clearUserFilter}
              onDelete={clearUserFilter}
              color="primary"
            />
          )}
        </Box>
      </Paper>

      {/* Datos usando TanStack Query */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Usuarios (TanStack Query)
        </Typography>

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Error: {error.message}
          </Alert>
        )}

        {!isLoading && !error && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {filteredUsers.length === 0 ? (
                <Alert severity="info">
                  No hay usuarios que coincidan con los filtros
                </Alert>
              ) : (
                filteredUsers.slice(0, 10).map((user) => (
                  <Box
                    key={user.id}
                    sx={{
                      p: 2,
                      bgcolor: "#f5f5f5",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body1" fontWeight="bold">
                      {user.name || "Sin nombre"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <Chip
                        label={user.role}
                        size="small"
                        color={user.role === "admin" ? "primary" : "default"}
                      />
                      {user.rut && (
                        <Chip label={`RUT: ${user.rut}`} size="small" />
                      )}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </>
        )}
      </Paper>

      {/* Información adicional */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: "#e3f2fd" }}>
        <Typography variant="subtitle2" gutterBottom>
          💡 Cómo funciona:
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>
              <strong>TanStack Query</strong> obtiene los usuarios del servidor
              con caché automático
            </li>
            <li>
              <strong>Zustand</strong> almacena los filtros en estado global
              (persistido en localStorage)
            </li>
            <li>
              Los filtros se aplican en el cliente sobre los datos cacheados
            </li>
            <li>
              Si cambias los filtros y navegas a otra página, los filtros se
              mantienen gracias a Zustand
            </li>
            <li>
              Si los datos cambian en el servidor, TanStack Query los actualiza
              automáticamente
            </li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
}
