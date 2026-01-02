import mongoose from "../lib/mongoose-shim.js";

const BalanceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 500 },
  amount: { type: Number, default: 500 }, // alias
  resetTokens: { type: Number, default: 0 },
  // daily rewards tracking
  lastDaily: { type: Date },
  dailyStreak: { type: Number, default: 0 },
  // gambling limits per-day
  gambleWindow: { type: Number, default: 0 },
  gamblesToday: { type: Number, default: 0 },
  // mission tracking
  lastMission: { type: Date },
  // global progression
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
});

export default mongoose.models.Balance || mongoose.model("Balance", BalanceSchema);
