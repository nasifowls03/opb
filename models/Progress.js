import mongoose from "../lib/mongoose-shim.js";

const CardEntrySchema = new mongoose.Schema({
  cardId: { type: String },
  count: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
}, { _id: false });

const ProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  cards: { type: Map, of: Object, default: {} },
  team: { type: [String], default: [] },
  userXp: { type: Number, default: 0 },
  userLevel: { type: Number, default: 1 },
  claimedLevel: { type: Number, default: 0 },
});

export default mongoose.models.Progress || mongoose.model("Progress", ProgressSchema);
