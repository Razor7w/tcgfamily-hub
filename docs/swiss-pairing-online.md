# Emparejamiento Swiss (torneos online)

Motor: `app/lib/swiss-pairing.ts` — alineado con **Play! Pokémon** (TOM).

## Reglas implementadas

| Ronda | Comportamiento |
|-------|----------------|
| **1** | Emparejamiento **aleatorio** |
| **2+** | Grupos por **puntos de partida** (3/1/0) |
| **Float** | Si un grupo tiene cantidad impar, el jugador de **menor puntaje** del grupo baja al siguiente |
| **Dentro del grupo** | Aleatorio (como TOM) + **sin repetir rival** (backtracking en brackets ≤ tamaño típico) |
| **Bye** | Máximo **1 por jugador**; va al de **menor puntaje** entre quienes no tuvieron bye |
| **Victoria bye** | +1 W (máx. 1 por jugador); se persiste con `syncOnlineParticipantRecords` al avanzar ronda, verificar partido o cerrar torneo |

## Flujo en la app

1. Staff confirma asistencia → **Lanzar ronda 1**
2. Jugadores reportan resultados → staff avanza con **Lanzar ronda N+1**
3. `advanceOnlineTournamentRound` recalcula W/L, llama `generateSwissPairings`, guarda snapshot

## Verificación local

```bash
npx tsx scripts/verify-swiss-pairing.mjs
```

## Referencias

- Play! Pokémon Tournament Rules Handbook §4.6 (Swiss Pairing)
- Desempates en standings: `tournament-tiebreakers.ts` (OWP / OOWP)
