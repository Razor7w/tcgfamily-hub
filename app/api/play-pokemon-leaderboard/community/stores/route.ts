import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import connectDB from '@/lib/mongodb'
import { playPokemonLeaderboardEnabled } from '@/lib/play-pokemon-leaderboard/constants'
import { listPlayPokemonCommunityRankingStores } from '@/lib/play-pokemon-leaderboard/build-community-ranking'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!playPokemonLeaderboardEnabled()) {
      return NextResponse.json(
        {
          enabled: false,
          stores: [],
          defaultStoreId: null,
          totalPlayerCount: 0
        },
        { status: 503 }
      )
    }

    const stores = await listPlayPokemonCommunityRankingStores()
    const totalPlayerCount = stores.reduce(
      (sum, store) => sum + store.playerCount,
      0
    )

    let defaultStoreId: string | null = null
    const session = await auth()
    const userId = session?.user?.id
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      await connectDB()
      const user = await User.findById(userId)
        .select('defaultStoreId')
        .lean<{ defaultStoreId?: mongoose.Types.ObjectId | null } | null>()
      const def =
        user?.defaultStoreId != null ? String(user.defaultStoreId) : null
      if (def && stores.some(s => s.id === def)) {
        defaultStoreId = def
      }
    }

    if (!defaultStoreId && stores.length > 0) {
      defaultStoreId = stores[0].id
    }

    return NextResponse.json({
      enabled: true,
      stores,
      defaultStoreId,
      totalPlayerCount
    })
  } catch (error) {
    console.error('GET /api/play-pokemon-leaderboard/community/stores:', error)
    return NextResponse.json(
      { error: 'No se pudieron cargar las tiendas' },
      { status: 500 }
    )
  }
}
