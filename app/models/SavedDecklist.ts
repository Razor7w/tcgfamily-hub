import mongoose, { Schema, type Document } from 'mongoose'

export interface IDecklistVariant {
  _id: mongoose.Types.ObjectId
  label: string
  deckText: string
}

export interface ISavedDecklist extends Document {
  userId: mongoose.Types.ObjectId
  /** Nombre visible del mazo. */
  name: string
  /** Texto crudo del decklist (mismo formato que la demo). */
  deckText: string
  /** Hasta 2 slugs Limitless para sprites (mismo criterio que torneos). */
  pokemonSlugs: string[]
  /** Listas alternativas del mismo mazo (misma identidad visual / sprites). */
  variants: IDecklistVariant[]
  /**
   * Si está definido, la pestaña «Principal» muestra el texto de esa variante.
   * Si es null, muestra `deckText` (listado guardado al crear el mazo).
   */
  principalVariantId?: mongoose.Types.ObjectId | null
  /** Si es true, aparece en el listado comunitario de decklists públicos. */
  isPublic?: boolean
}

const DecklistVariantSchema = new Schema<IDecklistVariant>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 48
    },
    deckText: {
      type: String,
      required: true,
      maxlength: 120_000
    }
  },
  { _id: true }
)

const SavedDecklistSchema = new Schema<ISavedDecklist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    deckText: { type: String, required: true },
    pokemonSlugs: {
      type: [String],
      required: true,
      validate: {
        validator(v: unknown) {
          return Array.isArray(v) && v.length >= 1 && v.length <= 2
        },
        message: 'Entre 1 y 2 Pokémon'
      }
    },
    variants: { type: [DecklistVariantSchema], default: [] },
    principalVariantId: {
      type: Schema.Types.ObjectId,
      default: null,
      required: false
    },
    isPublic: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true, strict: true }
)

SavedDecklistSchema.index({ userId: 1, updatedAt: -1 })
SavedDecklistSchema.index({ isPublic: 1, updatedAt: -1 })

export default mongoose.models.SavedDecklist ||
  mongoose.model<ISavedDecklist>('SavedDecklist', SavedDecklistSchema)
