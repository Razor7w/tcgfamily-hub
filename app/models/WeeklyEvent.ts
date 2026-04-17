import mongoose, { Schema, Document, Types } from "mongoose";

export type WeeklyEventKind = "tournament" | "trade_day" | "other";

export type WeeklyEventGame = "pokemon" | "magic" | "other_tcg";

export type PokemonTournamentSubtype = "casual" | "cup" | "challenge";

/** Ciclo operativo del evento en tienda. */
export type WeeklyEventState = "schedule" | "running" | "close";

export interface IWeeklyParticipant {
  displayName: string;
  userId?: Types.ObjectId;
  createdAt: Date;
  /** Confirmado por staff en el panel admin. */
  confirmed?: boolean;
  /** POP ID del usuario al momento de preinscribirse. */
  popId?: string;
  /** Mesa / emparejamiento (ej. torneo); vacío hasta asignación. */
  table?: string;
  opponentId?: string;
  /** Récord del torneo según TDF (victorias / derrotas / empates). */
  wins?: number;
  losses?: number;
  ties?: number;
}

export interface IWeeklyEvent extends Document {
  startsAt: Date;
  title: string;
  kind: WeeklyEventKind;
  game: WeeklyEventGame;
  /** Solo aplica a torneos Pokémon. */
  pokemonSubtype?: PokemonTournamentSubtype;
  /** Precio en CLP; 0 = gratuito. Solo relevante para torneos en UI. */
  priceClp: number;
  maxParticipants: number;
  formatNotes: string;
  prizesNotes: string;
  location: string;
  /** Programado, en curso o cerrado. */
  state: WeeklyEventState;
  /** Ronda actual del torneo (0 = sin iniciar / no aplica). */
  roundNum?: number;
  participants: IWeeklyParticipant[];
}

const ParticipantSchema = new Schema<IWeeklyParticipant>(
  {
    displayName: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    createdAt: { type: Date, default: () => new Date() },
    confirmed: { type: Boolean, default: false },
    popId: { type: String, default: "" },
    table: { type: String, default: "" },
    opponentId: { type: String, default: "" },
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    ties: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

const WeeklyEventSchema = new Schema<IWeeklyEvent>(
  {
    startsAt: { type: Date, required: true, index: true },
    title: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ["tournament", "trade_day", "other"],
      required: true,
    },
    game: {
      type: String,
      enum: ["pokemon", "magic", "other_tcg"],
      required: true,
    },
    pokemonSubtype: {
      type: String,
      enum: ["casual", "cup", "challenge"],
      required: false,
    },
    priceClp: { type: Number, default: 0, min: 0 },
    maxParticipants: { type: Number, required: true, min: 1 },
    formatNotes: { type: String, default: "" },
    prizesNotes: { type: String, default: "" },
    location: { type: String, default: "" },
    state: {
      type: String,
      enum: ["schedule", "running", "close"],
      default: "schedule",
    },
    roundNum: { type: Number, default: 0, min: 0 },
    participants: { type: [ParticipantSchema], default: [] },
  },
  { timestamps: true, strict: true },
);

// Next.js recarga el módulo en dev pero `mongoose.models` conserva el modelo ya
// compilado; sin esto, un esquema viejo sigue activo y se pierden campos nuevos al guardar.
if (mongoose.models.WeeklyEvent) {
  delete mongoose.models.WeeklyEvent;
}

export default mongoose.model<IWeeklyEvent>("WeeklyEvent", WeeklyEventSchema);
