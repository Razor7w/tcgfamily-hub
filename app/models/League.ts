import mongoose, { Schema, Document } from 'mongoose'

export interface ILeague extends Document {
  name: string
  /** URL única: solo minúsculas, números y guiones. */
  slug: string
  description: string
  /** Solo torneos Pokémon en tienda suelen usar ligas; reservado por si amplías. */
  game: 'pokemon'
  isActive: boolean
  /**
   * Si es un entero >= 1, solo cuentan los N mejores torneos por jugador (por puntos de liga en cada torneo).
   * `null` o ausente = sumar todos los torneos cerrados de la liga con récord W/L/T.
   */
  countBestEvents: number | null
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
      unique: true
    },
    description: { type: String, default: '', maxlength: 4000 },
    game: {
      type: String,
      enum: ['pokemon'],
      default: 'pokemon'
    },
    isActive: { type: Boolean, default: true, index: true },
    countBestEvents: {
      type: Number,
      required: false,
      default: undefined
    }
  },
  { timestamps: true, strict: true }
)

if (mongoose.models.League) {
  delete mongoose.models.League
}

export default mongoose.model<ILeague>('League', LeagueSchema)
