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

async function fetchAllSpecies(): Promise<PokemonSpeciesOption[]> {
  const first = await fetch("https://pokeapi.co/api/v2/pokemon-species?limit=1");
  if (!first.ok) throw new Error("No se pudo cargar la lista de Pokémon");
  const meta = (await first.json()) as { count: number };
  const res = await fetch(
    `https://pokeapi.co/api/v2/pokemon-species?limit=${meta.count}`,
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
 * Lista completa de especies (PokéAPI) para autocompletar; cache larga en cliente.
 */
export function usePokemonSpeciesOptions() {
  return useQuery({
    queryKey: ["pokemon-species-all"],
    queryFn: fetchAllSpecies,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });
}
