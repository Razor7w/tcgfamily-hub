"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import {
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  Help as HelpIcon,
} from "@mui/icons-material";
import { Grid } from "@mui/material";
import CardModule from "@/components/molecule/CardModule";
import PokemonSpriteExamples from "@/components/PokemonSprite.example";

interface Module {
  id: string;
  name: string;
  icon: React.ReactNode;
  route?: string;
}

const modules: Module[] = [
  { id: "1", name: "Admin", icon: <DashboardIcon />, route: "/Admin" },
  { id: "2", name: "Correo", icon: <EmailIcon />, route: "/Dashboard/Mail" },
  { id: "3", name: "Pronto", icon: <HelpIcon /> },
  { id: "4", name: "Pronto", icon: <HelpIcon /> },
  { id: "5", name: "Pronto", icon: <HelpIcon /> },
  { id: "6", name: "Pronto", icon: <HelpIcon /> },
  { id: "7", name: "Pronto", icon: <HelpIcon /> },
  { id: "8", name: "Pronto", icon: <HelpIcon /> },
  { id: "9", name: "Pronto", icon: <HelpIcon /> },
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
              <CardModule module={module} />
            </Grid>
          ))}
        </Grid>
        <PokemonSpriteExamples />
      </Container>
    </Box>
  );
}
