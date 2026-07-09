/**
 * Recalcula W/L (reportes + bye) y, si el torneo está cerrado, regenera standings.
 *
 * npx tsx --env-file=.env.local app/scripts/repair-online-tournament-records.ts <eventId>
 */
import connectDB from '@/lib/mongodb'
import { buildOnlineTournamentStandings } from '@/lib/build-online-tournament-standings'
import { syncOnlineParticipantRecords } from '@/lib/online-tournament-records'
import { eventSupportsMatchChat } from '@/lib/tournament-mode'
import WeeklyEvent from '@/models/WeeklyEvent'

async function main() {
  const eventId = process.argv[2]?.trim()
  if (!eventId) {
    console.error(
      'Usage: npx tsx --env-file=.env.local app/scripts/repair-online-tournament-records.ts <eventId>'
    )
    process.exit(1)
  }

  await connectDB()
  const doc = await WeeklyEvent.findById(eventId)
  if (!doc) {
    console.error('Evento no encontrado')
    process.exit(1)
  }
  if (!eventSupportsMatchChat(doc.tournamentMode)) {
    console.error('Solo torneos online')
    process.exit(1)
  }

  const before = doc.participants.map(p => ({
    popId: p.popId,
    w: p.wins,
    l: p.losses
  }))

  await syncOnlineParticipantRecords({
    eventId: doc._id,
    doc
  })

  if (doc.state === 'close') {
    const standings = await buildOnlineTournamentStandings({
      eventId: doc._id,
      participants: doc.participants,
      roundSnapshots: doc.roundSnapshots ?? []
    })
    doc.tournamentStandings = standings as typeof doc.tournamentStandings
    doc.markModified('tournamentStandings')
  }

  await doc.save()

  console.log('Récords actualizados:')
  for (const p of doc.participants) {
    const prev = before.find(b => b.popId === p.popId)
    const changed =
      prev && (prev.w !== p.wins || prev.l !== p.losses) ? ' ← cambió' : ''
    console.log(` ${p.popId}: ${p.wins}-${p.losses}-${p.ties ?? 0}${changed}`)
  }
  if (doc.state === 'close') {
    console.log('Standings regenerados para torneo cerrado.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
