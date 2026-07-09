# Equipos: medallas y Team Wars (diseño)

Resumen de decisiones y diseño conversado para el sistema de equipos en TCGFamily: medallas (fase 1 implementada), formato competitivo inter-equipos (Team Wars) y reglas para eventos oficiales en tienda.

---

## 1. Medallas de equipo (fase 1 — implementado)

### Objetivo

Logros **colectivos verificables** que refuercen identidad del equipo, sin mezclarse con puntos de contribución por tienda ni con Championship Points individuales.

### Arquitectura

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Catálogo fijo | `app/lib/teams/medals/definitions.ts` | Slugs, labels, descripciones, categorías |
| Tipos (client-safe) | `app/lib/teams/medals/types.ts` | `TeamMedalDTO`, categorías |
| Cálculo on-read | `app/lib/teams/medals/build-team-medals.ts` | Medallas dinámicas + merge con persistidas |
| Persistencia (futuro) | `app/models/TeamMedalAward.ts` | Grants manuales, histórico, cron futuro |
| UI | `TeamMedalsRow`, `TeamMedalChip`, `TeamMedalsGuideDialog` | Chips + botón «Cómo ganarlas» |

### Medallas del catálogo

| Slug | Nombre | Cómo se gana |
|------|--------|--------------|
| `league_champion` | Campeón de liga | 1° en ranking de equipos de una liga |
| `league_runner_up` | Subcampeón de liga | 2° en ranking de equipos de una liga |
| `league_third_place` | Tercer lugar de liga | 3° en ranking de equipos de una liga |
| `active_month` | Mes activo | ≥2 miembros jugaron torneos oficiales en el mes (Chile) |
| `full_roster` | Roster completo | **≥3** miembros activos |
| `showcase` | Escaparate | Todos los miembros con mazo público destacado |
| `veteran` | Veterano | Equipo activo y aprobado hace ≥1 año |

Constantes relevantes (`definitions.ts`):

- `TEAM_FULL_ROSTER_MIN_MEMBERS = 3`
- `TEAM_ACTIVE_MONTH_MIN_PLAYERS = 2`
- `TEAM_VETERAN_MIN_DAYS = 365`

### Dónde se muestran

- Página pública `/equipos/[slug]` — bajo el header
- Dashboard equipo → pestaña **Perfil**
- Admin equipos → modal **Ver** → Información
- Modal **Cómo ganarlas**: catálogo completo, marca «Conseguida» si aplica

### Índices MongoDB (cuando se usen awards persistidos)

```javascript
db.teammedalawards.createIndex({ teamId: 1, earnedAt: -1 })
db.teammedalawards.createIndex({ teamId: 1, instanceKey: 1 }, { unique: true })
```

Las medallas dinámicas no requieren índices nuevos (reutilizan memberships, decklists, `WeeklyEvent`, ligas).

---

## 2. Restricción: un equipo por usuario

Ya aplicada en código (`TeamMembership` activa única). Cualquier ranking inter-equipos debe apoyarse en esta regla.

---

## 3. Team Wars — concepto competitivo inter-equipos

### Idea original (formato cruzado 3×3)

Equipos de 3 jugadores. En un **clash** entre Team 1 y Team 2, cada jugador del equipo A enfrenta a cada jugador del equipo B → **9 duelos**, 1 punto por victoria. Suma de wins por equipo; gana quien más puntos sume.

**Ejemplo:** Jugador A vence a Z y X, pierde con Y → 2 pts para su equipo en esos duelos (9 pts totales en disputa en el clash completo).

### Problema de escala

| Escenario | Team clashes | Duelos totales |
|-----------|--------------|----------------|
| 4 equipos, round robin (todos vs todos) | 6 | **54** |
| Semis + final (4 equipos) | 3 | **27** |
| Semis + final + 3° puesto | 4 | **36** |

Demasiado largo para una tarde en tienda con BO1 (~20–30 min por duelo).

### Formato recomendado en tienda: **mismo slot**

Asignar **slot 1, 2, 3** por seed dentro de cada equipo:

- Slot 1 vs Slot 1, Slot 2 vs Slot 2, Slot 3 vs Slot 3
- **3 duelos** por clash (3 mesas en paralelo)
- Gana el equipo con más victorias (2–1 o 3–0)

Reservar el formato 9 duelos cruzados para finales especiales o eventos de día completo.

---

## 4. Anti-farming y verificación

### Riesgo

Equipos amigos que reportan duelos ficticios para subir ranking.

### Recomendación: dos capas separadas

| Capa | Fuente | Uso |
|------|--------|-----|
| **Oficial** | Torneos en tienda / TDF cerrados | Liga actual, medallas, prestigio |
| **Clash** | Team Wars verificados | Ranking paralelo |

### Tres niveles de verificación para clash

| Nivel | Descripción | ¿Cuenta para ranking global? |
|-------|-------------|------------------------------|
| **A — Social** | Capitanes confirman amistosos | No (solo historial) |
| **B — Confirmado** | Roster bloqueado, doble confirmación, límites por rival/mes | Parcial / con decay |
| **C — Oficial** | Evento de tienda, staff o TDF | **Sí** |

### Mitigaciones adicionales

- Roster freeze al abrir el clash
- No repetir mismo enfrentamiento equipo vs equipo en ventana corta
- Peso por fuerza del rival (ELO)
- Detección de anomalías (>70% de clash vs 1–2 rivales)
- Mínimo de actividad en torneos oficiales para que cuenten puntos de clash

---

## 5. Evento oficial en tienda: 4 equipos × 3 jugadores

