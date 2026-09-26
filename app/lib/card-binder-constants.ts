export const CARD_BINDER_NAME_MAX = 80
export const CARD_BINDER_DESCRIPTION_MAX = 280
export const CARD_SINGLE_NOTE_MAX = 200
export const CARD_SINGLE_QUANTITY_MAX = 99
export const CARD_SINGLE_PRICE_CLP_MAX = 99_999_999
export const CARD_PHOTO_NAME_MAX = 120
export const CARD_PHOTO_DESCRIPTION_MAX = 500

export {
  CARD_BINDER_SLUG_MAX,
  CARD_BINDER_SLUG_MIN,
  normalizeCardBinderSlug,
  slugFromCardBinderName,
  isValidCardBinderSlug,
  cardBinderPublicPath
} from '@/lib/card-binder-slug'
