import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ILeague extends Document {
  /** Alcance multitenant (obligatorio tras migración bootstrap). */
  storeId?: Types.ObjectId
  name: string
  /** Slug único dentro de la tienda (`storeId`). */
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
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: false,
      index: true,
      /** Sin storeId ⇒ legacy; tras migración siempre viene informado */
      default: undefined
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      /** Único compuesto `{ storeId, slug }`; ver índices al pie del schema. */
      unique: false
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

LeagueSchema.index({ storeId: 1, slug: 1 }, { unique: true, sparse: true })
LeagueSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { storeId: { $exists: false } }
  }
)

if (mongoose.models.League) {
  delete mongoose.models.League
}

export default mongoose.model<ILeague>('League', LeagueSchema)
