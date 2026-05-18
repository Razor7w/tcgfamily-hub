export function serializeStorePublicFields(s: {
  address?: string
  websiteUrl?: string
  instagramUrl?: string
}) {
  return {
    address: typeof s.address === 'string' ? s.address : '',
    websiteUrl: typeof s.websiteUrl === 'string' ? s.websiteUrl : '',
    instagramUrl: typeof s.instagramUrl === 'string' ? s.instagramUrl : ''
  }
}

export function serializeStoreAdminRow(s: {
  _id: { toString(): string }
  name: string
  slug: string
  logoUrl?: string
  isActive: boolean
  address?: string
  websiteUrl?: string
  instagramUrl?: string
}) {
  return {
    id: s._id.toString(),
    name: s.name,
    slug: s.slug,
    logoUrl: s.logoUrl ?? '',
    isActive: s.isActive,
    ...serializeStorePublicFields(s)
  }
}
