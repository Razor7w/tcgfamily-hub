import 'server-only'

import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { r2BucketName, r2Client } from '@/lib/r2'
import { teamBrandingKeyForTeam } from '@/lib/teams/branding'
import { teamPostMediaKeyForTeam } from '@/lib/teams/post-media'
import TeamPost from '@/models/TeamPost'

export async function deleteR2ObjectBestEffort(key: string): Promise<void> {
  const trimmed = key.trim()
  if (!trimmed) return
  try {
    await r2Client().send(
      new DeleteObjectCommand({
        Bucket: r2BucketName(),
        Key: trimmed
      })
    )
  } catch (e) {
    console.warn('R2 delete failed:', trimmed, e)
  }
}

export async function deleteR2ObjectsBestEffort(keys: string[]): Promise<void> {
  const unique = [...new Set(keys.map(k => k.trim()).filter(Boolean))]
  await Promise.all(unique.map(deleteR2ObjectBestEffort))
}

export async function deleteTeamPostCoverIfOwned(
  teamId: string,
  coverKey: string | null | undefined
): Promise<void> {
  const key = typeof coverKey === 'string' ? coverKey.trim() : ''
  if (!key || !teamPostMediaKeyForTeam(teamId, key)) return
  await deleteR2ObjectBestEffort(key)
}

export async function deleteTeamBrandingIfOwned(
  teamId: string,
  logoKey: string | null | undefined,
  coverKey: string | null | undefined
): Promise<void> {
  const keys: string[] = []
  const logo = typeof logoKey === 'string' ? logoKey.trim() : ''
  const cover = typeof coverKey === 'string' ? coverKey.trim() : ''
  if (logo && teamBrandingKeyForTeam(teamId, logo)) keys.push(logo)
  if (cover && teamBrandingKeyForTeam(teamId, cover)) keys.push(cover)
  await deleteR2ObjectsBestEffort(keys)
}

/** Logo, portada del equipo y portadas de todos sus posts en R2. */
export async function deleteAllTeamR2Media(
  teamId: mongoose.Types.ObjectId,
  branding: { logoKey?: string | null; coverKey?: string | null }
): Promise<void> {
  const teamIdStr = teamId.toString()
  await connectDB()

  const posts = await TeamPost.find({ teamId })
    .select('coverKey')
    .lean<{ coverKey?: string }[]>()

  const postCoverKeys = posts
    .map(p => (typeof p.coverKey === 'string' ? p.coverKey.trim() : ''))
    .filter(key => key && teamPostMediaKeyForTeam(teamIdStr, key))

  await deleteTeamBrandingIfOwned(
    teamIdStr,
    branding.logoKey,
    branding.coverKey
  )
  await deleteR2ObjectsBestEffort(postCoverKeys)
}