### Opción A — Una tarde (recomendada para el primer evento)

**Eliminación simple** con formato mismo slot:

```
Semifinal 1: Team 1 vs Team 2  (3 duelos)
Semifinal 2: Team 3 vs Team 4  (3 duelos)
Final:       Ganadores           (3 duelos)
3er puesto:  Perdedores          (3 duelos, opcional)
```

- **9–12 duelos** totales según se juegue o no el 3° puesto
- Seeding: liga de equipos → actividad/CP → sorteo
- Staff verifica resultados; no self-report para ranking oficial

### Opción B — Temporada (mejor para ranking)

Round robin en **3 fechas**:

| Fecha | Enfrentamientos |
|-------|-----------------|
| 1 | 1v2 y 3v4 |
| 2 | 1v3 y 2v4 |
| 3 | 1v4 y 2v3 |

6 duelos por fecha → tabla W-L al cierre del mes.

### Operación en app (futuro)

- `TeamClashEvent` (tienda, fecha, formato)
- `TeamClashFixture` (teamA, teamB, ronda, fase)
- `TeamClashDuel` (slot, jugadores, ganador, fuente: `manual | confirmed | tdf | official`)
- Vincular a `WeeklyEvent` con flag `official`

---

## 6. Formato compacto: 3 rondas inter-equipo (4 equipos)

Para que **cada jugador** enfrente un rival de **cada equipo ajeno** sin duelos intra-equipo, con **todos jugando cada ronda**:

Fijar slots 1–3 por equipo. Calendario:

| Ronda | Par 1 (3 mesas) | Par 2 (3 mesas) |
|-------|-----------------|-----------------|
| **1** | A vs B | C vs D |
| **2** | A vs C | B vs D |
| **3** | A vs D | B vs C |

- **12 jugadores**, **6 duelos por ronda**, **18 duelos** en total
- Cada jugador: exactamente **3 partidos** (uno vs B, C y D si es del equipo A)
- Puntuación equipo: suma de wins individuales y/o mini-clash por ronda (2+ de 3 slots)

**Requisitos:** 4 equipos con 3 activos cada uno; slots definidos antes del evento; ideal **6 mesas** (o 3 mesas en dos oleadas).

---

## 7. Generalización: n equipos

Cada jugador debe enfrentar **un rival de cada equipo ajeno** → **(n − 1) partidos por jugador**.

| Equipos | Rivales por jugador | Rondas del evento | Notas |
|---------|---------------------|-------------------|-------|
| **4** (par) | 3 | **3** | Todos juegan cada ronda |
| **5** (impar) | 4 | **5** (no 4) | Un equipo entero hace bye por ronda |
| **6** (par) | 5 | **5** | Todos juegan cada ronda |
| **n** par | n − 1 | **n − 1** | |
| **n** impar | n − 1 | **n** | Bye rotativo por equipo |

### Calendario ejemplo — 5 equipos

| Ronda | Enfrentamientos | Bye |
|-------|-----------------|-----|
| 1 | 1–2, 3–4 | **5** |
| 2 | 1–3, 4–5 | **2** |
| 3 | 1–4, 2–5 | **3** |
| 4 | 1–5, 2–3 | **4** |
| 5 | 2–4, 3–5 | **1** |

- Cada jugador termina con **4 partidos**
- Por ronda juegan **12 de 15** (equipo en bye no juega)
- **30 duelos** totales (5 × 6)

---

## 8. Reglas operativas sugeridas

- **3 activos fijos** por evento (inscripción previa)
- Política de deck: mismo mazo todo el evento o cambio solo entre rondas (definir antes)
- Tardanza → WO al slot
- Desempate 1–1–1 en mini-clash: duelo extra entre capitanes o menor seed
- Rotar seeds entre fechas en ligas largas para evitar «esconder» al jugador fuerte

---

## 9. Roadmap sugerido

### Hecho (fase 1)

- [x] Catálogo y cálculo on-read de medallas
- [x] UI pública, dashboard y admin
- [x] Guía «Cómo ganarlas»
- [x] Modelo `TeamMedalAward` para persistencia futura

### Fase 2 (medallas)

- [ ] Cron al cerrar liga / fin de mes para persistir histórico
- [ ] Grants manuales desde admin
- [ ] Medallas de Team Wars cuando exista el modo

### Fase 3 (Team Wars)

- [ ] Modelos clash + duelos + fixtures
- [ ] Panel staff tienda (bracket, resultados)
- [ ] Ranking clash oficial separado de liga
- [ ] Medallas «Campeón Team Wars [tienda] [temporada]»

### MVP primer evento físico (sin app completa)

1. Pre-inscripción: 4 equipos × 3 slots
2. Bracket papel o spreadsheet con calendario de §6
3. Staff registra resultados
4. Opcional: carga manual en admin para mostrar en perfiles

---

## 10. Archivos de referencia en el repo

```
app/lib/teams/medals/
  definitions.ts      # Catálogo y constantes
  types.ts            # DTOs
  build-team-medals.ts # Server-only builder

app/models/TeamMedalAward.ts

app/components/teams/
  TeamMedalsRow.tsx
  TeamMedalChip.tsx
  TeamMedalsGuideDialog.tsx

app/lib/teams/
  league-ranking.ts   # Ranking liga por equipo (torneos oficiales)
  monthly-activity.ts # Actividad mensual por miembro
  public-payload.ts   # Expone medals en API pública
```

---

*Documento generado a partir del diseño conversado en desarrollo. Actualizar cuando se implemente Team Wars o cambien umbrales de medallas.*
