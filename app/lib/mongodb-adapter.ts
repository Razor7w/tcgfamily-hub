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
      const newUser = await User.create({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        accounts: [],
        sessions: [],
      });
      return {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        emailVerified: newUser.emailVerified,
        image: newUser.image,
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
      };
    },

    async updateUser(user) {
      await connectDB();
      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        {
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
        },
        { new: true },
      );
      if (!updatedUser) throw new Error("User not found");
      return {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        image: updatedUser.image,
      };
    },

    async linkAccount(account) {
      await connectDB();
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
