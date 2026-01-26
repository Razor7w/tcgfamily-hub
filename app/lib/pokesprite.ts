import pokemonData from "pokesprite-images/data/pokemon.json";

export type PokemonGeneration = "gen-7" | "gen-8";
export type PokemonForm = "regular" | "shiny";
export type PokemonVariant =
  | "regular"
  | "mega"
  | "gmax"
  | "alola"
  | "galar"
  | "hisui"
  | string;

interface Gen7Data {
  forms?: Record<
    string,
    {
      has_female?: boolean;
      has_right?: boolean;
    }
  >;
}

interface Gen8Data {
  forms?: Record<
    string,
    {
      is_prev_gen_icon?: boolean;
    }
  >;
}

export interface PokemonData {
  idx: string;
  name: {
    eng: string;
    chs?: string;
    jpn?: string;
    jpn_ro?: string;
  };
  slug: {
    eng: string;
    jpn?: string;
    jpn_ro?: string;
  };
  "gen-7"?: Gen7Data | Record<string, unknown>;
  "gen-8"?: Gen8Data | Record<string, unknown>;
}

type PokemonDatabase = Record<string, PokemonData>;

/**
 * Obtiene los datos de un Pokémon por su nombre o índice
 */
export function getPokemonData(nameOrIndex: string): PokemonData | null {
  const database = pokemonData as unknown as PokemonDatabase;

  // Buscar por índice (ej: "001", "025")
  if (database[nameOrIndex]) {
    return database[nameOrIndex];
  }

  // Buscar por nombre (case-insensitive)
  const searchName = nameOrIndex.toLowerCase();
  for (const pokemon of Object.values(database)) {
    if (
      pokemon.slug.eng.toLowerCase() === searchName ||
      pokemon.name.eng.toLowerCase() === searchName ||
      pokemon.idx === nameOrIndex
    ) {
      return pokemon;
    }
  }

  return null;
}

/**
 * Obtiene el slug del Pokémon para usar en la ruta del sprite
 */
export function getPokemonSlug(nameOrIndex: string): string | null {
  const pokemon = getPokemonData(nameOrIndex);
  return pokemon?.slug.eng || null;
}

/**
 * Construye la ruta del sprite de un Pokémon
 * @param nameOrIndex - Nombre o índice del Pokémon (ej: "bulbasaur", "001", "pikachu")
 * @param options - Opciones para el sprite
 * @returns Ruta del sprite o null si no se encuentra
 */
export function getPokemonSpritePath(
  nameOrIndex: string,
  options: {
    generation?: PokemonGeneration;
    form?: PokemonForm;
    variant?: PokemonVariant;
  } = {},
): string | null {
  const {
    generation = "gen-8",
    form = "regular",
    variant = "regular",
  } = options;

  const pokemon = getPokemonData(nameOrIndex);
  if (!pokemon) {
    return null;
  }

  const slug = pokemon.slug.eng;
  const genFolder = generation === "gen-8" ? "gen8" : "gen7x";
  const formPath = form === "shiny" ? "shiny" : "regular";

  // Construir el nombre del archivo
  let filename = slug;

  // Agregar variante si no es regular
  // El símbolo "$" en los datos representa la forma regular
  if (variant !== "regular" && variant !== "$") {
    filename = `${slug}-${variant}`;
  }

  filename = `${filename}.png`;

  // Servir sprites desde public/pokesprite (copiados por scripts/copy-pokesprite.mjs)
  // Formato: /pokesprite/gen8/regular/pikachu.png
  return `/pokesprite/${genFolder}/${formPath}/${filename}`;
}

/**
 * Verifica si un objeto tiene la propiedad 'forms'
 */
function hasFormsProperty(
  obj: unknown,
): obj is { forms: Record<string, unknown> } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "forms" in obj &&
    typeof (obj as { forms: unknown }).forms === "object" &&
    (obj as { forms: unknown }).forms !== null
  );
}

/**
 * Obtiene todas las formas disponibles de un Pokémon
 */
export function getPokemonForms(
  nameOrIndex: string,
  generation: PokemonGeneration = "gen-8",
): string[] {
  const pokemon = getPokemonData(nameOrIndex);
  if (!pokemon) {
    return [];
  }

  const genData = pokemon[generation];
  if (!genData || !hasFormsProperty(genData)) {
    return ["regular"];
  }

  return Object.keys(genData.forms);
}

/**
 * Lista todos los Pokémon disponibles
 */
export function getAllPokemon(): PokemonData[] {
  return Object.values(pokemonData as unknown as PokemonDatabase);
}

/**
 * Busca Pokémon por nombre (búsqueda parcial)
 */
export function searchPokemon(query: string): PokemonData[] {
  const searchTerm = query.toLowerCase();
  const database = pokemonData as unknown as PokemonDatabase;

  return Object.values(database).filter((pokemon) => {
    const name = pokemon.name.eng.toLowerCase();
    const slug = pokemon.slug.eng.toLowerCase();
    return name.includes(searchTerm) || slug.includes(searchTerm);
  });
}
