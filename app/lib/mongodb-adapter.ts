import { Adapter } from "next-auth/adapters";
import connectDB from "./mongodb";
import User from "@/models/User";
import Account from "@/models/Account";
import Session from "@/models/Session";
import VerificationToken from "@/models/VerificationToken";

export function MongoDBAdapter(): Adapter {
  return {
    async createUser(user) {
      await connectDB();
      
      // Si el usuario ya existe por email (por ejemplo, creado desde CSV),
      // actualizar su información en lugar de crear uno nuevo
      if (user.email) {
        const existingUser = await User.findOne({ email: user.email });
        if (existingUser) {
          // Actualizar nombre e imagen del usuario existente
          existingUser.name = user.name || existingUser.name;
          existingUser.image = user.image || existingUser.image;
          // Mantener el role existente (no sobrescribir si es admin)
          if (!existingUser.role) {
            existingUser.role = "user";
          }
          await existingUser.save();
          
          return {
            id: existingUser._id.toString(),
            name: existingUser.name,
            email: existingUser.email,
            emailVerified: existingUser.emailVerified,
            image: existingUser.image,
            role: existingUser.role || "user",
            phone: existingUser.phone || "",
            rut: existingUser.rut || "",
          };
        }
      }
      
      // Si no existe, crear un nuevo usuario
      const newUser = await User.create({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: "user", // Por defecto todos son "user"
        phone: "", // Por defecto string vacío
        rut: "", // Por defecto string vacío
        accounts: [],
        sessions: [],
      });
      
      // Verificar y actualizar si el role no se guardó (por si acaso)
      if (!newUser.role) {
        newUser.role = "user";
        await newUser.save();
      }
      
      return {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        emailVerified: newUser.emailVerified,
        image: newUser.image,
        role: newUser.role || "user",
        phone: newUser.phone || "",
        rut: newUser.rut || "",
      };
    },

    async getUser(id) {
      await connectDB();
      const user = await User.findById(id);
      if (!user) return null;
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role || "user",
        phone: user.phone || "",
        rut: user.rut || "",
      };
    },

    async getUserByEmail(email) {
      await connectDB();
      const user = await User.findOne({ email });
      if (!user) return null;
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role || "user",
        phone: user.phone || "",
        rut: user.rut || "",
      };
    },

    async getUserByAccount({ providerAccountId, provider }) {
      await connectDB();
      const account = await Account.findOne({ provider, providerAccountId });
      if (!account) return null;
      const user = await User.findById(account.userId);
      if (!user) return null;
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role || "user",
        phone: user.phone || "",
        rut: user.rut || "",
      };
    },

    async updateUser(user) {
      await connectDB();
      const updateData: {
        name?: string | null;
        email?: string | null;
        emailVerified?: Date | null;
        image?: string | null;
        role?: "user" | "admin";
        phone?: string;
        rut?: string;
      } = {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
      };
      if (user.role) {
        updateData.role = user.role;
      }
      if ((user as { phone?: string }).phone !== undefined) {
        updateData.phone = (user as { phone?: string }).phone;
      }
      if ((user as { rut?: string }).rut !== undefined) {
        updateData.rut = (user as { rut?: string }).rut;
      }
      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        updateData,
        { new: true },
      );
      if (!updatedUser) throw new Error("User not found");
      return {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        image: updatedUser.image,
        role: updatedUser.role || "user",
        phone: updatedUser.phone || "",
        rut: updatedUser.rut || "",
      };
    },

    async linkAccount(account) {
      await connectDB();
      
      // Verificar si ya existe una cuenta con este provider y providerAccountId
      const existingAccount = await Account.findOne({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      });

      if (existingAccount) {
        // Si la cuenta ya existe, retornarla
        return {
          ...account,
          id: existingAccount._id.toString(),
        };
      }

      const newAccount = await Account.create({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      });
      await User.findByIdAndUpdate(account.userId, {
        $push: { accounts: newAccount._id },
      });
      return {
        ...account,
        id: newAccount._id.toString(),
      };
    },

    async createSession({ sessionToken, userId, expires }) {
      await connectDB();
      const newSession = await Session.create({
        sessionToken,
        userId,
        expires,
      });
      await User.findByIdAndUpdate(userId, {
        $push: { sessions: newSession._id },
      });
      return {
        sessionToken: newSession.sessionToken,
        userId: newSession.userId.toString(),
        expires: newSession.expires,
      };
    },

    async getSessionAndUser(sessionToken) {
      await connectDB();
      const session = await Session.findOne({ sessionToken });
      if (!session) return null;
      const user = await User.findById(session.userId);
      if (!user) return null;
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId.toString(),
          expires: session.expires,
        },
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          role: user.role || "user",
          phone: user.phone || "",
          rut: user.rut || "",
        },
      };
    },

    async updateSession({ sessionToken, ...data }) {
      await connectDB();
      const session = await Session.findOneAndUpdate({ sessionToken }, data, {
        new: true,
      });
      if (!session) return null;
      return {
        sessionToken: session.sessionToken,
        userId: session.userId.toString(),
        expires: session.expires,
      };
    },

    async deleteSession(sessionToken) {
      await connectDB();
      const session = await Session.findOneAndDelete({ sessionToken });
      if (session) {
        await User.findByIdAndUpdate(session.userId, {
          $pull: { sessions: session._id },
        });
      }
    },

    async createVerificationToken({ identifier, expires, token }) {
      await connectDB();
      const verificationToken = await VerificationToken.create({
        identifier,
        expires,
        token,
      });
      return {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: verificationToken.expires,
      };
    },

    async useVerificationToken({ identifier, token }) {
      await connectDB();
      const verificationToken = await VerificationToken.findOneAndDelete({
        identifier,
        token,
      });
      if (!verificationToken) return null;
      return {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: verificationToken.expires,
      };
    },
  };
}
