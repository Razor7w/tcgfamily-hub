import mongoose, { Schema, Document, ObjectId } from "mongoose";

export interface IMail extends Document {
  fromUserId: ObjectId;
  toUserId: ObjectId;
  isRecived: boolean;
  observations?: string;
}

const MailSchema = new Schema<IMail>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isRecived: { type: Boolean, default: false, required: true },
    observations: { type: String, default: "" },
  },
  {
    timestamps: true,
    strict: true,
  },
);

export default mongoose.models.Mail ||
  mongoose.model<IMail>("Mail", MailSchema);
