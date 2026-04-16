import mongoose, { Schema, Document, Types } from "mongoose";

export type WeeklyEventKind = "tournament" | "trade_day" | "other";

export type WeeklyEventGame = "pokemon" | "magic" | "other_tcg";

export type PokemonTournamentSubtype = "casual" | "cup" | "challenge";

export interface IWeeklyParticipant {
  displayName: string;
  userId?: Types.ObjectId;
  createdAt: Date;
  /** Confirmado por staff en el panel admin. */
  confirmed?: boolean;
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
  participants: IWeeklyParticipant[];
}

const ParticipantSchema = new Schema<IWeeklyParticipant>(
  {
    displayName: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    createdAt: { type: Date, default: () => new Date() },
    confirmed: { type: Boolean, default: false },
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
    participants: { type: [ParticipantSchema], default: [] },
  },
  { timestamps: true, strict: true },
);

export default mongoose.models.WeeklyEvent ||
  mongoose.model<IWeeklyEvent>("WeeklyEvent", WeeklyEventSchema);
