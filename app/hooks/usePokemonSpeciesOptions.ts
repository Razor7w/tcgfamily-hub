'use client'

import { createFilterOptions } from '@mui/material/Autocomplete'
import { useQuery } from '@tanstack/react-query'

export type PokemonSpeciesOption = {
  slug: string
  label: string
}

const pokemonAutocompleteFilter = createFilterOptions<PokemonSpeciesOption>({
  stringify: o => `${o.label} ${o.slug}`
})

/** Menú abierto sin texto: no se muestran filas hasta que el usuario escribe. */
export const POKEMON_AUTOCOMPLETE_HINT_EMPTY =
  'Empieza a escribir el nombre de un Pokémon…'

export const POKEMON_AUTOCOMPLETE_NO_MATCH = 'No hay coincidencias'

/**
 * Misma lógica que `createFilterOptions` del combo, pero sin resultados hasta que
 * `inputValue` tenga al menos un carácter (tras trim).
 */
export function filterPokemonAutocompleteOptions(
  options: PokemonSpeciesOption[],
  params: Parameters<typeof pokemonAutocompleteFilter>[1]
) {
  if (!params.inputValue.trim()) return []
  return pokemonAutocompleteFilter(options, params)
}

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Slugs PokéAPI de mega evoluciones: termina en `-mega`, `-mega-x` o `-mega-y`. */
const MEGA_FORM_SLUG = /-mega(-[xy])?$/

function isMegaFormSlug(slug: string): boolean {
  return MEGA_FORM_SLUG.test(slug)
}

/**
 * Formas alternativas que no deben aparecer (Gigantamax, primales, regionales Alola/Galar).
 * Megas no se filtran aquí: van por `isMegaFormSlug`.
 */
function isExcludedAlternateFormSlug(slug: string): boolean {
  if (slug.includes('-gmax')) return true
  if (slug.includes('-primal')) return true
  if (slug.includes('-alola')) return true
  if (slug.includes('-galar')) return true
  return false
}

function shouldIncludePokemonSlug(slug: string): boolean {
  if (isMegaFormSlug(slug)) return true
  if (isExcludedAlternateFormSlug(slug)) return false
  return true
}

/**
 * Entradas `pokemon` en PokéAPI: **formas base + megas**, excluyendo Gmax, primales y
 * variantes regionales Alola/Galar en el slug. Otras variantes (p. ej.
 * Deoxys, Pikachu disfraz) siguen en la lista si no coinciden con esos patrones.
 * Sigue haciendo falta pedir el índice completo: la API no ofrece un filtro equivalente.
 */
async function fetchBaseAndMegaForms(): Promise<PokemonSpeciesOption[]> {
  const first = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1')
  if (!first.ok) throw new Error('No se pudo cargar la lista de Pokémon')
  const meta = (await first.json()) as { count: number }
  const res = await fetch(
    `https://pokeapi.co/api/v2/pokemon?limit=${meta.count}`
  )
  if (!res.ok) throw new Error('No se pudo cargar la lista de Pokémon')
  const data = (await res.json()) as {
    results: { name: string }[]
  }
  const rows = data.results
    .filter(r => shouldIncludePokemonSlug(r.name))
    .map(r => ({
      slug: r.name,
      label: slugToLabel(r.name)
    }))
  rows.sort((a, b) => a.label.localeCompare(b.label, 'es'))
  return rows
}

/**
 * Formas base + megas (PokéAPI) para autocompletar; cache larga en cliente.
 */
export function usePokemonSpeciesOptions() {
  return useQuery({
    queryKey: ['pokemon-base-and-mega-forms'],
    queryFn: fetchBaseAndMegaForms,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7
  })
}
