export type CardPhotoDTO = {
  id: string
  binderId: string
  userId: string
  name: string
  description: string
  imageUrl: string
  imageKey: string
  published: boolean
  interestCount: number
  createdAt: string
  updatedAt: string
}

type PhotoLean = {
  _id: { toString(): string }
  binderId: { toString(): string }
  userId: { toString(): string }
  name: string
  description?: string
  imageUrl: string
  imageKey?: string
  published?: boolean
  interestCount?: number
  createdAt?: Date
  updatedAt?: Date
}

export function toCardPhotoDTO(doc: PhotoLean): CardPhotoDTO {
  return {
    id: doc._id.toString(),
    binderId: doc.binderId.toString(),
    userId: doc.userId.toString(),
    name: String(doc.name ?? '').trim(),
    description: String(doc.description ?? '').trim(),
    imageUrl: String(doc.imageUrl ?? '').trim(),
    imageKey: String(doc.imageKey ?? '').trim(),
    published: Boolean(doc.published),
    interestCount: Math.max(0, Math.round(Number(doc.interestCount) || 0)),
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString()
  }
}
