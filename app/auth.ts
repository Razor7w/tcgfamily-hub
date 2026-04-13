import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { MongoDBAdapter } from '@/lib/mongodb-adapter'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true // Permitir vincular cuentas con el mismo email
    })
  ],
  pages: {
    signIn: '/auth/signin'
    // Puedes personalizar otras páginas aquí
  },
  events: {
    async linkAccount({ user, profile }) {
      // Cuando se vincula una cuenta OAuth, actualizar el usuario con datos de Google
      if (profile && user.id) {
        await connectDB()

        const existingUser = await User.findById(user.id)
        if (existingUser) {
          // Actualizar nombre e imagen del usuario con datos de Google
          // El profile de Google tiene 'name' e 'image' (no 'picture')
          // Convertir primero a unknown para evitar errores de TypeScript
          const profileData = profile as unknown as Record<string, unknown>

          if (
            profileData.name &&
            typeof profileData.name === 'string' &&
            profileData.name !== existingUser.name
          ) {
            existingUser.name = profileData.name
          }

          // Google usa 'image' para la URL de la imagen del perfil
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
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role || 'user'
      }
      return session
    }
  },
  session: {
    strategy: 'database'
  }
})
