import { computeTeamBoosts } from "../lib/boosts.js";
import { getCardById } from "../cards.js";
import { roundNearestFive, roundRangeToFive } from "../lib/stats.js";
import { applyHakiStatBoosts, parseHaki } from "../lib/haki.js";

// Generic episode session creator and accuracy handler.
// startEpisode(userId, episode, interaction) will create a `session` in
// `global.SAIL_SESSIONS` compatible with `startSailTurn` in
// `events/interactionCreate.js` so episodes can be authored as data.

export async function startEpisode(userId, episode, interaction) {
  const Progress = (await import("../models/Progress.js")).default;
  const WeaponInventory = (await import('../models/WeaponInventory.js')).default;
  const SailProgress = (await import('../models/SailProgress.js')).default;

  const progress = await Progress.findOne({ userId });
  if (!progress || !progress.team || progress.team.length === 0) {
    try { await interaction.followUp({ content: "You need a team to sail. Use /team to set your team.", ephemeral: true }); } catch (e) { await interaction.channel.send({ content: "You need a team to sail. Use /team to set your team." }); }
    return;
  }

  const sailProgress = await SailProgress.findOne({ userId });
  const difficulty = (sailProgress && sailProgress.difficulty) || 'easy';
  const multiplier = difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1;

  const winv = await WeaponInventory.findOne({ userId });
  const hasBanner = winv && winv.teamBanner === 'alvida_pirates_banner_c_01';

  function getEquippedWeaponForCard(winv, cardId) {
    if (!winv || !winv.weapons) return null;
    if (winv.weapons instanceof Map) {
      for (const [wid, w] of winv.weapons.entries()) {
        if (w && w.equippedTo === cardId) {
          const wcard = getCardById(wid);
          if (wcard) return { id: wid, card: wcard, ...w };
        }
      }
    } else {
      for (const [wid, w] of Object.entries(winv.weapons || {})) {
        if (w && w.equippedTo === cardId) {
          const wcard = getCardById(wid);
          if (wcard) return { id: wid, card: wcard, ...w };
        }
      }
    }
    return null;
  }

  const p1TeamBoosts = computeTeamBoosts(progress.team || [], progress.cards || null, null);
  const p1Cards = progress.team.map(cardId => {
    const card = getCardById(cardId);
    const hasMap = progress.cards && typeof progress.cards.get === 'function';
    const progressCard = hasMap ? (progress.cards.get(cardId) || { level: 0, xp: 0 }) : (progress.cards[cardId] || { level: 0, xp: 0 });
    const level = progressCard.level || 0;
    const mult = 1 + (level * 0.01);
    let health = Math.round((card.health || 0) * mult);
    let attackMin = Math.round(((card.attackRange && card.attackRange[0]) || 0) * mult);
    let attackMax = Math.round(((card.attackRange && card.attackRange[1]) || 0) * mult);
    const special = card.specialAttack ? { ...card.specialAttack, range: [(card.specialAttack.range[0] || 0) * mult, (card.specialAttack.range[1] || 0) * mult] } : null;
    let power = Math.round((card.power || 0) * mult);

    const equipped = getEquippedWeaponForCard(winv, cardId);
    if (equipped && equipped.card && card.signatureWeapon === equipped.id) {
      const weaponCard = equipped.card;
      const weaponLevel = equipped.level || 1;
      const weaponLevelBoost = (weaponLevel - 1) * 0.01;
      let sigBoost = 0;
      if (weaponCard.signatureCards && Array.isArray(weaponCard.signatureCards)) {
        const idx = weaponCard.signatureCards.indexOf(cardId);
        if (idx > 0) sigBoost = 0.25;
      }
      const totalWeaponBoost = 1 + weaponLevelBoost + sigBoost;
      if (weaponCard.boost) {
        const atkBoost = Math.round((weaponCard.boost.atk || 0) * totalWeaponBoost);
        const hpBoost = Math.round((weaponCard.boost.hp || 0) * totalWeaponBoost);
        power += atkBoost;
        attackMin += atkBoost;
        attackMax += atkBoost;
        health += hpBoost;
      }
    }

    if (p1TeamBoosts.atk) {
      const atkMul = 1 + (p1TeamBoosts.atk / 100);
      attackMin = Math.round(attackMin * atkMul);
      attackMax = Math.round(attackMax * atkMul);
      power = Math.round(power * atkMul);
    }
    if (p1TeamBoosts.hp) {
      const hpMul = 1 + (p1TeamBoosts.hp / 100);
      health = Math.round(health * hpMul);
    }
    if (special && p1TeamBoosts.special) {
      const spMul = 1 + (p1TeamBoosts.special / 100);
      special.range = [Math.round(special.range[0] * spMul), Math.round(special.range[1] * spMul)];
    }

    const bannerSignature = ['Alvida_c_01', 'heppoko_c_01', 'Peppoko_c_01', 'Poppoko_c_01', 'koby_c_01'];
    if (hasBanner && bannerSignature.includes(cardId)) {
      attackMin = Math.round(attackMin * 1.05);
      attackMax = Math.round(attackMax * 1.05);
      power = Math.round(power * 1.05);
      health = Math.round(health * 1.05);
    }

    let scaled = { attackRange: [Math.round(attackMin), Math.round(attackMax)], power: Math.round(power) };
    const hakiApplied = applyHakiStatBoosts(scaled, card, progressCard);
    scaled = hakiApplied.scaled;
    const finalPower = roundNearestFive(Math.round(scaled.power));
    const finalAttackMin = roundNearestFive(Math.round(scaled.attackRange[0] || 0));
    const finalAttackMax = roundNearestFive(Math.round(scaled.attackRange[1] || 0));
    const finalHealth = roundNearestFive(Math.round(health * (hakiApplied.haki.armament.multiplier || 1)));
    if (special && special.range) special.range = roundRangeToFive([Math.round(special.range[0] || 0), Math.round(special.range[1] || 0)]);

    const hakiFinal = hakiApplied.haki || parseHaki(card);
    return { cardId, card, scaled: { attackRange: [finalAttackMin, finalAttackMax], specialAttack: special, power: finalPower }, health: finalHealth, maxHealth: finalHealth, level, stamina: 3, usedSpecial: false, attackedLastTurn: false, haki: hakiFinal, dodgeChance: (hakiFinal.observation.stars || 0) * 0.05 };
  });

  const sessionId = `sail_ep${episode}_${userId}_${Date.now()}`;
  global.SAIL_SESSIONS = global.SAIL_SESSIONS || new Map();
  global.SAIL_SESSIONS.set(sessionId, {
    userId,
    user: interaction.user,
    cards: p1Cards,
    lifeIndex: 0,
    enemies: [],
    currentStageIndex: 0,
    phase: 1,
    sessionId,
    channelId: interaction.channel.id,
    msgId: null,
    difficulty,
    episode
  });
  // If player hasn't progressed past episode 0 yet, award Episode-1 XP and mark progress
  try {
    const SailProgress = (await import('../models/SailProgress.js')).default;
    let sailProgress = await SailProgress.findOne({ userId }) || new SailProgress({ userId });
    if ((sailProgress.progress || 0) === 0 && episode === 1) {
      // award XP once per difficulty
      const xpAmount = sailProgress.difficulty === 'hard' ? 30 : sailProgress.difficulty === 'medium' ? 20 : 10;
      const ProgressModel = (await import('../models/Progress.js')).default;
      const Balance = (await import('../models/Balance.js')).default;
      const Inventory = (await import('../models/Inventory.js')).default;
      let progressDoc = await ProgressModel.findOne({ userId }) || new ProgressModel({ userId, team: [], cards: new Map() });
      if (!progressDoc.cards || typeof progressDoc.cards.get !== 'function') progressDoc.cards = new Map(Object.entries(progressDoc.cards || {}));
      sailProgress.awardedXp = sailProgress.awardedXp || {};
      if (!sailProgress.awardedXp[sailProgress.difficulty]) {
        progressDoc.userXp = (progressDoc.userXp || 0) + xpAmount;
        let levelsGained = 0;
        while ((progressDoc.userXp || 0) >= 100) { progressDoc.userXp -= 100; progressDoc.userLevel = (progressDoc.userLevel || 1) + 1; levelsGained++; }
        if (levelsGained > 0) {
          const bal = await Balance.findOne({ userId }) || new Balance({ userId });
          const inv = await Inventory.findOne({ userId }) || new Inventory({ userId });
          let oldLevel = (progressDoc.userLevel || 1) - levelsGained;
          for (let lvl = oldLevel + 1; lvl <= (progressDoc.userLevel || 1); lvl++) {
            bal.balance = (bal.balance || 0) + (lvl * 50);
            const rankIndex = Math.floor((lvl - 1) / 10);
            const ranks = ['C','B','A','S'];
            const currentRank = ranks[rankIndex] || 'S';
            const prevRank = ranks[rankIndex - 1];
            const chance = (lvl % 10 || 10) * 10;
            if (Math.random() * 100 < chance) { inv.chests[currentRank] = (inv.chests[currentRank] || 0) + 1; } else if (prevRank) { inv.chests[prevRank] = (inv.chests[prevRank] || 0) + 1; }
          }
          await bal.save(); await inv.save();
        }
        // award to each team member
        for (const cardId of progressDoc.team || []) {
          let entry = progressDoc.cards.get(cardId) || { count:0, xp:0, level:0 };
          entry.xp = (entry.xp || 0) + xpAmount; let newLevel = entry.level || 0;
          while (entry.xp >= 100) { entry.xp -= 100; newLevel += 1; }
          entry.level = newLevel; progressDoc.cards.set(cardId, entry);
          progressDoc.markModified && progressDoc.markModified('cards');
        }
        await progressDoc.save();
        sailProgress.awardedXp[sailProgress.difficulty] = true;
        sailProgress.progress = 1;
        await sailProgress.save();
      }
    }
  } catch (e) { console.error('Error awarding episode-start XP in startEpisode:', e); }

  return sessionId;
}

