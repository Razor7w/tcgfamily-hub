"use client";

import Link from "next/link";
import { ArrowBack, TableChart } from "@mui/icons-material";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import TournamentTdfLoader from "@/components/admin/TournamentTdfLoader";

export default function AdminTorneoXmlPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={2.5} sx={{ mb: 3 }}>
          <Button
            component={Link}
            href="/admin/users"
            variant="outlined"
            size="small"
            startIcon={<ArrowBack />}
            sx={{ alignSelf: "flex-start" }}
          >
            Volver
          </Button>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <TableChart color="primary" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Torneo (XML)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Carga un archivo <strong>.tdf</strong> o pega el XML para ver jugadores (POP userid) y
                emparejamientos por ronda.
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <TournamentTdfLoader showIntro={false} />
      </Container>
    </Box>
  );
}
