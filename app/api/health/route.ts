// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import mongoose from 'mongoose'
import { createSlidingWindowLimiter } from '@/lib/auth-rate-limit'

const healthIpLimiter = createSlidingWindowLimiter({
  max: 120,
  windowMs: 60 * 1000
})

function clientIp(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function GET(request: NextRequest) {
  try {
    const ip = clientIp(request)
    if (healthIpLimiter(`health:${ip}`)) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Prueba más tarde.' },
        { status: 429 }
      )
    }

    await connectDB()

    const connectionState = mongoose.connection.readyState
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }

    const isConnected = connectionState === 1

    return NextResponse.json(
      {
        status: isConnected ? 'healthy' : 'unhealthy',
        database: {
          state: states[connectionState as keyof typeof states],
          name: mongoose.connection.db?.databaseName || 'unknown',
          host: mongoose.connection.host || 'unknown',
          port: mongoose.connection.port || 'unknown'
        },
        timestamp: new Date().toISOString()
      },
      {
        status: isConnected ? 200 : 503
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      {
        status: 500
      }
    )
  }
}
