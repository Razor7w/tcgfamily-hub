import DOMPurify from 'isomorphic-dompurify'
import { TEAM_POST_BODY_HTML_MAX } from '@/lib/teams/post-constants'
import { teamPostBodyIsEmpty } from '@/lib/teams/post-text'

export { teamPostBodyIsEmpty }

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  's',
  'ul',
  'ol',
  'li',
  'a',
  'h2',
  'h3',
  'blockquote'
]

export function sanitizeTeamPostHtml(raw: string): string {
  const trimmed = raw.trim().slice(0, TEAM_POST_BODY_HTML_MAX)
  if (!trimmed) return ''

  const clean = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  })

  return clean.replace(/<p><\/p>/g, '').trim()
}
