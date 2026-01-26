"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

export default function ThemeToggle() {
  const { mode, toggleTheme } = useTheme();
  // Inicializar como true solo en el cliente, false en el servidor
  const [mounted] = useState(() => typeof window !== "undefined");

  if (!mounted) {
    // Retornar un placeholder con las mismas dimensiones para evitar layout shift
    return (
      <IconButton
        disabled
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1000,
          visibility: "hidden",
        }}
      >
        <Brightness4Icon />
      </IconButton>
    );
  }

  return (
    <Tooltip
      title={mode === "light" ? "Activar modo oscuro" : "Activar modo claro"}
    >
      <IconButton
        onClick={toggleTheme}
        color="inherit"
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        {mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
      </IconButton>
    </Tooltip>
  );
}
