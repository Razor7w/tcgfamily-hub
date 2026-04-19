import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/api-auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

// Función para parsear CSV
function parseCSV(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  // Obtener headers (primera línea)
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

  // Parsear cada línea
  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))

    if (values.length === headers.length) {
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header.toLowerCase()] = values[index] || ''
      })
      rows.push(row)
    }
  }

  return rows
}

// POST - Crear usuarios masivamente desde CSV
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdminSession()
    if (!gate.ok) return gate.response

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    // Verificar que sea un archivo CSV
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'El archivo debe ser un CSV' },
        { status: 400 }
      )
    }

    // Leer el contenido del archivo
    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'El archivo CSV está vacío o no tiene el formato correcto' },
        { status: 400 }
      )
    }

    await connectDB()

    const results = {
      success: 0,
      errors: 0,
      details: [] as Array<{ email: string; status: string; message?: string }>
    }

    // Procesar cada fila
    for (const row of rows) {
      const email = row.email || row['e-mail'] || ''
      const name = row.name || row.nombre || ''
      const role = (row.role || row.rol || 'user').toLowerCase()
      const phone = row.phone || row.telefono || row.teléfono || ''
      const rut = row.rut || ''
      const popid = row.popid || ''

      // Validaciones básicas
      if (!email || !name) {
        results.errors++
        results.details.push({
          email: email || 'Sin email',
          status: 'error',
          message: 'Faltan campos requeridos (email o nombre)'
        })
        continue
      }

      if (role !== 'user' && role !== 'admin') {
        results.errors++
        results.details.push({
          email,
          status: 'error',
          message: "Rol inválido (debe ser 'user' o 'admin')"
        })
        continue
      }

      try {
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email })
        if (existingUser) {
          results.errors++
          results.details.push({
            email,
            status: 'error',
            message: 'El email ya existe'
          })
          continue
        }

        // Crear el usuario
        await User.create({
          name,
          email,
          role: role as 'user' | 'admin',
          phone: phone || '',
          rut: rut || '',
          popid: popid || '',
          accounts: [],
          sessions: []
        })

        results.success++
        results.details.push({
          email,
          status: 'success'
        })
      } catch (error) {
        results.errors++
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido'
        results.details.push({
          email,
          status: 'error',
          message: errorMessage
        })
      }
    }

    return NextResponse.json(results, { status: 200 })
  } catch (error) {
    console.error('Error al procesar CSV:', error)
    return NextResponse.json(
      { error: 'Error al procesar el archivo CSV' },
      { status: 500 }
    )
  }
}
