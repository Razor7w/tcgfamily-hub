import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "user" | "admin";

export interface IUser extends Document {
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  role: UserRole;
  accounts: mongoose.Types.ObjectId[];
  sessions: mongoose.Types.ObjectId[];
}

const UserSchema = new Schema<IUser>(
  {
    name: String,
    email: String,
    emailVerified: Date,
    image: String,
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    accounts: [{ type: Schema.Types.ObjectId, ref: "Account" }],
    sessions: [{ type: Schema.Types.ObjectId, ref: "Session" }],
  },
  {
    // Asegurar que los defaults se apliquen incluso si el modelo ya existía
    strict: true,
  }
);

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
