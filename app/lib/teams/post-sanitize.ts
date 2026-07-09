import 'server-only'

import sanitizeHtml from 'sanitize-html'
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

  const clean = sanitizeHtml(trimmed, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto']
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
        target: '_blank'
      })
    }
  })

  return clean.replace(/<p><\/p>/g, '').trim()
}
