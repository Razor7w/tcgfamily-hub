"use client";

import { useQuery } from "@tanstack/react-query";

export type PokemonSpeciesOption = {
  slug: string;
  label: string;
};

function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Lista completa de entradas `pokemon` en PokéAPI (incluye formas: mega, Gmax, regionales, etc.).
 * `pokemon-species` solo trae una fila por especie y omite Megas y otras formas con slug propio.
 */
async function fetchAllSpecies(): Promise<PokemonSpeciesOption[]> {
  const first = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1");
  if (!first.ok) throw new Error("No se pudo cargar la lista de Pokémon");
  const meta = (await first.json()) as { count: number };
  const res = await fetch(
    `https://pokeapi.co/api/v2/pokemon?limit=${meta.count}`,
  );
  if (!res.ok) throw new Error("No se pudo cargar la lista de Pokémon");
  const data = (await res.json()) as {
    results: { name: string }[];
  };
  return data.results.map((r) => ({
    slug: r.name,
    label: slugToLabel(r.name),
  }));
}

/**
 * Lista completa de formas PokéAPI (`/pokemon`) para autocompletar; incluye mega evoluciones y
 * otras formas con nombre propio; cache larga en cliente.
 */
export function usePokemonSpeciesOptions() {
  return useQuery({
    queryKey: ["pokemon-forms-all"],
    queryFn: fetchAllSpecies,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}
