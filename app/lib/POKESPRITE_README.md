# Uso de PokéSprite en Mail Cards

Este proyecto integra [pokesprite-images](https://github.com/msikma/pokesprite) para mostrar sprites de Pokémon.

## Instalación

El paquete `pokesprite-images` ya está instalado en el proyecto.

## Componentes y Utilidades

### 1. Componente `PokemonSprite`

Componente React para mostrar sprites de Pokémon.

```tsx
import PokemonSprite from "@/components/PokemonSprite";

// Uso básico
<PokemonSprite nameOrIndex="pikachu" />

// Con shiny
<PokemonSprite nameOrIndex="charizard" form="shiny" />

// Con variante (mega, gmax, etc.)
<PokemonSprite nameOrIndex="charizard" variant="mega-x" />

// Con tamaño personalizado
<PokemonSprite nameOrIndex="pikachu" size={136} />

// Usando índice en lugar de nombre
<PokemonSprite nameOrIndex="025" /> // Pikachu
```

#### Props

- `nameOrIndex` (string, requerido): Nombre o índice del Pokémon (ej: "pikachu", "025")
- `generation` ("gen-7" | "gen-8"): Generación de sprites (default: "gen-8")
- `form` ("regular" | "shiny"): Forma del sprite (default: "regular")
- `variant` (string): Variante del Pokémon (default: "regular")
  - Ejemplos: "mega", "mega-x", "mega-y", "gmax", "alola", "galar", "hisui"
- `width` (number): Ancho del sprite en píxeles
- `height` (number): Alto del sprite en píxeles
- `size` (number): Tamaño del sprite (68x56 es el estándar de Gen 8)
- `className` (string): Clase CSS adicional
- `sx` (object): Estilos adicionales de MUI
- `showName` (boolean): Mostrar nombre del Pokémon como alt text (default: true)

### 2. Utilidades en `@/lib/pokesprite`

#### `getPokemonData(nameOrIndex: string): PokemonData | null`

Obtiene los datos completos de un Pokémon.

```tsx
import { getPokemonData } from "@/lib/pokesprite";

const pikachu = getPokemonData("pikachu");
console.log(pikachu?.name.eng); // "Pikachu"
console.log(pikachu?.idx); // "025"
```

#### `getPokemonSpritePath(nameOrIndex, options): string | null`

Obtiene la ruta del sprite de un Pokémon.

```tsx
import { getPokemonSpritePath } from "@/lib/pokesprite";

const path = getPokemonSpritePath("pikachu", {
  generation: "gen-8",
  form: "shiny",
  variant: "regular"
});
// Retorna: "/api/pokesprite/gen8/shiny/pikachu.png"
```

#### `getPokemonForms(nameOrIndex, generation): string[]`

Obtiene todas las formas disponibles de un Pokémon.

```tsx
import { getPokemonForms } from "@/lib/pokesprite";

const forms = getPokemonForms("charizard", "gen-8");
// Retorna: ["regular", "mega-x", "mega-y", "gmax"]
```

#### `searchPokemon(query: string): PokemonData[]`

Busca Pokémon por nombre (búsqueda parcial).

```tsx
import { searchPokemon } from "@/lib/pokesprite";

const results = searchPokemon("pika");
// Retorna todos los Pokémon que contengan "pika" en su nombre
```

#### `getAllPokemon(): PokemonData[]`

Lista todos los Pokémon disponibles.

```tsx
import { getAllPokemon } from "@/lib/pokesprite";

const allPokemon = getAllPokemon();
// Retorna array con todos los Pokémon
```

## Ejemplos de Uso

### Ejemplo 1: Mostrar un sprite básico

```tsx
import PokemonSprite from "@/components/PokemonSprite";

function MyComponent() {
  return <PokemonSprite nameOrIndex="pikachu" />;
}
```

### Ejemplo 2: Lista de Pokémon con shiny

```tsx
import PokemonSprite from "@/components/PokemonSprite";
import { Stack } from "@mui/material";

function PokemonList() {
  const pokemon = ["pikachu", "charizard", "blastoise", "venusaur"];
  
  return (
    <Stack direction="row" spacing={2}>
      {pokemon.map((name) => (
        <div key={name}>
          <PokemonSprite nameOrIndex={name} />
          <PokemonSprite nameOrIndex={name} form="shiny" />
        </div>
      ))}
    </Stack>
  );
}
```

### Ejemplo 3: Selector de variantes

```tsx
import { useState } from "react";
import PokemonSprite from "@/components/PokemonSprite";
import { Select, MenuItem, FormControl } from "@mui/material";
import { getPokemonForms } from "@/lib/pokesprite";

function VariantSelector() {
  const [variant, setVariant] = useState("regular");
  const forms = getPokemonForms("charizard", "gen-8");
  
  return (
    <div>
      <FormControl>
        <Select value={variant} onChange={(e) => setVariant(e.target.value)}>
          {forms.map((form) => (
            <MenuItem key={form} value={form}>
              {form}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <PokemonSprite 
        nameOrIndex="charizard" 
        variant={variant === "regular" ? "regular" : variant}
      />
    </div>
  );
}
```

### Ejemplo 4: Búsqueda de Pokémon

```tsx
import { useState } from "react";
import PokemonSprite from "@/components/PokemonSprite";
import { TextField, Stack, Box } from "@mui/material";
import { searchPokemon } from "@/lib/pokesprite";

function PokemonSearch() {
  const [query, setQuery] = useState("");
  const results = searchPokemon(query);
  
  return (
    <Box>
      <TextField
        label="Buscar Pokémon"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap" }}>
        {results.slice(0, 10).map((pokemon) => (
          <PokemonSprite
            key={pokemon.idx}
            nameOrIndex={pokemon.idx}
          />
        ))}
      </Stack>
    </Box>
  );
}
```

## API Route

Los sprites se sirven a través de una API route en `/api/pokesprite/[...path]`.

La ruta sigue el formato:
- `/api/pokesprite/gen8/regular/pikachu.png`
- `/api/pokesprite/gen8/shiny/charizard-mega-x.png`
- `/api/pokesprite/gen7x/regular/bulbasaur.png`

Los archivos se leen desde `node_modules/pokesprite-images` y se sirven con cache headers apropiados.

## Notas

- Los sprites de Gen 8 tienen un tamaño estándar de 68×56 píxeles
- Los sprites de Gen 7 tienen un tamaño estándar de 40×30 píxeles (pero se muestran a 68×56)
- El componente maneja automáticamente el loading y errores
- Si un sprite no se encuentra, se muestra un placeholder con el nombre del Pokémon

## Referencias

- [Repositorio de PokéSprite](https://github.com/msikma/pokesprite)
- [Documentación de pokesprite-images](https://www.npmjs.com/package/pokesprite-images)
- [Overview de sprites de Pokémon](https://msikma.github.io/pokesprite/overview/dex-gen8.html)
