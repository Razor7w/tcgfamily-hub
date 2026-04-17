"use client";

import { useMemo, useState } from "react";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import { alpha, type Theme } from "@mui/material/styles";
import NextLink from "next/link";
import {
  useAdminDashboardModuleSettings,
  useUpdateDashboardModuleSettings,
} from "@/hooks/useDashboardModules";
import {
  mergeDashboardSettings,
  type DashboardModuleId,
  type DashboardModuleSettingsDTO,
} from "@/lib/dashboard-module-config";

const LABELS: Record<DashboardModuleId, string> = {
  weeklyEvents:
    "Eventos de la semana (calendario, preinscripción; enlace «Mis torneos» para el resumen)",
  mail: "Correo (últimos correos y registro)",
  storePoints: "Crédito de tienda (puntos)",
};

function moveOrder(
  order: DashboardModuleId[],
  index: number,
  dir: -1 | 1,
): DashboardModuleId[] {
  const j = index + dir;
  if (j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

function DashboardModulesEditor({
  initial,
}: {
  initial: DashboardModuleSettingsDTO;
}) {
  const update = useUpdateDashboardModuleSettings();
  const [visibility, setVisibility] = useState(initial.visibility);
  const [order, setOrder] = useState<DashboardModuleId[]>(initial.order);

  const dirty = useMemo(
    () =>
      JSON.stringify(visibility) !== JSON.stringify(initial.visibility) ||
      JSON.stringify(order) !== JSON.stringify(initial.order),
    [initial, visibility, order],
  );

  const handleSave = () => {
    const payload: DashboardModuleSettingsDTO = { visibility, order };
    update.mutate(payload);
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: "1px solid",
        borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08),
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 800, letterSpacing: "0.12em" }}
        >
          Visibilidad
        </Typography>
        <Stack sx={{ mt: 1.5, mb: 3 }} spacing={0.5}>
          <FormControlLabel
            control={
              <Checkbox
                checked={visibility.weeklyEvents}
                onChange={(e) =>
                  setVisibility((v) => ({
                    ...v,
                    weeklyEvents: e.target.checked,
                  }))
                }
              />
            }
            label={LABELS.weeklyEvents}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={visibility.mail}
                onChange={(e) =>
                  setVisibility((v) => ({ ...v, mail: e.target.checked }))
                }
              />
            }
            label={LABELS.mail}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={visibility.storePoints}
                onChange={(e) =>
                  setVisibility((v) => ({
                    ...v,
                    storePoints: e.target.checked,
                  }))
                }
              />
            }
            label={LABELS.storePoints}
          />
        </Stack>

        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontWeight: 800, letterSpacing: "0.12em" }}
        >
          Orden en la página
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
          El primero de la lista queda arriba del todo en el dashboard.
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.1),
          }}
        >
          <Stack divider={<Divider flexItem />}>
            {order.map((id, index) => (
              <Stack
                key={id}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: (t: Theme) => alpha(t.palette.text.primary, 0.02),
                }}
              >
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                  {LABELS[id]}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Subir"
                  disabled={index === 0}
                  onClick={() => setOrder((o) => moveOrder(o, index, -1))}
                >
                  <ArrowUpward fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Bajar"
                  disabled={index === order.length - 1}
                  onClick={() => setOrder((o) => moveOrder(o, index, 1))}
                >
                  <ArrowDownward fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Paper>

        {update.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {update.error instanceof Error
              ? update.error.message
              : "Error al guardar"}
          </Alert>
        ) : null}

        <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => {
              setVisibility(initial.visibility);
              setOrder(initial.order);
            }}
            disabled={!dirty || update.isPending}
          >
            Deshacer
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSave()}
            disabled={!dirty || update.isPending}
            sx={{ fontWeight: 700, minWidth: 120 }}
          >
            {update.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardModulesPage() {
  const { data, dataUpdatedAt, isPending, isError, error, refetch } =
    useAdminDashboardModuleSettings();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        py: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Stack
          spacing={2.5}
          sx={{
            mb: 3,
            p: { xs: 2, sm: 2.5 },
            borderRadius: { xs: 3, sm: 4 },
            border: "1px solid",
            borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.08),
            bgcolor: "background.paper",
            boxShadow: "0 20px 40px -24px rgba(24, 24, 27, 0.12)",
          }}
        >
          <Button
            component={NextLink}
            href="/admin/users"
            variant="outlined"
            size="small"
            sx={{
              alignSelf: "flex-start",
              borderColor: (t: Theme) => alpha(t.palette.text.primary, 0.18),
            }}
          >
            Volver al admin
          </Button>
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}
            >
              Panel de inicio (usuarios)
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 560, lineHeight: 1.6 }}
            >
              Define qué bloques ven los jugadores en{" "}
              <Link href="/dashboard" component={NextLink} fontWeight={600}>
                /dashboard
              </Link>{" "}
              y en qué orden aparecen. Los enlaces del menú lateral ocultan Eventos y
              Correo si están desactivados.
            </Typography>
          </Box>
        </Stack>

        {isPending ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Reintentar
              </Button>
            }
          >
            {error instanceof Error ? error.message : "Error al cargar"}
          </Alert>
        ) : data ? (
          <DashboardModulesEditor
            key={dataUpdatedAt}
            initial={mergeDashboardSettings(data)}
          />
        ) : (
          <DashboardModulesEditor
            key="defaults"
            initial={mergeDashboardSettings(null)}
          />
        )}
      </Container>
    </Box>
  );
}
