import mongoose, { Schema, Document } from "mongoose";
import { DEFAULT_LEAGUE_POINTS_BY_PLACE } from "@/lib/league-constants";

export interface ILeague extends Document {
  name: string;
  /** URL única: solo minúsculas, números y guiones. */
  slug: string;
  description: string;
  /** Solo torneos Pokémon en tienda suelen usar ligas; reservado por si amplías. */
  game: "pokemon";
  isActive: boolean;
  pointsByPlace: number[];
  /**
   * Si es un entero >= 1, solo cuentan los N mejores torneos por jugador (similar a «mejores N resultados» en CP).
   * `null` o ausente = sumar todos los torneos de la liga.
   */
  countBestEvents: number | null;
}

const LeagueSchema = new Schema<ILeague>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      index: true,
      unique: true,
    },
    description: { type: String, default: "", maxlength: 4000 },
    game: {
      type: String,
      enum: ["pokemon"],
      default: "pokemon",
    },
    isActive: { type: Boolean, default: true, index: true },
    pointsByPlace: {
      type: [Number],
      default: () => [...DEFAULT_LEAGUE_POINTS_BY_PLACE],
      validate: {
        validator(v: unknown) {
          return (
            Array.isArray(v) &&
            v.length >= 1 &&
            v.length <= 32 &&
            v.every(
              (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
            )
          );
        },
        message: "pointsByPlace debe ser un array de 1–32 números >= 0",
      },
    },
    countBestEvents: {
      type: Number,
      required: false,
      default: undefined,
    },
  },
  { timestamps: true, strict: true },
);

if (mongoose.models.League) {
  delete mongoose.models.League;
}

export default mongoose.model<ILeague>("League", LeagueSchema);
