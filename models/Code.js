import mongoose from 'mongoose';

const CodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: false },
  claimed: { type: Boolean, default: false }, // Keep for backward compatibility or remove if not needed
  claimedBy: { type: [String], default: [] }, // Array of user IDs who have claimed
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Code || mongoose.model('Code', CodeSchema);
