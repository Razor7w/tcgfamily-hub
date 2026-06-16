import connectDB from '@/lib/mongodb'
import OnlineTableMatchReport from '@/models/OnlineTableMatchReport'
import WeeklyEvent from '@/models/WeeklyEvent'
import { popidForStorage } from '@/lib/rut-chile'
import { recomputeOnlineParticipantRecords } from '@/lib/online-tournament-records'

async function main() {
  const id = process.argv[2]?.trim()
  if (!id) {
    console.error(
      'Usage: npx tsx --env-file=.env.local app/scripts/inspect-event-byes.ts <eventId>'
    )
    process.exit(1)
  }

  await connectDB()
  const ev = await WeeklyEvent.findById(id)
  if (!ev) {
    console.error('Event not found')
    process.exit(1)
  }

  console.log('state', ev.state, 'roundNum', ev.roundNum)
  console.log('\n--- Byes in snapshots ---')
  for (const s of ev.roundSnapshots ?? []) {
    for (const row of s.pairings ?? []) {
      const isBye = Boolean(row.isBye) || !String(row.player2PopId ?? '').trim()
      if (!isBye) continue
      const p1 = popidForStorage(row.player1PopId ?? '')
      console.log(
        `R${s.roundNum} mesa ${row.tableNumber}: ${p1} raw=${JSON.stringify(row.player1PopId)} isBye=${row.isBye}`
      )
    }
  }

  console.log('\n--- Participants (stored) ---')
  const parts = ev.participants as {
    popId?: string
    displayName?: string
    wins?: number
    losses?: number
    ties?: number
  }[]
  for (const p of parts) {
    const pop = popidForStorage(p.popId ?? '')
    console.log(
      ` ${pop} ${p.displayName} W/L/T ${p.wins}/${p.losses}/${p.ties}`
    )
  }

  const reps = await OnlineTableMatchReport.find({
    eventId: ev._id,
    status: 'verified'
  }).lean()
  console.log('\n--- Verified reports', reps.length, '---')
  for (const r of reps) {
    console.log(
      ` R${r.roundNum} T${r.tableNumber}: ${r.player1PopId} vs ${r.player2PopId} → ${r.winnerPopId}`
    )
  }

  const simParts = JSON.parse(JSON.stringify(parts)) as typeof parts
  await recomputeOnlineParticipantRecords({
    eventId: ev._id,
    participants: simParts,
    roundSnapshots: JSON.parse(JSON.stringify(ev.roundSnapshots ?? []))
  })
  console.log('\n--- After recompute (simulated) ---')
  for (const p of simParts) {
    const pop = popidForStorage(p.popId ?? '')
    const stored = parts.find(x => popidForStorage(x.popId ?? '') === pop)
    const match = stored?.wins === p.wins && stored?.losses === p.losses
    console.log(
      ` ${pop} W/L/T ${p.wins}/${p.losses}/${p.ties}${match ? '' : '  ← DIFF from DB'}`
    )
  }

  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
