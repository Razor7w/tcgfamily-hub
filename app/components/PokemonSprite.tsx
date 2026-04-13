"use client";

import {
  getPokemonSpritePath,
  getPokemonData,
  type PokemonGeneration,
  type PokemonForm,
  type PokemonVariant,
} from "@/lib/pokesprite";
import { Box, Skeleton } from "@mui/material";
import { useState } from "react";
import Image from "next/image";

interface PokemonSpriteProps {
  /** Nombre o índice del Pokémon (ej: "bulbasaur", "001", "pikachu") */
  nameOrIndex: string;
  /** Generación de sprites a usar */
  generation?: PokemonGeneration;
  /** Forma del sprite (regular o shiny) */
  form?: PokemonForm;
  /** Variante del Pokémon (regular, mega, gmax, etc.) */
  variant?: PokemonVariant;
  /** Ancho del sprite en píxeles */
  width?: number;
  /** Alto del sprite en píxeles */
  height?: number;
  /** Tamaño del sprite (68x56 es el tamaño estándar de Gen 8) */
  size?: number;
  /** Clase CSS adicional */
  className?: string;
  /** Estilos adicionales */
  sx?: object;
  /** Mostrar nombre del Pokémon como alt text */
  showName?: boolean;
}

/**
 * Componente para mostrar sprites de Pokémon usando pokesprite-images
 *
 * @example
 * ```tsx
 * <PokemonSprite nameOrIndex="pikachu" />
 * <PokemonSprite nameOrIndex="025" form="shiny" variant="gmax" />
 * <PokemonSprite nameOrIndex="charizard" generation="gen-7" size={68} />
 * ```
 */
export default function PokemonSprite({
  nameOrIndex,
  generation = "gen-8",
  form = "regular",
  variant = "regular",
  width,
  height,
  size,
  className,
  sx,
  showName = true,
}: PokemonSpriteProps) {
  const spritePath = getPokemonSpritePath(nameOrIndex, {
    generation,
    form,
    variant,
  });
  const pokemonData = getPokemonData(nameOrIndex);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Si no se encuentra el sprite, mostrar un placeholder
  if (!spritePath) {
    return (
      <Box
        sx={{
          width: width || size || 68,
          height: height || size || 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.200",
          borderRadius: 1,
          ...sx,
        }}
        className={className}
      >
        <Box sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
          {pokemonData?.name.eng || "?"}
        </Box>
      </Box>
    );
  }

  // Si hay error, mostrar placeholder con información de debug
  if (hasError) {
    if (process.env.NODE_ENV === "development") {
      console.warn("PokemonSprite error for:", spritePath);
    }
    return (
      <Box
        sx={{
          width: width || size || 68,
          height: height || size || 56,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "error.light",
          borderRadius: 1,
          p: 0.5,
          ...sx,
        }}
        className={className}
        title={`Error loading: ${spritePath}`}
      >
        <Box
          sx={{ fontSize: "0.6rem", color: "error.main", textAlign: "center" }}
        >
          {pokemonData?.name.eng || "?"}
        </Box>
        {process.env.NODE_ENV === "development" && (
          <Box sx={{ fontSize: "0.5rem", color: "error.dark", mt: 0.5 }}>
            Error
          </Box>
        )}
      </Box>
    );
  }

  const finalWidth = width || size || 68;
  const finalHeight = height || size || 56;
  const altText =
    showName && pokemonData
      ? `${pokemonData.name.eng}${form === "shiny" ? " (Shiny)" : ""}${variant !== "regular" ? ` (${variant})` : ""}`
      : "Pokémon sprite";

  return (
    <Box
      sx={{
        position: "relative",
        width: finalWidth,
        height: finalHeight,
        display: "inline-block",
        ...sx,
      }}
      className={className}
    >
      {isLoading && (
        <Skeleton
          variant="rectangular"
          width={finalWidth}
          height={finalHeight}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 1,
          }}
        />
      )}
      <Image
        src={spritePath}
        alt={altText}
        width={finalWidth}
        height={finalHeight}
        style={{
          objectFit: "contain",
          display: "block",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.2s",
          position: "relative",
          zIndex: 2,
        }}
        onLoad={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onError={() => {
          console.error("Error loading sprite:", spritePath);
          setIsLoading(false);
          setHasError(true);
        }}
        unoptimized
      />
    </Box>
  );
}
