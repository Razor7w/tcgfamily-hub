import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { ownerPublicDisplay } from '@/lib/public-decklist-owner'
import { TEAM_POSTS_PAGE_SIZE } from '@/lib/teams/post-constants'
import type { TeamPostVisibility } from '@/lib/teams/post-constants'
import SavedDecklist from '@/models/SavedDecklist'
import TeamPost from '@/models/TeamPost'
import TeamPostComment from '@/models/TeamPostComment'
import TeamPostReaction from '@/models/TeamPostReaction'
import User from '@/models/User'

export type TeamPostDecklistDTO = {
  id: string
  name: string
  pokemonSlugs: string[]
  ownerName: string
}

export type TeamPostAuthorDTO = {
  userId: string
  displayName: string
  imageUrl: string | null
}

export type TeamPostDTO = {
  id: string
  title: string
  bodyHtml: string
  coverUrl: string
  visibility: TeamPostVisibility
  createdAt: string
  updatedAt: string
  author: TeamPostAuthorDTO
  decklist: TeamPostDecklistDTO | null
  likeCount: number
  dislikeCount: number
  commentCount: number
  viewerReaction: 1 | -1 | null
  canDelete: boolean
  canEdit: boolean
  coverKey?: string
  decklistId?: string | null
}

export type TeamPostCommentDTO = {
  id: string
  body: string
  createdAt: string
  author: TeamPostAuthorDTO
}

type PostLean = {
  _id: mongoose.Types.ObjectId
  teamId: mongoose.Types.ObjectId
  authorUserId: mongoose.Types.ObjectId
  title: string
  bodyHtml: string
  coverUrl: string
  coverKey?: string
  visibility?: TeamPostVisibility
  decklistId?: mongoose.Types.ObjectId
  likeCount: number
  dislikeCount: number
  commentCount: number
  createdAt: Date
  updatedAt: Date
}

type UserLean = {
  _id: mongoose.Types.ObjectId
  name?: string | null
  email?: string | null
  image?: string | null
}

type DeckLean = {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  name: string
  pokemonSlugs: string[]
  isPublic?: boolean
}

async function loadAuthors(
  userIds: mongoose.Types.ObjectId[]
): Promise<Map<string, TeamPostAuthorDTO>> {
  if (userIds.length === 0) return new Map()
  const users = await User.find({ _id: { $in: userIds } })
    .select('name email image')
    .lean<UserLean[]>()
  const map = new Map<string, TeamPostAuthorDTO>()
  for (const u of users) {
    const { displayName, imageUrl } = ownerPublicDisplay(u)
    map.set(String(u._id), {
      userId: String(u._id),
      displayName,
      imageUrl
    })
  }
  return map
}

async function loadDecklists(
  deckIds: mongoose.Types.ObjectId[]
): Promise<Map<string, TeamPostDecklistDTO>> {
  if (deckIds.length === 0) return new Map()
  const decks = await SavedDecklist.find({
    _id: { $in: deckIds },
    isPublic: true
  })
    .select('userId name pokemonSlugs')
    .lean<DeckLean[]>()

  const ownerIds = [...new Set(decks.map(d => String(d.userId)))]
  const owners = await User.find({
    _id: { $in: ownerIds.map(id => new mongoose.Types.ObjectId(id)) }
  })
    .select('name email image')
    .lean<UserLean[]>()
  const ownerMap = new Map(
    owners.map(u => [String(u._id), ownerPublicDisplay(u)])
  )

  const map = new Map<string, TeamPostDecklistDTO>()
  for (const deck of decks) {
    const owner = ownerMap.get(String(deck.userId))
    map.set(String(deck._id), {
      id: String(deck._id),
      name: deck.name,
      pokemonSlugs: deck.pokemonSlugs ?? [],
      ownerName: owner?.displayName ?? 'Usuario'
    })
  }
  return map
}

export async function buildTeamPostDTOs(
  posts: PostLean[],
  viewerUserId: string | null,
  viewerCanManage = false
): Promise<TeamPostDTO[]> {
  const authorIds = posts.map(p => p.authorUserId)
  const deckIds = posts
    .map(p => p.decklistId)
    .filter((id): id is mongoose.Types.ObjectId => id != null)

  const [authors, decks] = await Promise.all([
    loadAuthors(authorIds),
    loadDecklists(deckIds)
  ])

  let reactionMap = new Map<string, 1 | -1>()
  if (viewerUserId && mongoose.Types.ObjectId.isValid(viewerUserId)) {
    const reactions = await TeamPostReaction.find({
      postId: { $in: posts.map(p => p._id) },
      userId: new mongoose.Types.ObjectId(viewerUserId)
    })
      .select('postId value')
      .lean<{ postId: mongoose.Types.ObjectId; value: 1 | -1 }[]>()
    reactionMap = new Map(reactions.map(r => [String(r.postId), r.value]))
  }

  return posts.map(post => {
    const author =
      authors.get(String(post.authorUserId)) ??
      ({
        userId: String(post.authorUserId),
        displayName: 'Usuario',
        imageUrl: null
      } satisfies TeamPostAuthorDTO)

    const decklist = post.decklistId
      ? (decks.get(String(post.decklistId)) ?? null)
      : null

    const isAuthor = viewerUserId === String(post.authorUserId)

    return {
      id: String(post._id),
      title: post.title ?? '',
      bodyHtml: post.bodyHtml,
      coverUrl: post.coverUrl ?? '',
      visibility: post.visibility ?? 'public',
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      author,
      decklist,
      likeCount: post.likeCount ?? 0,
      dislikeCount: post.dislikeCount ?? 0,
      commentCount: post.commentCount ?? 0,
      viewerReaction: reactionMap.get(String(post._id)) ?? null,
      canDelete: isAuthor || viewerCanManage,
      canEdit: isAuthor,
      ...(isAuthor
        ? {
            coverKey: post.coverKey ?? '',
            decklistId: post.decklistId ? String(post.decklistId) : null
          }
        : {})
    }
  })
}

