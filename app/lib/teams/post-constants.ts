export const TEAM_POST_TITLE_MAX = 120
export const TEAM_POST_BODY_HTML_MAX = 24_000
export const TEAM_POST_COMMENT_MAX = 2000
export const TEAM_POSTS_PAGE_SIZE = 20

export type TeamPostVisibility = 'public' | 'members_only'

/** Coincide con docs vivos (campo ausente o null) y con índices parciales `{ deletedAt: null }`. */
export const TEAM_POST_NOT_DELETED_FILTER = { deletedAt: null } as const

export const TEAM_POST_VISIBILITY_LABELS: Record<TeamPostVisibility, string> = {
  public: 'Pública',
  members_only: 'Solo miembros'
}
