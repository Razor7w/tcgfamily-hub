import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@/lib/mongodb-adapter'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { verifyPassword } from '@/lib/password-server'
import {
  normalizeEmail,
  validateEmailFormat,
  PASSWORD_TIMING_DUMMY_HASH
} from '@/lib/password-rules'
import { createSlidingWindowLimiter } from '@/lib/auth-rate-limit'

const credentialIpLimiter = createSlidingWindowLimiter({
  max: 40,
  windowMs: 15 * 60 * 1000
})

const MAX_CRED_FAILS = 5
const LOCK_MS = 15 * 60 * 1000

function getClientIp(request: Request): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: MongoDBAdapter(),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, request) {
        const emailRaw =
          typeof credentials?.email === 'string' ? credentials.email : ''
        const password =
          typeof credentials?.password === 'string' ? credentials.password : ''
        const email = normalizeEmail(emailRaw)

        const ip = getClientIp(request)
        if (credentialIpLimiter(`cred-ip:${ip}`)) {
          await verifyPassword(password || 'x', PASSWORD_TIMING_DUMMY_HASH)
          return null
        }

        if (!emailRaw.trim() || !password) {
          await verifyPassword(password || 'x', PASSWORD_TIMING_DUMMY_HASH)
          return null
        }
        if (validateEmailFormat(email)) {
          await verifyPassword(password, PASSWORD_TIMING_DUMMY_HASH)
          return null
        }
        if (password.length > 128) {
          await verifyPassword(
            password.slice(0, 128),
            PASSWORD_TIMING_DUMMY_HASH
          )
          return null
        }

        await connectDB()
        const user = await User.findOne({ email })
          .collation({ locale: 'en', strength: 2 })
          .select('+passwordHash credentialFailedAttempts credentialLockedUntil')

        const now = new Date()

        if (!user?.passwordHash) {
          await verifyPassword(password, PASSWORD_TIMING_DUMMY_HASH)
          return null
        }

        const lockedUntil = user.credentialLockedUntil
        if (lockedUntil && lockedUntil > now) {
          await verifyPassword(password, user.passwordHash)
          return null
        }

        const ok = await verifyPassword(password, user.passwordHash)

        if (!ok) {
          const fails = (user.credentialFailedAttempts ?? 0) + 1
          user.credentialFailedAttempts = fails
          if (fails >= MAX_CRED_FAILS) {
            user.credentialLockedUntil = new Date(Date.now() + LOCK_MS)
          }
          await user.save()
          return null
        }

        user.credentialFailedAttempts = 0
        user.credentialLockedUntil = undefined
        await user.save()

        return {
          id: user._id.toString(),
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          image: user.image ?? undefined,
          role: user.role || 'user'
        }
      }
    })
  ],
  pages: {
    signIn: '/'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.role = user.role ?? 'user'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role ?? 'user'
      }
      return session
    }
  },
  events: {
    async linkAccount({ user, profile }) {
      if (profile && user.id) {
        await connectDB()

        const existingUser = await User.findById(user.id)
        if (existingUser) {
          const profileData = profile as unknown as Record<string, unknown>

          if (
            profileData.name &&
            typeof profileData.name === 'string' &&
            profileData.name !== existingUser.name
          ) {
            existingUser.name = profileData.name
          }

          if (
            profileData.image &&
            typeof profileData.image === 'string' &&
            profileData.image !== existingUser.image
          ) {
            existingUser.image = profileData.image
          }

          await existingUser.save()
        }
      }
    }
  }
})
