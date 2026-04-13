import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * API route para servir sprites de Pokémon desde pokesprite-images
 *
 * Ruta: /api/pokesprite/gen8/regular/pikachu.png
 *       /api/pokesprite/gen8/shiny/charizard-mega.png
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params
    const filePath = pathArray.join('/')

    // El path puede ser: gen8/regular/pikachu.png o gen7x/shiny/charizard.png
    const pathParts = filePath.split('/')
    const genFolder = pathParts[0] // gen8 o gen7x
    const restOfPath = pathParts.slice(1).join('/')

    // Mapear gen8 -> pokemon-gen8, gen7x -> pokemon-gen7x
    const pokemonGenFolder =
      genFolder === 'gen7x' ? 'pokemon-gen7x' : 'pokemon-gen8'

    const fullPath = join(
      process.cwd(),
      'node_modules',
      'pokesprite-images',
      pokemonGenFolder,
      restOfPath
    )

    // Validar que la ruta esté dentro de node_modules/pokesprite-images
    const normalizedPath = fullPath.replace(/\\/g, '/')
    if (!normalizedPath.includes('pokesprite-images')) {
      console.error('Invalid path detected:', normalizedPath)
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Log para debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Serving sprite:', {
        filePath,
        genFolder,
        restOfPath,
        pokemonGenFolder,
        fullPath: normalizedPath
      })
    }

    // Leer el archivo
    const fileBuffer = await readFile(fullPath)

    // Determinar el content type
    const contentType = restOfPath.endsWith('.png')
      ? 'image/png'
      : restOfPath.endsWith('.jpg') || restOfPath.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'application/octet-stream'

    // Retornar la imagen
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    const { path: pathArray } = await params
    const filePath = pathArray.join('/')
    console.error('Error serving pokesprite:', {
      error: errorMessage,
      path: filePath,
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Sprite not found', details: errorMessage },
      { status: 404 }
    )
  }
}
