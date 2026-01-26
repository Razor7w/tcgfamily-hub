"use client";

import PokemonSprite from "./PokemonSprite";
import { Box, Stack, Typography } from "@mui/material";

/**
 * Ejemplo de uso del componente PokemonSprite
 * 
 * Este archivo muestra diferentes formas de usar el componente
 * para mostrar sprites de Pokémon.
 */
export default function PokemonSpriteExamples() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Ejemplos de Sprites de Pokémon
      </Typography>
      
      <Stack spacing={4} sx={{ mt: 4 }}>
        {/* Ejemplo básico */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Sprites Básicos
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
            <PokemonSprite nameOrIndex="pikachu" />
            <PokemonSprite nameOrIndex="charizard" />
            <PokemonSprite nameOrIndex="bulbasaur" />
            <PokemonSprite nameOrIndex="squirtle" />
          </Stack>
        </Box>
        
        {/* Ejemplo con shiny */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Sprites Shiny
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
            <PokemonSprite nameOrIndex="pikachu" form="shiny" />
            <PokemonSprite nameOrIndex="charizard" form="shiny" />
            <PokemonSprite nameOrIndex="gyarados" form="shiny" />
          </Stack>
        </Box>
        
        {/* Ejemplo con variantes */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Variantes (Mega, Gmax, etc.)
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
            <PokemonSprite nameOrIndex="charizard" variant="mega-x" />
            <PokemonSprite nameOrIndex="charizard" variant="mega-y" />
            <PokemonSprite nameOrIndex="pikachu" variant="gmax" />
            <PokemonSprite nameOrIndex="venusaur" variant="gmax" />
          </Stack>
        </Box>
        
        {/* Ejemplo con diferentes tamaños */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Diferentes Tamaños
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="caption" display="block" gutterBottom>
                34x28 (medio)
              </Typography>
              <PokemonSprite nameOrIndex="pikachu" size={34} />
            </Box>
            <Box>
              <Typography variant="caption" display="block" gutterBottom>
                68x56 (estándar)
              </Typography>
              <PokemonSprite nameOrIndex="pikachu" size={68} />
            </Box>
            <Box>
              <Typography variant="caption" display="block" gutterBottom>
                136x112 (grande)
              </Typography>
              <PokemonSprite nameOrIndex="pikachu" size={136} />
            </Box>
          </Stack>
        </Box>
        
        {/* Ejemplo con Gen 7 */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Generación 7
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
            <PokemonSprite nameOrIndex="pikachu" generation="gen-7" />
            <PokemonSprite nameOrIndex="charizard" generation="gen-7" />
          </Stack>
        </Box>
        
        {/* Ejemplo usando índices */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Usando Índices (001, 025, etc.)
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
            <PokemonSprite nameOrIndex="001" />
            <PokemonSprite nameOrIndex="025" />
            <PokemonSprite nameOrIndex="150" />
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
