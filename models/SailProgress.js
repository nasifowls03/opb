import mongoose from "../lib/mongoose-shim.js";

const SailProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  progress: { type: Number, default: 0 }, // current episode
  difficulty: { type: String, default: 'easy' }, // easy, medium, hard
  lastSail: { type: Date }, // for cooldown
  stars: { type: Map, of: Number, default: {} }, // stars earned per episode
  awardedXp: { type: Object, default: {} }, // awarded XP per difficulty
});

export default mongoose.models.SailProgress || mongoose.model("SailProgress", SailProgressSchema);