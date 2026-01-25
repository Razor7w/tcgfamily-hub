import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  accounts: mongoose.Types.ObjectId[];
  sessions: mongoose.Types.ObjectId[];
}

const UserSchema = new Schema<IUser>({
  name: String,
  email: String,
  emailVerified: Date,
  image: String,
  accounts: [{ type: Schema.Types.ObjectId, ref: "Account" }],
  sessions: [{ type: Schema.Types.ObjectId, ref: "Session" }],
});

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
