import mongoose from "../lib/mongoose-shim.js";

const WeaponInventorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  blueprints: { type: Map, of: Number, default: {} },  // weaponId -> count
  weapons: { type: Map, of: Object, default: {} },      // weaponId -> { level, xp, equippedTo }
  materials: { type: Map, of: Number, default: {} },    // materialType -> count
  teamBanner: { type: String, default: null },          // bannerId equipped to team
});

export default mongoose.models.WeaponInventory || mongoose.model("WeaponInventory", WeaponInventorySchema);