export type TeamPostsScope = 'public' | 'members'

export async function listTeamPosts(
  teamId: mongoose.Types.ObjectId,
  options: {
    viewerUserId?: string | null
    viewerCanManage?: boolean
    cursor?: string | null
    limit?: number
    scope?: TeamPostsScope
    viewerIsMember?: boolean
  }
) {
  await connectDB()
  const limit = Math.min(options.limit ?? TEAM_POSTS_PAGE_SIZE, 50)
  const filter: Record<string, unknown> = {
    teamId,
    deletedAt: { $exists: false }
  }

  const membersFeed =
    options.scope === 'members' && options.viewerIsMember === true
  if (!membersFeed) {
    filter.visibility = 'public'
  }

  if (options.cursor && mongoose.Types.ObjectId.isValid(options.cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(options.cursor) }
  }

  const posts = await TeamPost.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean<PostLean[]>()

  const hasMore = posts.length > limit
  const slice = hasMore ? posts.slice(0, limit) : posts
  const items = await buildTeamPostDTOs(
    slice,
    options.viewerUserId ?? null,
    options.viewerCanManage ?? false
  )

  return {
    posts: items,
    nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null
  }
}

export async function buildTeamPostCommentDTOs(
  comments: {
    _id: mongoose.Types.ObjectId
    authorUserId: mongoose.Types.ObjectId
    body: string
    createdAt: Date
  }[]
): Promise<TeamPostCommentDTO[]> {
  const authors = await loadAuthors(comments.map(c => c.authorUserId))
  return comments.map(c => ({
    id: String(c._id),
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    author:
      authors.get(String(c.authorUserId)) ??
      ({
        userId: String(c.authorUserId),
        displayName: 'Usuario',
        imageUrl: null
      } satisfies TeamPostAuthorDTO)
  }))
}

export async function listTeamPostComments(postId: mongoose.Types.ObjectId) {
  await connectDB()
  const comments = await TeamPostComment.find({
    postId,
    deletedAt: { $exists: false }
  })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean<
      {
        _id: mongoose.Types.ObjectId
        authorUserId: mongoose.Types.ObjectId
        body: string
        createdAt: Date
      }[]
    >()

  return buildTeamPostCommentDTOs(comments)
}

export async function applyTeamPostReaction(
  postId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  value: 1 | -1 | null
) {
  await connectDB()
  const existing = await TeamPostReaction.findOne({ postId, userId })

  if (value === null) {
    if (!existing)
      return { likeCount: 0, dislikeCount: 0, viewerReaction: null }
    const inc =
      existing.value === 1
        ? { likeCount: -1, dislikeCount: 0 }
        : { likeCount: 0, dislikeCount: -1 }
    await existing.deleteOne()
    await TeamPost.updateOne({ _id: postId }, { $inc: inc })
    const post = await TeamPost.findById(postId)
      .select('likeCount dislikeCount')
      .lean<{ likeCount: number; dislikeCount: number } | null>()
    return {
      likeCount: post?.likeCount ?? 0,
      dislikeCount: post?.dislikeCount ?? 0,
      viewerReaction: null as null
    }
  }

  if (!existing) {
    await TeamPostReaction.create({ postId, userId, value })
    await TeamPost.updateOne(
      { _id: postId },
      { $inc: value === 1 ? { likeCount: 1 } : { dislikeCount: 1 } }
    )
  } else if (existing.value !== value) {
    existing.value = value
    await existing.save()
    await TeamPost.updateOne(
      { _id: postId },
      {
        $inc:
          value === 1
            ? { likeCount: 1, dislikeCount: -1 }
            : { likeCount: -1, dislikeCount: 1 }
      }
    )
  }

  const post = await TeamPost.findById(postId)
    .select('likeCount dislikeCount')
    .lean<{ likeCount: number; dislikeCount: number } | null>()

  return {
    likeCount: post?.likeCount ?? 0,
    dislikeCount: post?.dislikeCount ?? 0,
    viewerReaction: value
  }
}
