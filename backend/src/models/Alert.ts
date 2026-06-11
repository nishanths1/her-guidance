import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  user: mongoose.Types.ObjectId;
  location: {
    lat: number;
    lng: number;
  };
  audioUrls?: string[];
  photoUrls?: string[];
  threatLevel: 'low' | 'moderate' | 'critical';
  status: 'active' | 'resolved';
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    audioUrls: [{ type: String }],
    photoUrls: [{ type: String }],
    videoUrls: [{ type: String }],
    threatLevel: { type: String, enum: ['low', 'moderate', 'critical'], default: 'moderate' },
    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

export default mongoose.model<IAlert>('Alert', AlertSchema);
