import mongoose, { Schema, Document } from 'mongoose';

export interface IIncident extends Document {
  alert: mongoose.Types.ObjectId;
  notes: string;
  handledBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema: Schema = new Schema(
  {
    alert: { type: Schema.Types.ObjectId, ref: 'Alert', required: true },
    notes: { type: String, required: true },
    handledBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IIncident>('Incident', IncidentSchema);