export async function handleAccuracy(sessionId, interaction) {
  const session = global.SAIL_SESSIONS.get(sessionId);
  if (!session) { try { await interaction.reply({ content: 'Session expired or not found.', ephemeral: true }); } catch (e) {} return; }
  if (interaction.user.id !== session.userId) { try { await interaction.reply({ content: 'Only the original requester can interact with this.', ephemeral: true }); } catch (e) {} return; }
  try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) {}
  if (!session.accuracy || !session.accuracy.start) return;
  const now = Date.now();
  const elapsed = now - session.accuracy.start;
  const duration = session.accuracy.duration || 10000;
  const successWindow = session.accuracy.window || 1000;
  const intervalMs = session.accuracy.intervalMs || 1000;
  const barLen = session.accuracy.barLen || Math.ceil(duration / intervalMs);

  try { if (session._accuracyInterval) { clearInterval(session._accuracyInterval); session._accuracyInterval = null; } } catch (e) {}

  const step = Math.min(barLen, Math.max(1, Math.ceil(elapsed / intervalMs)));
  // success if user clicked on 4th or 5th tick (barLen-1 or barLen), or within the configured successWindow at end
  if (step >= (barLen - 1) || (elapsed >= (duration - successWindow) && elapsed <= duration + 500)) {
    session.phase = (session.phase || 1) + 1;
    session.accuracy = null;
    try { if (global && typeof global.startSailTurn === 'function') await global.startSailTurn(sessionId, interaction.channel); else console.error('startSailTurn not available on global'); } catch (e) { console.error('Failed to continue after accuracy success:', e); }
  } else {
    try { if (global && typeof global.endSailBattle === 'function') await global.endSailBattle(sessionId, interaction.channel, false); else console.error('endSailBattle not available on global'); } catch (e) { console.error('Failed to end sail after accuracy fail:', e); }
  }
}

// startSailTurn and endSailBattle are defined in interactionCreate.js scope; declare them as globals for runtime linking
/* global startSailTurn, endSailBattle */

export default { startEpisode, handleAccuracy };
