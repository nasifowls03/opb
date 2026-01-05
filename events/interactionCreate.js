import Progress from "../models/Progress.js";
import { startEpisode, handleAccuracy } from "./episodeInteractionCreate.js";
import Balance from "../models/Balance.js";
import Inventory from "../models/Inventory.js";
// import WeaponInventory from "../models/WeaponInventory.js";
import { getCardById, getRankInfo, cards } from "../cards.js";
import { buildCardEmbed, buildUserCardEmbed } from "../lib/cardEmbed.js";
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } from "discord.js";
import { roundNearestFive, roundRangeToFive } from "../lib/stats.js";
import { parseHaki, applyHakiStatBoosts } from "../lib/haki.js";

export const name = "interactionCreate";
export const once = false;

// use shared embed builder to keep UI consistent across commands and interactions

function getEvolutionChain(rootCard) {
  const chain = [];
  const visited = new Set();
  function walk(card) {
    if (!card || visited.has(card.id)) return;
    visited.add(card.id);
    chain.push(card.id);
    const ev = card.evolutions || [];
    for (const nextId of ev) {
      const next = getCardById(nextId);
      if (next) walk(next);
    }
  }
  walk(rootCard);
  return chain;
}

function getWeaponById(weaponId) {
  if (!weaponId) return null;
  const q = String(weaponId).toLowerCase();
  let weapon = cards.find((c) => (c.type === "weapon" || c.type === "banner") && c.id.toLowerCase() === q);
  if (weapon) return weapon;
  weapon = cards.find((c) => (c.type === "weapon" || c.type === "banner") && c.name.toLowerCase() === q);
  if (weapon) return weapon;
  weapon = cards.find((c) => (c.type === "weapon" || c.type === "banner") && c.name.toLowerCase().startsWith(q));
  if (weapon) return weapon;
  weapon = cards.find((c) => (c.type === "weapon" || c.type === "banner") && (c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)));
  return weapon || null;
}

// Sail helpers moved to module scope so other top-level functions can call them
async function endSailBattle(sessionId, channel, won) {
  const session = global.SAIL_SESSIONS.get(sessionId);
  if (!session) return;
  if (session.rewarded) return;
  session.rewarded = true;

  if (won) {
    const Balance = (await import("../models/Balance.js")).default;
    const Inventory = (await import("../models/Inventory.js")).default;
    const SailProgress = (await import("../models/SailProgress.js")).default;

    const balance = (await Balance.findOne({ userId: session.userId })) || new Balance({ userId: session.userId });
    const inventory = (await Inventory.findOne({ userId: session.userId })) || new Inventory({ userId: session.userId });
    const sailProgress = (await SailProgress.findOne({ userId: session.userId })) || new SailProgress({ userId: session.userId });

    let rewards = [];
    let episodeTitle = 'Episode 1';
    let nextProgress = 2;
    let resetToken = false;

    const multiplier = sailProgress && sailProgress.difficulty === 'hard' ? 1.5 : (sailProgress && sailProgress.difficulty === 'medium' ? 1.25 : 1);

    if (session.episode === 2) {
      episodeTitle = 'Episode 2';
      nextProgress = 3;
      const beli = Math.floor(Math.random() * 101) + 100;
      balance.balance += Math.ceil(beli * multiplier);
      const chests = Math.floor(Math.random() * 2) + 1;
      inventory.chests.C += chests;
      rewards = ['rika_c_01', 'roronoazoro_c_01'];
      if (sailProgress.difficulty === 'hard') {
        rewards.push('helmeppo_c_01');
        inventory.chests.B += 1;
      }
      if (session.secretStage && sailProgress && sailProgress.difficulty === 'hard') {
        const Progress = (await import("../models/Progress.js")).default;
        const progress = await Progress.findOne({ userId: session.userId });
        if (progress && progress.cards && typeof progress.cards.get === 'function') {
          if (progress.cards.has('roronoazoro_c_01')) {
            let entry = progress.cards.get('roronoazoro_c_01');
            entry.level = (entry.level || 0) + 25;
            progress.cards.set('roronoazoro_c_01', entry);
            await progress.save();
          } else {
            progress.cards.set('roronoazoro_c_01', { level: 25, xp: 0, count: 1 });
            await progress.save();
          }
        }
      }
    } else if (session.episode === 3) {
      episodeTitle = 'Episode 3';
      nextProgress = 4;
      const beli = Math.floor(Math.random() * 251) + 250; // 250-500
      balance.balance += Math.ceil(beli * multiplier);
      const chests = Math.floor(Math.random() * 2) + 1;
      inventory.chests.C += chests;
      // reset token exclusive to hard mode for Episode 3
      if (sailProgress.difficulty === 'hard') {
        balance.resetTokens = (balance.resetTokens || 0) + 1;
        resetToken = true;
      }
      rewards = [];
      if (sailProgress.difficulty === 'hard') {
        rewards.push('axehandmorgan_b_01');
        inventory.chests.B += 1;
      }
      // common rewards (cards/chests) may be added here if needed
    } else {
      const beli = Math.floor(Math.random() * 151) + 100;
      balance.balance += Math.ceil(beli * multiplier);
      const chests = Math.floor(Math.random() * 2) + 1;
      inventory.chests.C += chests;
      if (Math.random() < 0.5) {
        balance.resetTokens = (balance.resetTokens || 0) + 1;
        resetToken = true;
      }
      rewards = ['koby_c_01'];
      if (sailProgress.difficulty === 'hard') {
        rewards.push('Alvida_c_01', 'heppoko_c_01', 'Peppoko_c_01', 'Poppoko_c_01');
      }
      if (sailProgress.difficulty === 'hard' || sailProgress.difficulty === 'medium') {
        rewards.push('alvida_pirates_banner_blueprint_c_01');
      }
    }
    
    if (session.episode === 4) {
      // Episode 4 rewards
      episodeTitle = 'Episode 4';
      nextProgress = 5;
      const beli = Math.floor(Math.random() * 101) + 100; // 100-200
      balance.balance += Math.ceil(beli * multiplier);
      const chests = 1;
      inventory.chests.C += chests;
      rewards = ['Strawhat_blueprint_s_01'];
      if (sailProgress.difficulty === 'hard') {
        rewards.push('higuma_c_01', 'lordofthecoast_c_01');
      }
    }
    else if (session.episode === 5) {
      // Episode 5 rewards
      episodeTitle = 'Episode 5';
      nextProgress = 6;
      const beli = Math.floor(Math.random() * 101) + 100; // 100-200
      balance.balance += Math.ceil(beli * multiplier);
      const chests = 1;
      inventory.chests.C += chests;
      rewards = [];
      if (sailProgress.difficulty === 'hard') {
        // no extra hard-only collectibles for Episode 5
      }
    } else if (session.episode === 6) {
      // Episode 6 rewards
      episodeTitle = 'Episode 6';
      nextProgress = 7;
      const beli = Math.floor(Math.random() * 101) + 100; // 100-200
      balance.balance += Math.ceil(beli * multiplier);
      const chests = 1;
      inventory.chests.C += chests;
      rewards = ['chouchou_c_01', 'boodle_c_01'];
      if (sailProgress.difficulty === 'hard') {
        rewards.push('mohji_c_01', 'richie_c_01');
      }
    }

    const Progress = (await import("../models/Progress.js")).default;
    const WeaponInventory = (await import("../models/WeaponInventory.js")).default;
    let progress = await Progress.findOne({ userId: session.userId }) || new Progress({ userId: session.userId, team: [], cards: new Map() });
    if (!progress.cards || typeof progress.cards.get !== 'function') {
      progress.cards = new Map(Object.entries(progress.cards || {}));
    }
    const hadZoroBefore = progress.cards && typeof progress.cards.get === 'function' ? progress.cards.has('roronoazoro_c_01') : false;
    let weaponInv = await WeaponInventory.findOne({ userId: session.userId });
    if (!weaponInv) weaponInv = new WeaponInventory({ userId: session.userId, blueprints: {}, weapons: {}, materials: {} });

    const converted = [];
    for (const cardId of rewards) {
      if (progress.cards.has(cardId)) {
        // Convert duplicate reward into XP (100 XP) which may cause level-ups
        converted.push(cardId);
        let entry = progress.cards.get(cardId);
        let totalXp = (entry.xp || 0) + 100;
        let newLevel = entry.level || 0;
        while (totalXp >= 100) {
          totalXp -= 100;
          newLevel += 1;
        }
        entry.xp = totalXp;
        entry.level = newLevel;
        progress.cards.set(cardId, entry);
      } else {
        progress.cards.set(cardId, { level: 1, xp: 0, count: 1 });
      }
    }

    await balance.save();
    await inventory.save();
    await weaponInv.save();

    // Ensure changes to Map-backed cards persist
    if (progress && progress.cards && typeof progress.cards.get === 'function') {
      progress.markModified && progress.markModified('cards');
    }

    // If this session included the final Zoro encounter and player won, add +25 levels to Zoro (Hard only)
    if (session.zoroFinal && sailProgress && sailProgress.difficulty === 'hard') {
      if (progress && progress.cards && typeof progress.cards.get === 'function') {
        if (progress.cards.has('roronoazoro_c_01')) {
          let entry = progress.cards.get('roronoazoro_c_01');
          entry.level = (entry.level || 0) + 25;
          progress.cards.set('roronoazoro_c_01', entry);
        } else {
          progress.cards.set('roronoazoro_c_01', { level: 25, xp: 0, count: 1 });
        }
        progress.markModified && progress.markModified('cards');
      }
    }

    await progress.save();

    // Apply any data-driven rewards defined in events/episodes_definitions.js (additive)
    try {
      const epMod = await import('./episodes_definitions.js');
      const epDef = epMod && (epMod.episodes || (epMod.default && epMod.default.episodes)) ? (epMod.episodes || (epMod.default && epMod.default.episodes))[session.episode] : null;
      if (epDef && Array.isArray(epDef.rewards)) {
        const extraParts = [];
        for (const r of epDef.rewards) {
          try {
            if (r.hardOnly && sailProgress && sailProgress.difficulty !== 'hard') continue;
            if (r.type === 'beli') {
              let amt = 0;
              if (typeof r.amount === 'string' && r.amount.includes('-')) {
                const [min, max] = r.amount.split('-').map(n => parseInt(n, 10));
                amt = Math.floor(Math.random() * (max - min + 1)) + min;
              } else {
                amt = Number(r.amount) || 0;
              }
              // apply difficulty multiplier and round up
              const finalAmt = Math.ceil((amt || 0) * multiplier);
              balance.balance = (balance.balance || 0) + finalAmt;
              extraParts.push(`${finalAmt} beli`);
            } else if (r.type === 'chest') {
              const rk = (r.rank || 'C').toUpperCase();
              const amt = Number(r.amount) || 1;
              inventory.chests = inventory.chests || { C:0,B:0,A:0,S:0 };
              inventory.chests[rk] = (inventory.chests[rk] || 0) + amt;
              extraParts.push(`${amt} ${rk} tier chest${amt>1? 's':''}`);
            } else if (r.type === 'card') {
              // support both `id` or `name` in episode definitions
              let cid = r.id || null;
              if (!cid && r.name) {
                const found = (cards || []).find(c => c && (c.id === r.name || c.name === r.name || (c.name && c.name.toLowerCase() === String(r.name).toLowerCase())));
                cid = found ? found.id : String(r.name);
              }
              const amt = Number(r.amount) || 1;
              if (!progress.cards) progress.cards = new Map(Object.entries(progress.cards || {}));
              if (typeof progress.cards.get === 'function') {
                if (progress.cards.has(cid)) {
                  // convert duplicates into 100 XP per copy
                  let entry = progress.cards.get(cid);
                  let totalXp = (entry.xp || 0) + (100 * amt);
                  let newLevel = entry.level || 0;
                  while (totalXp >= 100) { totalXp -= 100; newLevel += 1; }
                  entry.xp = totalXp; entry.level = newLevel;
                  progress.cards.set(cid, entry);
                } else {
                  progress.cards.set(cid, { level: 1, xp: 0, count: amt });
                }
              } else {
                const obj = progress.cards || {};
                if (obj[cid]) {
                  obj[cid].xp = (obj[cid].xp || 0) + (100 * amt);
                  while (obj[cid].xp >= 100) { obj[cid].xp -= 100; obj[cid].level = (obj[cid].level||0) + 1; }
                } else {
                  obj[cid] = { level: 1, xp: 0, count: amt };
                }
                progress.cards = obj;
              }
              // present friendly name if available
              const friendly = getCardById(cid); extraParts.push(`${amt}× ${friendly ? friendly.name : cid}`);
            } else if (r.type === 'reset') {
              const amt = Number(r.amount) || 1;
              balance.resetTokens = (balance.resetTokens || 0) + amt;
              extraParts.push(`${amt} reset token${amt>1 ? 's' : ''}`);
            } else if (r.type === 'blueprint') {
              const id = r.id || r.name;
              const amt = Number(r.amount) || 1;
              weaponInv.blueprints = weaponInv.blueprints || {};
              weaponInv.blueprints[id] = (weaponInv.blueprints[id] || 0) + amt;
              extraParts.push(`${amt}× ${id} (blueprint)`);
            }
          } catch (e) { console.error('Failed to apply episode-defined reward:', e); }
        }
        if (extraParts.length) {
          // save models and append to rewardsText after existing text
          try { await balance.save(); } catch (e) {}
          try { await inventory.save(); } catch (e) {}
          try { await weaponInv.save(); } catch (e) {}
          try { progress.markModified && progress.markModified('cards'); await progress.save(); } catch (e) {}
          // attach to rewardsText (added later) by appending a marker in a temporary variable
          if (extraParts.length) {
            // store on session for later inclusion in the embed text
            session._extraEpisodeRewards = extraParts;
          }
        }
      }
    } catch (e) { console.error('Failed to apply episode definitions rewards:', e); }

    let rewardsText = '';
    if (session.episode === 2) {
      const beli = Math.floor(Math.random() * 101) + 100;
      const chests = Math.floor(Math.random() * 2) + 1;
      rewardsText = `${beli} beli\n${chests} C tier chest${chests > 1 ? 's' : ''}`;
      if (sailProgress.difficulty === 'hard') rewardsText += '\n1 B tier chest';
    } else if (session.episode === 3) {
      const beli = Math.floor(Math.random() * 251) + 250;
      const chests = Math.floor(Math.random() * 2) + 1;
      rewardsText = `${beli} beli\n${chests} C tier chest${chests > 1 ? 's' : ''}${resetToken ? '\n1 reset token' : ''}`;
      if (sailProgress.difficulty === 'hard') rewardsText += '\n1 B tier chest';
    } else if (session.episode === 4) {
      const beli = Math.floor(Math.random() * 101) + 100;
      const chests = 1;
      rewardsText = `${beli} beli\n${chests} C tier chest${resetToken ? '\n1 reset token' : ''}`;
    } else {
      const beli = Math.floor(Math.random() * 151) + 100;
      const chests = Math.floor(Math.random() * 2) + 1;
      rewardsText = `${beli} beli\n${chests} C tier chest${chests > 1 ? 's' : ''}${resetToken ? '\n1 reset token' : ''}`;
    }
    // Append any data-driven episode rewards (from episodes_definitions.js)
    if (session._extraEpisodeRewards && Array.isArray(session._extraEpisodeRewards) && session._extraEpisodeRewards.length) {
      rewardsText += '\n' + session._extraEpisodeRewards.join('\n');
      // cleanup
      delete session._extraEpisodeRewards;
    }
    for (const cardId of rewards) {
      const card = getCardById(cardId);
      const name = card ? card.name : cardId;
      if (converted.includes(cardId)) rewardsText += `\n~~1x ${name}~~`; else rewardsText += `\n1x ${name}`;
    }
    if (converted.length > 0) {
      rewardsText += '\n\n' + converted.map(id => {
        const card = getCardById(id);
        return `You already own ${card ? card.name : id}, converted to 100 XP.`;
      }).join('\n');
    }
    if (session.secretStage) rewardsText += '\n\n**Secret Stage Bonus:** Roronoa Zoro +25 levels!';
    if (session.zoroFinal) {
      if (hadZoroBefore) rewardsText += '\n\n**Final Encounter:** You defeated Zoro — Roronoa Zoro +25 levels!';
      else rewardsText += '\n\n**Final Encounter:** You defeated Zoro — Roronoa Zoro obtained at Level 25!';
    }

    sailProgress.progress = nextProgress;
    await sailProgress.save();

    const embed = new EmbedBuilder()
      .setTitle('Victory!')
      .setDescription(`You completed ${episodeTitle}!`)
      .addFields({ name: 'Rewards', value: rewardsText, inline: false });

    // Add a sail button to progress to the next episode for Episode 2 and Episode 3
    const components = [];
    const rows = [];
    if (session.episode === 2) {
      const btns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sail_battle_ep3:${session.userId}:start`).setLabel('Next Episode').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`sail:${session.userId}:map`).setLabel('Map').setStyle(ButtonStyle.Secondary)
      );
      rows.push(btns);
    } else if (session.episode === 3) {
      const btns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sail_battle_ep4:${session.userId}:start`).setLabel('Next Episode').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`sail:${session.userId}:map`).setLabel('Map').setStyle(ButtonStyle.Secondary)
      );
      rows.push(btns);
    } else if (session.episode === 4) {
      const btns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sail_battle_ep5:${session.userId}:start`).setLabel('Next Episode').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`sail:${session.userId}:map`).setLabel('Map').setStyle(ButtonStyle.Secondary)
      );
      rows.push(btns);
    } else if (session.episode === 5) {
      const btns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sail_battle_ep6:${session.userId}:start`).setLabel('Next Episode').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`sail:${session.userId}:map`).setLabel('Map').setStyle(ButtonStyle.Secondary)
      );
      rows.push(btns);
    } else if (session.episode === 6) {
      const btns = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sail:${session.userId}:map`).setLabel('Map').setStyle(ButtonStyle.Secondary)
      );
      rows.push(btns);
    }

    if (rows.length) await channel.send({ embeds: [embed], components: rows }); else await channel.send({ embeds: [embed] });
  } else {
    // on defeat, show reason if timed out
    const reason = session.timedOut ? 'You were defeated because you took too long to act.' : 'You were defeated. Try again later.';
    const embed = new EmbedBuilder().setTitle('Defeat').setDescription(reason);
    // set cooldown (5 minutes) on starting sails after defeat
    try {
      const SailProgress = (await import("../models/SailProgress.js")).default;
      const sailProg = await SailProgress.findOne({ userId: session.userId }) || new SailProgress({ userId: session.userId });
      sailProg.lastSail = new Date();
      await sailProg.save();
    } catch (e) { console.error('Failed to set sail cooldown after defeat:', e); }
      if (!session._skipDefeatEmbed) {
        await channel.send({ embeds: [embed] });
      }
  }

  global.SAIL_SESSIONS.delete(sessionId);
}

async function enemyAttack(session, channel) {
  const aliveEnemies = session.enemies.filter(e => e.health > 0);
  if (aliveEnemies.length === 0) return;
  let targetIndex = 0;
  let maxPower = 0;
  session.cards.forEach((c, idx) => {
    if (c.health > 0 && c.scaled.power > maxPower) {
      maxPower = c.scaled.power;
      targetIndex = idx;
    }
  });
  const target = session.cards[targetIndex];
  let totalDamage = 0;
  const damageDetails = [];
  for (const enemy of aliveEnemies) {
    let isMiss = false;
    let damage = 0;
    
    // Check if target has future sight active
    if (target.nextAttackGuaranteedDodge) {
      isMiss = true;
      target.nextAttackGuaranteedDodge = false;
    }
    
    if (!isMiss) {
      damage = Math.floor(Math.random() * (enemy.attackRange[1] - enemy.attackRange[0] + 1)) + enemy.attackRange[0];
      target.health -= damage;
      totalDamage += damage;
    }
    
    damageDetails.push(isMiss ? `${enemy.name}'s attack was dodged!` : `${enemy.name} attacks for ${damage} damage!`);
    if (target.health < 0) target.health = 0;
    if (target.health <= 0) target.stamina = 0;
  }
  const attackEmbed = new EmbedBuilder()
    .setTitle('Enemy Attack')
    .setDescription(damageDetails.join('\n') + `\n\nTotal: ${totalDamage} damage!`);
  await channel.send({ embeds: [attackEmbed] });
}

async function handleSailHakiMenu(sessionId, charIdx, session, interaction) {
  const card = session.cards[charIdx];
  if (!card) {
    try { await interaction.followUp({ content: 'Invalid character', ephemeral: true }); } catch (e) {}
    return;
  }

  const haki = card.haki || { armament: { stars:0 }, observation:{stars:0}, conqueror:{stars:0} };
  const opts = [];
  if (haki.observation && haki.observation.advanced) opts.push({ id: 'futuresight', label: 'Future Sight', cost: 1, style: ButtonStyle.Primary });
  if (haki.armament && haki.armament.advanced) opts.push({ id: 'ryou', label: 'Ryou', cost: 2, style: ButtonStyle.Danger });
  if (haki.conqueror && haki.conqueror.stars > 0) opts.push({ id: 'conqueror', label: 'Conqueror Strike', cost: 2, style: ButtonStyle.Success });
  if (haki.conqueror && haki.conqueror.present) opts.push({ id: 'conq_aoe', label: 'Conqueror AoE', cost: 2, style: ButtonStyle.Danger });

  if (opts.length === 0) {
    try { await interaction.followUp({ content: 'This character has no Haki abilities.', ephemeral: true }); } catch (e) {}
    return;
  }

  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = await import('discord.js');
  const embed = new EmbedBuilder().setTitle(`${card.card.name} — Haki Menu`).setDescription('Choose a Haki ability to use. These do not consume your turn but cost stamina.').setColor(0x3498db);

  const btns = opts.map(o => new ButtonBuilder().setCustomId(`sail_haki_use:${sessionId}:${charIdx}:${o.id}`).setLabel(`${o.label} (Cost: ${o.cost})`).setStyle(o.style));
  const row = new ActionRowBuilder().addComponents(btns.slice(0,5));
  try { await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true }); } catch (e) {}

  // create a short-lived collector on the interaction reply by listening to the channel
  const collectorMsgFilter = (i) => i.user.id === session.userId && i.customId && i.customId.startsWith('sail_haki_use');
  const collector2 = interaction.channel.createMessageComponentCollector({ filter: collectorMsgFilter, time: 20000 });
  collector2.on('collect', async i => {
    if (!i.customId.startsWith('sail_haki_use')) return;
    try {
      if (!i.deferred && !i.replied) {
        await i.deferUpdate();
      }
    } catch (e) {
      if (e && e.code === 10062) return; // Interaction expired, exit
      try {
        // If defer fails, try to reply instead
        await i.reply({ content: "Error processing your action. Please try again.", ephemeral: true });
      } catch (err) {
        // Give up silently if both defer and reply fail
      }
      return;
    }
    const parts = i.customId.split(':');
    const ability = parts[3];
    try {
      await performSailHakiAbility(sessionId, charIdx, ability, session, i);
    } catch (err) {
      console.error('performSailHakiAbility error', err);
      try { await i.followUp({ content: 'An error occurred performing Haki ability.', ephemeral: true }); } catch (e) {}
    }
    collector2.stop();
  });
}

async function performSailHakiAbility(sessionId, charIdx, ability, session, interaction) {
  const card = session.cards[charIdx];
  if (!card) return;
  
  if (ability === 'futuresight') {
    if ((card.stamina || 0) < 1) { try { await interaction.followUp({ content: 'Not enough stamina for Future Sight.', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Not enough stamina for Future Sight.' }); } catch (err) {} } return; }
    card.stamina = Math.max(0, card.stamina - 1);
    card.nextAttackGuaranteedDodge = true;
    try { await interaction.followUp({ content: `${interaction.user} used Future Sight on ${card.card.name}! It will dodge the next incoming attack.`, ephemeral: false }); } catch (e) { try { await interaction.channel.send({ content: `${interaction.user} used Future Sight on ${card.card.name}! It will dodge the next incoming attack.` }); } catch (err) {} }
    try { await startSailTurn(sessionId, interaction.channel); } catch (e) {}
    return;
  }
  if (ability === 'ryou') {
    if ((card.stamina || 0) < 2) { try { await interaction.followUp({ content: 'Not enough stamina for Ryou.', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Not enough stamina for Ryou.' }); } catch (err) {} } return; }
    card.stamina = Math.max(0, card.stamina - 2);
    session.ryou = session.ryou || {};
    session.ryou.cardIdx = charIdx;
    session.ryou.remaining = 1;
    try { await interaction.followUp({ content: `${interaction.user} used Ryou! Next incoming attack will redirect to ${card.card.name} and deal no damage.`, ephemeral: false }); } catch (e) { try { await interaction.channel.send({ content: `${interaction.user} used Ryou! Next incoming attack will redirect to ${card.card.name} and deal no damage.` }); } catch (err) {} }
    try { await startSailTurn(sessionId, interaction.channel); } catch (e) {}
    return;
  }
  if (ability === 'conqueror') {
    if ((card.stamina || 0) < 2) { try { await interaction.followUp({ content: 'Not enough stamina for Conqueror.', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Not enough stamina for Conqueror.' }); } catch (err) {} } return; }
    card.stamina = Math.max(0, card.stamina - 2);
    const stars = (card.haki && card.haki.conqueror && card.haki.conqueror.stars) || 0;
    const threshold = 100 + (stars * 10);
    const knocked = [];
    for (const e of session.enemies) {
      if (e.health > 0 && e.health <= threshold) { e.health = 0; knocked.push(e.name); }
    }
    try { await interaction.followUp({ content: `Conqueror used! Knocked out: ${knocked.length ? knocked.join(', ') : 'None'}`, ephemeral: false }); } catch (e) { try { await interaction.channel.send({ content: `Conqueror used! Knocked out: ${knocked.length ? knocked.join(', ') : 'None'}` }); } catch (err) {} }
    try { await startSailTurn(sessionId, interaction.channel); } catch (e) {}
    return;
  }
  if (ability === 'conq_aoe') {
    if ((card.stamina || 0) < 2) { try { await interaction.followUp({ content: 'Not enough stamina for Conqueror AoE.', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Not enough stamina for Conqueror AoE.' }); } catch (err) {} } return; }
    card.stamina = Math.max(0, card.stamina - 2);
    const stars = (card.haki && card.haki.conqueror && card.haki.conqueror.stars) || 0;
    const base = 0.05; // 5% base even at 0 stars
    const dmgPct = base + (stars * 0.10);
    const dmg = Math.round(card.maxHealth * dmgPct);
    for (const e of session.enemies) {
      if (e.health > 0) {
        e.health = Math.max(0, e.health - dmg);
      }
    }
    try { await interaction.followUp({ content: `${interaction.user} used Advanced Conqueror AoE for ${dmg} damage to all enemies!`, ephemeral: false }); } catch (e) { try { await interaction.channel.send({ content: `${interaction.user} used Advanced Conqueror AoE for ${dmg} damage to all enemies!` }); } catch (err) {} }
    try { await startSailTurn(sessionId, interaction.channel); } catch (e) {}
    return;
  }
}

async function performSailAttack(session, cardIndex, enemy, actionType, interaction) {
  const card = session.cards[cardIndex];
  let damage;
  let isMiss = false;
  
  // Check for future sight dodge on the enemy
  const hasFutureSight = enemy.nextAttackGuaranteedDodge;
  
  if (actionType === 'attack') {
    const min = (card.scaled && card.scaled.attackRange && Number(card.scaled.attackRange[0])) || (card.card && card.card.attackRange && Number(card.card.attackRange[0])) || 1;
    const max = (card.scaled && card.scaled.attackRange && Number(card.scaled.attackRange[1])) || (card.card && card.card.attackRange && Number(card.card.attackRange[1])) || Math.max(min, 1);
    const finalMin = Math.max(1, Math.floor(min));
    const finalMax = Math.max(finalMin, Math.floor(max));
    damage = Math.floor(Math.random() * (finalMax - finalMin + 1)) + finalMin;
    card.stamina = Math.max(0, (card.stamina ?? 3) - 1);
  } else if (actionType === 'special') {
    const special = card.scaled && card.scaled.specialAttack ? card.scaled.specialAttack : (card.card && card.card.specialAttack ? card.card.specialAttack : null);
    const smin = special && special.range ? Number(special.range[0]) || 1 : 1;
    const smax = special && special.range ? Number(special.range[1]) || smin : smin;
    const finalSmin = Math.max(1, Math.floor(smin));
    const finalSmax = Math.max(finalSmin, Math.floor(smax));
    damage = Math.floor(Math.random() * (finalSmax - finalSmin + 1)) + finalSmin;
    card.stamina = Math.max(0, (card.stamina ?? 3) - 3);
    card.usedSpecial = true;
    card.skipNextTurnPending = true;
  }
  
  // Check if future sight blocks the attack
  if (hasFutureSight) {
    isMiss = true;
    enemy.nextAttackGuaranteedDodge = false;
  }
  
  card.attackedLastTurn = true;
  if (!isMiss) {
    enemy.health -= damage;
    if (enemy.health < 0) enemy.health = 0;
  }
  
  const resultEmbed = new EmbedBuilder()
    .setTitle(actionType === 'special' ? `Special Attack: ${card.scaled.specialAttack.name}` : 'Attack Result')
    .setDescription(isMiss ? `${card.card.name}'s ${actionType} was dodged by ${enemy.name}!` : `${card.card.name} ${actionType}s ${enemy.name} for ${damage} damage!`);
  if (actionType === 'special' && card.scaled.specialAttack.gif) resultEmbed.setImage(card.scaled.specialAttack.gif);
  try {
    await interaction.update({ embeds: [resultEmbed], components: [] });
  } catch (e) {
    if (e && e.code === 10062) return; // Interaction expired
    try {
      await interaction.reply({ content: "Error updating battle. Please try again.", ephemeral: true });
    } catch (err) {
      // Give up silently if both update and reply fail
    }
    return;
  }
  setTimeout(async () => {
    await enemyAttack(session, interaction.channel);
    await startSailTurn(session.sessionId, interaction.channel);
  }, 2000);

}

export async function startSailTurn(sessionId, channel) {
  const session = global.SAIL_SESSIONS.get(sessionId);
  if (!session) return;

  // Ensure basic session state
  session.currentStageIndex = session.currentStageIndex ?? 0;
  session.lifeIndex = session.lifeIndex ?? 0;

  // Load episode definitions and current stage
  const epMod = await import('./episodes_definitions.js');
  const formatRewardsList = epMod.formatRewardsList || (epMod.default && epMod.default.formatRewardsList);
  const episodeDefs = epMod.episodes || (epMod.default && epMod.default.episodes);
  const currentEpisodeDef = episodeDefs && episodeDefs[session.episode];
  if (!currentEpisodeDef) { await endSailBattle(sessionId, channel, false); return; }
  const stage = currentEpisodeDef.stages && currentEpisodeDef.stages[session.currentStageIndex];
  if (!stage) { await endSailBattle(sessionId, channel, true); return; }

  // Determine location-based styling (author + color) for non-fight embeds
  const locations = epMod.locations || (epMod.default && epMod.default.locations) || {};
  const locEntry = Object.values(locations).find(l => l && Array.isArray(l.episodes) && l.episodes.includes(session.episode));
  const defaultAuthor = (locations.orange_town && locations.orange_town.name) || 'Orange town - East Blue';
  const defaultColor = (locations.orange_town && locations.orange_town.color) || 0xFA8628;

  // Handle embed stages
  if (stage.type === 'embed') {
    try {
      const authorName = (locEntry && locEntry.name) || defaultAuthor;
      const color = (locEntry && locEntry.color) || defaultColor;
      const embed = new EmbedBuilder().setTitle(stage.title || currentEpisodeDef.title || 'Episode').setDescription(stage.description || '').setColor(color).setAuthor({ name: authorName });
      if (stage.image) embed.setImage(stage.image);
      const components = [];
      const buttons = [];
      // attach reward preview if provided by stage or episode definition
      try {
        const rewardsForPreview = stage.rewards && stage.rewards.length ? stage.rewards : (currentEpisodeDef.rewards || []);
        const rewardText = (typeof formatRewardsList === 'function') ? formatRewardsList(rewardsForPreview, session.difficulty) : '';
        if (rewardText) {
          const prev = embed.data.description || '';
          embed.setDescription(prev + '\n\n' + rewardText + `\n\n**XP on start:** ${session.difficulty === 'hard' ? 30 : session.difficulty === 'medium' ? 20 : 10} to you and each team member.`);
        }
      } catch (e) {
        // ignore formatting errors
      }
      if (session.currentStageIndex < (currentEpisodeDef.stages.length - 1)) {
        buttons.push(new ButtonBuilder().setCustomId(`sail_next:${sessionId}:${session.currentStageIndex + 1}`).setLabel('Next Stage').setStyle(ButtonStyle.Secondary));
      } else {
        buttons.push(new ButtonBuilder().setCustomId(`sail_next:${sessionId}:claim`).setLabel('Claim Rewards').setStyle(ButtonStyle.Secondary));
        if (typeof session.episode === 'number' && session.episode < 8) {
          buttons.push(new ButtonBuilder().setCustomId(`sail_battle_ep${session.episode + 1}:${session.userId}:start`).setLabel('Next Episode').setStyle(ButtonStyle.Primary));
        }
      }
      components.push(new ActionRowBuilder().addComponents(...buttons));
      await channel.send({ embeds: [embed], components });
    } catch (e) { console.error('startSailTurn embed error:', e); }
    return;
  }

  // Handle accuracy stages
  if (stage.type === 'accuracy') {
    try {
      const barLen = stage.barLen || 5;
      const intervalMs = stage.intervalMs || 1000;
      const duration = barLen * intervalMs;
      let step = 0;
      const authorName = (locEntry && locEntry.name) || defaultAuthor;
      const color = (locEntry && locEntry.color) || defaultColor;
      const embed = new EmbedBuilder().setTitle(stage.title || 'Accuracy Test').setDescription(stage.description || 'Click the button to stop the progress bar as close to the end as possible.').setColor(color).setAuthor({ name: authorName });
      if (stage.image) embed.setImage(stage.image);
      const btn = new ButtonBuilder().setCustomId(`sail_accuracy:${sessionId}:stop`).setLabel('Now!').setStyle(ButtonStyle.Primary);
      const msg = await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
      session.accuracy = { start: Date.now(), duration, window: stage.successWindow || 2000, intervalMs, barLen };
      session._accuracyMsgId = msg.id;
      session._accuracyInterval = setInterval(async () => {
        try {
          step++;
          const filled = Math.min(barLen, step);
          const pct = Math.min(100, Math.round((filled / barLen) * 100));
          const bar = '▰'.repeat(filled) + '▱'.repeat(barLen - filled);
          const e = EmbedBuilder.from(embed).setDescription(`Progress: ${bar} ${pct}%`);
          await msg.edit({ embeds: [e] }).catch(() => {});
          if (step >= barLen) {
            clearInterval(session._accuracyInterval); session._accuracyInterval = null;
            try { await endSailBattle(sessionId, channel, false); } catch (e) {}
          }
        } catch (e) { console.error('Accuracy update error:', e); }
      }, intervalMs);
    } catch (e) { console.error('startSailTurn accuracy error:', e); }
    return;
  }

  // Handle reward stages
  if (stage.type === 'reward') {
    try {
      const authorName = (locEntry && locEntry.name) || defaultAuthor;
      const color = (locEntry && locEntry.color) || defaultColor;
      const embed = new EmbedBuilder().setTitle(stage.title || 'Rewards').setDescription(stage.description || '').setColor(color).setAuthor({ name: authorName });
      if (stage.image) embed.setImage(stage.image);
      const buttons = [new ButtonBuilder().setCustomId(`sail_next:${sessionId}:claim`).setLabel('Claim Rewards').setStyle(ButtonStyle.Secondary)];
      if (typeof session.episode === 'number' && session.episode < 8) buttons.push(new ButtonBuilder().setCustomId(`sail_battle_ep${session.episode + 1}:${session.userId}:start`).setLabel('Next Episode').setStyle(ButtonStyle.Primary));
      const row = new ActionRowBuilder().addComponents(...buttons);
      await channel.send({ embeds: [embed], components: [row] });
    } catch (e) { console.error('startSailTurn reward error:', e); }
    return;
  }

  // Handle fight stages: ensure enemies set and render battle UI
  if (stage.type === 'fight') {
    try {
      // Initialize enemies only once per stage to avoid resetting health each turn
      if (session._stageInitialized !== session.currentStageIndex) {
        const multiplier = session.difficulty === 'hard' ? 1.5 : session.difficulty === 'medium' ? 1.25 : 1;
        session.enemies = (stage.enemies || []).map(e => ({
          id: e.id || null,
          name: e.name || e.id || 'Enemy',
          health: Math.round((e.health || 100) * multiplier),
          maxHealth: Math.round((e.health || 100) * multiplier),
          attackRange: [Math.ceil((e.attack && e.attack[0] || 10) * multiplier), Math.ceil((e.attack && e.attack[1] || 15) * multiplier)],
          power: Math.ceil((e.attack && e.attack[0] || 10) * multiplier),
          special: e.special || null
        }));
        session._stageInitialized = session.currentStageIndex;
      }
    } catch (e) { console.error('startSailTurn fight setup error:', e); }
  }

  // Common battle UI rendering
  // prepare lifeIndex and stamina
  if (!session.cards || session.cards.length === 0) return;
  if (session.lifeIndex == null || session.lifeIndex >= session.cards.length || session.cards[session.lifeIndex].health <= 0) {
    const idx = session.cards.findIndex(c => c.health > 0);
    session.lifeIndex = idx === -1 ? session.cards.length : idx;
  }
  session.cards.forEach(c => { c.skipThisTurn = false; });
  session.cards.forEach(c => { if (c.skipNextTurnPending) { c.skipThisTurn = true; c.skipNextTurnPending = false; } });
  session.cards.forEach(c => { if (!c.attackedLastTurn) c.stamina = Math.min(3, (c.stamina ?? 3) + 1); c.attackedLastTurn = false; if (c.health <= 0) c.stamina = 0; });
  if (session.lifeIndex >= session.cards.length) { await endSailBattle(sessionId, channel, false); return; }

  const aliveEnemies = (session.enemies || []).filter(e => e.health > 0);
  if (aliveEnemies.length === 0) {
    // advance to next stage (clear stage init so next stage initializes properly)
    session.currentStageIndex++;
    session._stageInitialized = null;
    await startSailTurn(sessionId, channel);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Sail Battle')
    .setDescription(`Stage: ${stage.title || 'Fight'} (Episode ${session.episode})`)
    .addFields(
      { name: 'Your Team', value: session.cards.map((c, idx) => `**${idx + 1}. ${c.card.name}** — HP: ${c.health}/${c.maxHealth} • Stamina: ${c.stamina ?? 3}/3`).join('\n'), inline: false },
      { name: 'Enemies', value: session.enemies.map(e => `**${e.name}** — HP: ${e.health}/${e.maxHealth}`).join('\n'), inline: false }
    );

  const attackButtons = session.cards.map((c, idx) => new ButtonBuilder().setCustomId(`sail_selectchar:${sessionId}:${idx}`).setLabel(`${c.card.name}`).setStyle(ButtonStyle.Primary).setDisabled(c.health <= 0 || (c.stamina ?? 3) <= 0));
  const anyHakiPlayable = session.cards.some(card => (card.haki && (card.haki.armament.present || card.haki.observation.present || card.haki.conqueror.present)) && card.health > 0 && !(typeof card.stamina === 'number' && card.stamina <= 0));
  const hakiButton = new ButtonBuilder().setCustomId(`sail_haki:${sessionId}:all`).setLabel('Haki').setStyle(ButtonStyle.Secondary).setDisabled(!anyHakiPlayable);
  const healButton = new ButtonBuilder().setCustomId(`sail_heal:${sessionId}`).setLabel('Heal').setStyle(ButtonStyle.Success);

  const rows = [];
  for (let i = 0; i < attackButtons.length; i += 5) rows.push(new ActionRowBuilder().addComponents(attackButtons.slice(i, i + 5)));
  rows.push(new ActionRowBuilder().addComponents(hakiButton));
  rows.push(new ActionRowBuilder().addComponents(healButton));

  // debounce
  const now = Date.now(); if (session._lastEmbedSent && (now - session._lastEmbedSent) < 500) return;
  const msg = await channel.send({ embeds: [embed], components: rows });
  session.msgId = msg.id; session._lastEmbedSent = Date.now();

  // turn timeout
  const hasPlayable = session.cards.some(c => c.health > 0 && !(c.skipThisTurn) && ((c.stamina ?? 3) > 0));
  if (!hasPlayable) { try { await channel.send({ content: "You had no stamina to act; the enemies attacked while you couldn't respond." }); } catch (e) {} await enemyAttack(session, channel); await startSailTurn(sessionId, channel); return; }
  if (hasPlayable) {
    try { if (session.turnTimer) { clearTimeout(session.turnTimer); session.turnTimer = null; } } catch (e) {}
    session.turnTimer = setTimeout(async () => { try { const s = global.SAIL_SESSIONS.get(sessionId); if (!s) return; if (s.msgId === msg.id) { s.timedOut = true; await endSailBattle(sessionId, channel, false); } } catch (e) { console.error('Sail turn timeout error:', e); } }, 45000);
  }
}

// expose these functions to other modules (episodeInteractionCreate) that call them at runtime
try { global.startSailTurn = startSailTurn; } catch (e) {}
try { global.endSailBattle = endSailBattle; } catch (e) {}

export async function execute(interaction, client) {
  try {
    // sail difficulty select
    if (interaction.isSelectMenu && interaction.isSelectMenu()) {
    const id = interaction.customId || "";
    if (id.startsWith("sail_difficulty:") || id.startsWith("settings_difficulty:")) {
      const parts = id.split(":");
      const userId = parts[1];
      if (interaction.user.id !== userId) return interaction.reply({ content: "Only the original requester can use this select.", ephemeral: true });

      const selected = interaction.values && interaction.values[0];
      if (!selected) return;

      const SailProgress = (await import("../models/SailProgress.js")).default;
      let sailProgress = await SailProgress.findOne({ userId }) || new SailProgress({ userId });
      sailProgress.difficulty = selected;
      await sailProgress.save();

      // Try to update the original message's embed color (the select menu lives on the episode 0 message)
      try {
        const msg = interaction.message;
        let color = selected === 'hard' ? 0xe74c3c : (selected === 'medium' ? 0xf1c40f : 0x2ecc71);
        if (msg && msg.embeds && msg.embeds[0]) {
          const e = EmbedBuilder.from(msg.embeds[0]).setColor(color);
          // preserve components
          const comps = msg.components || [];
          await interaction.update({ embeds: [e], components: comps });
          try { await interaction.followUp({ content: `Difficulty set to ${selected}.`, ephemeral: true }); } catch (e) {}
          return;
        }
      } catch (e) {
        // fall back to ephemeral reply
      }

      await interaction.reply({ content: `Difficulty set to ${selected}.`, ephemeral: true });
      return;
    }
  }

    if (interaction.isButton()) {
      const id = interaction.customId || "";
      // only handle known prefixes (include shop_ and duel_). Let per-message duel_* collectors handle duel interactions.
    if (!id.startsWith("info_") && !id.startsWith("collection_") && !id.startsWith("quest_") && !id.startsWith("help_") && !id.startsWith("drop_claim") && !id.startsWith("shop_") && !id.startsWith("duel_") && !id.startsWith("leaderboard_") && !id.startsWith("sail:") && !id.startsWith("sail_battle:") && !id.startsWith("sail_battle_ep1:") && !id.startsWith("sail_battle_ep2:") && !id.startsWith("sail_battle_ep3:") && !id.startsWith("sail_battle_ep4:") && !id.startsWith("sail_battle_ep5:") && !id.startsWith("sail_battle_ep6:") && !id.startsWith("sail_battle_ep7:") && !id.startsWith("sail_battle_ep8:") && !id.startsWith("sail_accuracy:") && !id.startsWith("sail_ep2_choice:") && !id.startsWith("sail_ep5_choice:") && !id.startsWith("sail_ep6_choice:") && !id.startsWith("sail_selectchar:") && !id.startsWith("sail_chooseaction:") && !id.startsWith("sail_selecttarget:") && !id.startsWith("sail_heal:") && !id.startsWith("sail_heal_item:") && !id.startsWith("sail_heal_card:") && !id.startsWith("sail_haki:") && !id.startsWith("sail_next:") && !id.startsWith("map_nav:")) return;
      // ignore duel_* here so message-level collectors in `commands/duel.js` receive them
      if (id.startsWith("duel_")) return;

      const parts = id.split(":");
      if (parts.length < 2) return;
      const action = parts[0];
      const ownerId = parts[1];

      // handle sail_next buttons (stage progression via stage index)
      if (action === 'sail_next') {
        const sessionId = parts[1];
        const stageIndexPart = parts[2];
        const session = global.SAIL_SESSIONS.get(sessionId);
        if (!session) { try { await interaction.reply({ content: 'Session expired or not found.', ephemeral: true }); } catch (e) {} return; }
        if (interaction.user.id !== session.userId) { try { await interaction.reply({ content: 'Only the original requester can advance the stage.', ephemeral: true }); } catch (e) {} return; }
        try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) {}
        if (stageIndexPart === 'claim') {
          await endSailBattle(sessionId, interaction.channel, true);
          return;
        }
        const nextStageIndex = parseInt(stageIndexPart);
        if (!isNaN(nextStageIndex)) {
          session.currentStageIndex = nextStageIndex;
          await startSailTurn(sessionId, interaction.channel);
        }
        return;
      }

      // HANDLE DROP CLAIMS: drop_claim:<token>
      if (id.startsWith("drop_claim")) {
        const token = parts[1];
        try {
          const drops = await import('../lib/drops.js');
          const res = await drops.claimDrop(token, interaction.user.id);
          if (!res.ok) {
            if (res.reason === 'not_found') return interaction.reply({ content: 'This drop has expired or was not found.', ephemeral: true });
            if (res.reason === 'already_claimed') return interaction.reply({ content: `This drop has already been claimed.`, ephemeral: true });
            return interaction.reply({ content: 'Unable to claim drop.', ephemeral: true });
          }

          // edit original message to disable button and mark claimed
          try {
            const ch = await interaction.client.channels.fetch(res.channelId).catch(() => null);
            if (ch && res.messageId) {
              const msg = await ch.messages.fetch(res.messageId).catch(() => null);
              if (msg) {
                const disabledButton = new ButtonBuilder().setCustomId(`drop_claim:${token}`).setLabel('Claimed').setStyle(ButtonStyle.Secondary).setDisabled(true);
                const disabledRow = new ActionRowBuilder().addComponents(disabledButton);
                // update embed footer to indicate claimed
                const embeds = msg.embeds || [];
                if (embeds && embeds[0]) {
                  const e = EmbedBuilder.from(embeds[0]);
                  const footerText = (e.data.footer && e.data.footer.text ? e.data.footer.text : '') + ` • Claimed by ${interaction.user.tag}`;
                  e.setFooter({ text: footerText });
                  await msg.edit({ embeds: [e], components: [disabledRow] }).catch(() => {});
                } else {
                  await msg.edit({ components: [disabledRow] }).catch(() => {});
                }
              }
            }
          } catch (e) {
            // ignore
            console.error('Error editing drop message after claim:', e && e.message ? e.message : e);
          }

          // Check if this was a duplicate card (converted to XP) or a new card
          if (res.result && !res.result.isNew) {
            const xpGain = res.result.xpGain || 0;
            const leveledText = res.result.leveled ? ' and leveled up!' : '!';
            await interaction.reply({ content: `You already own **${res.card.name}**! Converted to **${xpGain} XP**${leveledText}`, ephemeral: true });
          } else {
            await interaction.reply({ content: `You claimed **${res.card.name}** (Lv ${res.level}) — check your collection.`, ephemeral: true });
          }
          return;
        } catch (e) {
          console.error('drop claim handler error:', e && e.message ? e.message : e);
          return interaction.reply({ content: 'Error processing claim.', ephemeral: true });
        }
      }

      // HELP category buttons: help_cat:<category>:<userId>
      if (id.startsWith("help_cat")) {
        const parts = id.split(":");
        const category = parts[1];
        const userId = parts[2];
        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        // Static help groups (match commands provided by owner)
        const groups = {
          COMBAT: [
            { name: "team", desc: "view your team" },
            { name: "duel", desc: "challenge another user to a duel" },
            { name: "forfeit", desc: "forfeit an active duel" },
            { name: "team add", desc: "add a card to your team" },
            { name: "team remove", desc: "remove a card from your team" },
            { name: "autoteam", desc: "builds the best possible team (powerwise)" },
            { name: "upgrade", desc: "upgrade a card to its next rank" }
          ],
          ECONOMY: [
            { name: "balance", desc: "shows your balance and reset token count" },
            { name: "daily", desc: "claim daily rewards" },
            { name: "gamble", desc: "gamble an amount of beli" },
            { name: "mission", desc: "one piece trivia questions that give you rewards" },
            { name: "quests", desc: "view your daily and weekly quests" },
            { name: "sell", desc: "sell a card or item for beli" }
          ],
          COLLECTION: [
            { name: "info", desc: "view info about a card or item" },
            { name: "pull", desc: "pull a random card" },
            { name: "craft", desc: "craft items or combine materials" },
            { name: "chest", desc: "open your chests" },
            { name: "equip", desc: "equip a weapon or item to a card" },
            { name: "resetpulls", desc: "resets your card pull count" }
          ],
          GENERAL: [
            { name: "help", desc: "shows all bot commands" },
            { name: "inventory", desc: "view your inventory items" },
            { name: "level", desc: "use XP books/scrolls to level up a card" },
            { name: "user", desc: "shows your user profile" }
          ]
        };

        const groupKey = (category || '').toString().toUpperCase();
        if (!groups[groupKey]) {
          await interaction.reply({ content: "Category not found.", ephemeral: true });
          return;
        }

        const lines = groups[groupKey].map(c => `**${c.name}** — ${c.desc}`).join("\n") || "No commands";
        const label = (category || '').toString();
        const prettyLabel = label ? (label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()) : 'Category';
        const embed = new EmbedBuilder()
          .setTitle(`${prettyLabel} Commands`)
          .setColor(0xFFFFFF)
          .setDescription(lines)
          .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        // build buttons for all categories, mark selected as primary
        const order = ["Combat", "Economy", "Collection", "General"];
        const allButtons = order.map(cat => new ButtonBuilder()
          .setCustomId(`help_cat:${cat.toUpperCase()}:${userId}`)
          .setLabel(cat)
          .setStyle(cat.toUpperCase() === groupKey ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );

        const rows = [];
        for (let i = 0; i < allButtons.length; i += 5) {
          rows.push(new ActionRowBuilder().addComponents(...allButtons.slice(i, i + 5)));
        }

        await interaction.update({ embeds: [embed], components: rows });
        return;
      }

      // Leaderboard buttons: leaderboard_<mode>:<userId>
      if (id.startsWith('leaderboard_')) {
        const parts = id.split(":");
        const action = parts[0]; // e.g., leaderboard_level
        const ownerId = parts[1];
        if (interaction.user.id !== ownerId) {
          await interaction.reply({ content: 'Only the original requester can use these buttons.', ephemeral: true });
          return;
        }

        const mode = action.replace('leaderboard_', '');
        try {
          if (mode === 'level') {
            const Balance = (await import('../models/Balance.js')).default;
            const top = await Balance.find({}).sort({ level: -1, xp: -1 }).limit(10).lean();
            const lines = await Promise.all(top.map(async (b, idx) => {
              let name = b.userId;
              try { const u = await interaction.client.users.fetch(String(b.userId)).catch(() => null); if (u) name = u.username; } catch (e) {}
              return `**${idx + 1}. ${name}** — Level: ${b.level || 0}`;
            }));
            const embed = new EmbedBuilder().setTitle('Leaderboard — Level').setColor(0xFFFFFF).setDescription(lines.join('\n') || 'No data');
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`leaderboard_level:${ownerId}`).setLabel('Level').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`leaderboard_wealth:${ownerId}`).setLabel('Wealth').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId(`leaderboard_collection:${ownerId}`).setLabel('Collection').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [embed], components: [row] });
            return;
          }

          if (mode === 'wealth') {
            const Balance = (await import('../models/Balance.js')).default;
            const top = await Balance.find({}).sort({ amount: -1 }).limit(10).lean();
            const lines = await Promise.all(top.map(async (b, idx) => {
              let name = b.userId;
              try { const u = await interaction.client.users.fetch(String(b.userId)).catch(() => null); if (u) name = u.username; } catch (e) {}
              return `**${idx + 1}. ${name}** — ${b.amount || 0} beli¥`;
            }));
            const embed = new EmbedBuilder().setTitle('Leaderboard — Wealth').setColor(0xFFFFFF).setDescription(lines.join('\n') || 'No data');
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`leaderboard_level:${ownerId}`).setLabel('Level').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId(`leaderboard_wealth:${ownerId}`).setLabel('Wealth').setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId(`leaderboard_collection:${ownerId}`).setLabel('Collection').setStyle(ButtonStyle.Secondary)
            );
            await interaction.update({ embeds: [embed], components: [row] });
            return;
          }

          if (mode === 'collection') {
            const Progress = (await import('../models/Progress.js')).default;
            const progs = await Progress.find({}).lean();
            const arr = progs.map(p => {
              const cards = p.cards || {};
              const count = (cards instanceof Object && !(cards instanceof Array)) ? Object.keys(cards).length : (cards.size || 0);
              return { userId: p.userId, count };
            });
            arr.sort((a, b) => b.count - a.count);
            const top = arr.slice(0, 10);
            const lines = await Promise.all(top.map(async (it, idx) => {
              let name = it.userId;
              try { const u = await interaction.client.users.fetch(String(it.userId)).catch(() => null); if (u) name = u.username; } catch (e) {}
              return `**${idx + 1}. ${name}** — ${it.count} unique cards`;
            }));
            const embed = new EmbedBuilder().setTitle('Leaderboard — Collection').setColor(0xFFFFFF).setDescription(lines.join('\n') || 'No data');
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`leaderboard_level:${ownerId}`).setLabel('Level').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId(`leaderboard_wealth:${ownerId}`).setLabel('Wealth').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId(`leaderboard_collection:${ownerId}`).setLabel('Collection').setStyle(ButtonStyle.Primary)
            );
            await interaction.update({ embeds: [embed], components: [row] });
            return;
          }
        } catch (e) {
          console.error('Leaderboard handler error:', e && e.message ? e.message : e);
          await interaction.reply({ content: 'Error loading leaderboard.', ephemeral: true });
          return;
        }
      }

      // Handle sail buttons
      if (action === "sail") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        const SailProgress = (await import("../models/SailProgress.js")).default;
        const Progress = (await import("../models/Progress.js")).default;
        let sailProgress = await SailProgress.findOne({ userId }) || new SailProgress({ userId });
        let progress = await Progress.findOne({ userId }) || new Progress({ userId, team: [], cards: new Map() });

        // Normalize cards map for consistent access
        if (!progress.cards || typeof progress.cards.get !== 'function') {
          progress.cards = new Map(Object.entries(progress.cards || {}));
        }

        if (subaction === "sail") {
          // enforce cooldown after a defeat: 5 minutes
          if (sailProgress && sailProgress.lastSail) {
            try {
              const last = new Date(sailProgress.lastSail).getTime();
              const diff = Date.now() - last;
              const cooldown = 5 * 60 * 1000;
              if (diff < cooldown) {
                const remaining = Math.ceil((cooldown - diff) / 1000);
                await interaction.reply({ content: `You are on cooldown after defeat. Please wait ${remaining} seconds before sailing again.`, ephemeral: true });
                return;
              }
            } catch (e) { /* ignore parse errors */ }
          }
          // Progress to next episode — use episode definitions and preserve XP awarding
          if (sailProgress.progress === 0) {
            sailProgress.progress = 1;
            const stars = sailProgress.difficulty === 'medium' ? 2 : sailProgress.difficulty === 'hard' ? 3 : 1;
            sailProgress.stars.set('1', stars);
            await sailProgress.save();

            // compute xp amount based on difficulty
            const xpAmount = sailProgress.difficulty === 'hard' ? 30 : sailProgress.difficulty === 'medium' ? 20 : 10;

            // Award XP to user and team cards if not already awarded for this difficulty
            try {
              const ProgressModel = (await import('../models/Progress.js')).default;
              const Balance = (await import('../models/Balance.js')).default;
              const Inventory = (await import('../models/Inventory.js')).default;
              let progressDoc = await ProgressModel.findOne({ userId }) || new ProgressModel({ userId, team: [], cards: new Map() });
              if (!progressDoc.cards || typeof progressDoc.cards.get !== 'function') progressDoc.cards = new Map(Object.entries(progressDoc.cards || {}));
              if (!sailProgress.awardedXp || !sailProgress.awardedXp[sailProgress.difficulty]) {
                progressDoc.userXp = (progressDoc.userXp || 0) + xpAmount;
                let levelsGained = 0;
                while (progressDoc.userXp >= 100) { progressDoc.userXp -= 100; progressDoc.userLevel = (progressDoc.userLevel || 1) + 1; levelsGained++; }
                if (levelsGained > 0) {
                  const bal = await Balance.findOne({ userId }) || new Balance({ userId });
                  const inv = await Inventory.findOne({ userId }) || new Inventory({ userId });
                  let oldLevel = progressDoc.userLevel - levelsGained;
                  for (let lvl = oldLevel + 1; lvl <= progressDoc.userLevel; lvl++) {
                    bal.balance += lvl * 50;
                    const rankIndex = Math.floor((lvl - 1) / 10);
                    const ranks = ['C','B','A','S'];
                    const currentRank = ranks[rankIndex] || 'S';
                    const prevRank = ranks[rankIndex - 1];
                    const chance = (lvl % 10 || 10) * 10;
                    if (Math.random() * 100 < chance) { inv.chests[currentRank] += 1; } else if (prevRank) { inv.chests[prevRank] += 1; }
                  }
                  await bal.save(); await inv.save();
                }
                for (const cardId of progressDoc.team || []) {
                  let entry = progressDoc.cards.get(cardId) || { count:0, xp:0, level:0 };
                  if (!entry.count) entry.count = 1;
                  entry.xp = entry.xp || 0;
                  let totalXp = (entry.xp || 0) + xpAmount; let newLevel = entry.level || 0;
                  while (totalXp >= 100) { totalXp -= 100; newLevel += 1; }
                  entry.xp = totalXp; entry.level = newLevel; progressDoc.cards.set(cardId, entry);
                  progressDoc.markModified && progressDoc.markModified('cards');
                }
                await progressDoc.save();
                sailProgress.awardedXp = sailProgress.awardedXp || {}; sailProgress.awardedXp[sailProgress.difficulty] = true; await sailProgress.save();
              }
            } catch (e) { console.error('Error awarding XP for Episode 1 start:', e); }

            // Send episode 1 embed from episode definitions
            try {
              const epModule = await import('../events/episodes_definitions.js');
              const epDef = (epModule && (epModule.episodes || (epModule.default && epModule.default.episodes))) ? (epModule.episodes || epModule.default.episodes)[1] : null;
              const diffColor = sailProgress.difficulty === 'easy' ? 0x2ecc71 : (sailProgress.difficulty === 'medium' ? 0xf1c40f : 0xe74c3c);
              const embed = new EmbedBuilder().setColor(diffColor).setTitle(epDef ? (epDef.title || "Episode 1") : "I'm Luffy! — Episode 1");
              const desc = epDef && epDef.summary && String(epDef.summary).trim().length > 0 ? epDef.summary : `Luffy is found floating at sea by a cruise ship...`;
              embed.setDescription(desc);
              const img = epDef && epDef.image && String(epDef.image).trim().length > 0 ? epDef.image : 'https://files.catbox.moe/zlda8y.webp';
              embed.setImage(img);
              const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`sail_battle_ep1:${userId}:start`).setLabel("I'm ready!").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`sail:${userId}:map`).setLabel('Map').setStyle(ButtonStyle.Secondary)
              );
              await interaction.update({ embeds: [embed], components: [buttons] });
            } catch (e) { console.error('Failed to load episode definitions for ep1:', e); }
          } else if (sailProgress.progress === 1) {
            // Do not auto-advance to Episode 2 here. Require completing Episode 1 first.
            await interaction.reply({ content: 'You must complete Episode 1 to unlock Episode 2. Use the "I\'m ready!" button on Episode 1 to start the battle.', ephemeral: true });
            return;
          } else {
            await interaction.reply({ content: `Already at Episode ${sailProgress.progress}.`, ephemeral: true });
          }
        } else if (subaction === "map") {
          // Reuse the /map command so the episode Map button shows the same map view
          try {
            const mapCommand = await import('../commands/map.js');
            await mapCommand.execute(interaction);
          } catch (e) {
            console.error('Error invoking map command from sail button:', e && e.message ? e.message : e);
            await interaction.reply({ content: 'Error showing the map.', ephemeral: true });
          }
          return;
        }
      }

      // Handle sail_battle buttons
      if (action === "sail_battle") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        if (subaction === "ready") {
          // Start battle
          const Progress = (await import("../models/Progress.js")).default;
          const progress = await Progress.findOne({ userId });
          if (!progress || !progress.team || progress.team.length === 0) {
            await interaction.reply({ content: "You need a team to sail. Use /team to set your team.", ephemeral: true });
            return;
          }

          // Define enemies for phase 1: Heppoko and Peppoko
          const enemies = [
            { name: 'Heppoko', health: 70, maxHealth: 70, attackRange: [10,15], power: 10 },
            { name: 'Peppoko', health: 70, maxHealth: 70, attackRange: [10,15], power: 10 }
          ];

          // Get difficulty and apply enemy stat boost
          const SailProgress = (await import("../models/SailProgress.js")).default;
          const sailProgress = await SailProgress.findOne({ userId });
          const difficulty = (sailProgress && sailProgress.difficulty) || 'easy';
          const multiplier = difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1;
          enemies.forEach(enemy => {
            enemy.health = roundNearestFive(enemy.health * multiplier);
            enemy.maxHealth = enemy.health;
            enemy.attackRange = [Math.ceil(enemy.attackRange[0] * multiplier), Math.ceil(enemy.attackRange[1] * multiplier)];
            enemy.power = Math.ceil(enemy.power * multiplier);
          });

          const sessionId = `sail_${userId}_${Date.now()}`;
          global.SAIL_SESSIONS = global.SAIL_SESSIONS || new Map();

          // Get user's cards
          const WeaponInventory = (await import('../models/WeaponInventory.js')).default;
          const winv = await WeaponInventory.findOne({ userId });
          const hasBanner = winv && winv.teamBanner === 'alvida_pirates_banner_c_01';
          const { computeTeamBoosts } = await import("../lib/boosts.js");
          const { getCardById } = await import("../cards.js");

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

            // Apply banner passive boost
            const bannerSignature = ['Alvida_c_01', 'heppoko_c_01', 'Peppoko_c_01', 'Poppoko_c_01', 'koby_c_01'];
            if (hasBanner && bannerSignature.includes(cardId)) {
              attackMin = Math.round(attackMin * 1.05);
              attackMax = Math.round(attackMax * 1.05);
              power = Math.round(power * 1.05);
              health = Math.round(health * 1.05);
            }

            let scaled = { attackRange: [Math.round(attackMin), Math.round(attackMax)], power: Math.round(power) };
            const hakiApplied = applyHakiStatBoosts(scaled, card, progress);
            scaled = hakiApplied.scaled;
            const finalPower = roundNearestFive(Math.round(scaled.power));
            const finalAttackMin = roundNearestFive(Math.round(scaled.attackRange[0] || 0));
            const finalAttackMax = roundNearestFive(Math.round(scaled.attackRange[1] || 0));
            const finalHealth = roundNearestFive(Math.round(health * (hakiApplied.haki.armament.multiplier || 1)));
            if (special && special.range) special.range = roundRangeToFive([Math.round(special.range[0] || 0), Math.round(special.range[1] || 0)]);

            // Use haki info returned from applyHakiStatBoosts so per-owner stars are present
            const hakiFinal = hakiApplied.haki || parseHaki(card);
            return { cardId, card, scaled: { attackRange: [finalAttackMin, finalAttackMax], specialAttack: special, power: finalPower }, health: finalHealth, maxHealth: finalHealth, level, stamina: 3, usedSpecial: false, attackedLastTurn: false, haki: hakiFinal, dodgeChance: (hakiFinal.observation.stars || 0) * 0.05 };
          });

          global.SAIL_SESSIONS.set(sessionId, {
            userId,
            user: interaction.user,
            cards: p1Cards,
            lifeIndex: 0,
            enemies,
            phase: 1,
            sessionId,
            channelId: interaction.channel.id,
            msgId: null,
            difficulty
          });

          await startSailTurn(sessionId, interaction.channel);
        }
      }

      // Handle sail_battle_ep2 buttons
      if (action === "sail_battle_ep2") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", flags: MessageFlags.Ephemeral });
          return;
        }

        if (subaction === "start") {
          // Start Episode 2: Zoro choice
          const embed = new EmbedBuilder()
            .setColor('Blue')
            .setDescription(`You encounter infamous pirate hunter Zoro, help him ?\n\n**If yes:**\nObtain 1x Roronoa Zoro card\nMove to stage 2\n-1 Karma\n\n**If no:**\nMove to stage 2\n Extra Secret stage\n+1 Karma`)
            .setImage('https://files.catbox.moe/y6pah3.webp');

          const buttons = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`sail_ep2_choice:${userId}:yes`)
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`sail_ep2_choice:${userId}:no`)
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
            );

          await interaction.update({ embeds: [embed], components: [buttons] });
          try { console.log('sail_battle_ep2:start shown to', interaction.user.id); } catch (e) {}
        }
      }

      // Handle sail_battle_ep1 buttons
      if (action === "sail_battle_ep1") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        if (subaction === "start") {
          try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) {}
          try {
            console.log('Calling startEpisode for ep1 for', userId);
            const sessionId = await startEpisode(userId, 1, interaction);
            if (sessionId) await startSailTurn(sessionId, interaction.channel);
          } catch (e) {
            console.error('Failed to start Episode1:', e && e.message ? e.message : e);
            try { await interaction.followUp({ content: 'Error starting Episode 1 battle.', ephemeral: true }); } catch (err) {}
          }
        }
      }

      // Handle sail_battle_ep3 buttons
      if (action === "sail_battle_ep3") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        if (subaction === "start") {
          const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle("**Morgan vs. Luffy! Who's This Mysterious Beautiful Young Girl? - Episode 3**")
            .setDescription(`Luffy and Zoro battle and defeat Morgan, Helmeppo and the Marines. Koby parts ways with Luffy to join the Marines, and Zoro joins Luffy's crew as a permanent crew member.\n\n**Possible rewards:**\n250 - 500 beli\n1 - 2 C chest\n1 B chest (Hard mode exclusive)\n1x Axe-hand Morgan card (Hard mode exclusive)`)
            .setImage('https://files.catbox.moe/8os33p.webp');

          const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`sail_battle_ep3:${userId}:ready`).setLabel("I'm ready!").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`sail:${userId}:map`).setLabel('Map').setStyle(ButtonStyle.Secondary)
          );

          await interaction.update({ embeds: [embed], components: [buttons] });
        }

        if (subaction === 'ready') {
          try {
            console.log('Calling startEpisode3Stage2 for', userId);
            await startEpisode3Stage2(userId, interaction);
          } catch (e) {
            console.error('Failed to start Episode3 Stage2:', e && e.message ? e.message : e);
            try { await interaction.followUp({ content: 'Error starting Episode 3 battle.', ephemeral: true }); } catch (err) {}
          }
        }
      }

      if (action === "sail_battle_ep4") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        if (subaction === "start") {
          // Acknowledge and start Episode 4 immediately (skip redundant intermediate embed)
          try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) {}
          try {
            console.log('Calling startEpisode4Stage2 for', userId);
            await startEpisode4Stage2(userId, interaction);
          } catch (e) {
            console.error('Failed to start Episode4 Stage2:', e && e.message ? e.message : e);
            try { await interaction.followUp({ content: 'Error starting Episode 4 battle.', ephemeral: true }); } catch (err) {}
          }
        }
      }

      if (action === "sail_battle_ep5") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        if (subaction === "start") {
          try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) {}
          try {
            console.log('Calling startEpisode5Stage2 for', userId);
            await startEpisode5Stage2(userId, interaction);
          } catch (e) {
            console.error('Failed to start Episode5 Stage2:', e && e.message ? e.message : e);
            try { await interaction.followUp({ content: 'Error starting Episode 5 battle.', ephemeral: true }); } catch (err) {}
          }
        }
      }

      if (action === "sail_battle_ep6") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        if (subaction === "start") {
          try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) {}
          try {
            console.log('Calling startEpisode6Stage2 for', userId);
            await startEpisode6Stage2(userId, interaction);
          } catch (e) {
            console.error('Failed to start Episode6 Stage2:', e && e.message ? e.message : e);
            try { await interaction.followUp({ content: 'Error starting Episode 6 battle.', ephemeral: true }); } catch (err) {}
          }
        }
      }

      // Handle sail_battle_ep7 buttons
      if (action === "sail_battle_ep7") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        if (subaction === "start") {
          try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) {}
          try {
            console.log('Calling startEpisode for ep7 for', userId);
            const sessionId = await startEpisode(userId, 7, interaction);
            if (sessionId) await startSailTurn(sessionId, interaction.channel);
          } catch (e) {
            console.error('Failed to start Episode7 Stage2:', e && e.message ? e.message : e);
            try { await interaction.followUp({ content: 'Error starting Episode 7 battle.', ephemeral: true }); } catch (err) {}
          }
        }
      }

      // Handle sail_battle_ep8 buttons
      if (action === "sail_battle_ep8") {
        const userId = ownerId;
        const subaction = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        if (subaction === "start") {
          try { if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate(); } catch (e) {}
          try {
            console.log('Calling startEpisode for ep8 for', userId);
            const sessionId = await startEpisode(userId, 8, interaction);
            if (sessionId) await startSailTurn(sessionId, interaction.channel);
          } catch (e) {
            console.error('Failed to start Episode8 Stage2:', e && e.message ? e.message : e);
            try { await interaction.followUp({ content: 'Error starting Episode 8 battle.', ephemeral: true }); } catch (err) {}
          }
        }
      }

      // Handle map navigation buttons (map_nav:back|next:<userId>)
      if (action === 'map_nav') {
        const sub = parts[2]; // back or next
        const userId = ownerId;
        if (interaction.user.id !== userId) return interaction.reply({ content: 'Only the original requester can use these buttons.', ephemeral: true });

        const SailProgress = (await import('../models/SailProgress.js')).default;
        const sailProgress = await SailProgress.findOne({ userId }) || new SailProgress({ userId });
        const progress = sailProgress.progress || 0;

        const islands = [
          { name: 'Goat Island', start: 1, end: 1 },
          { name: 'Shells Town', start: 2, end: 3 },
          { name: 'Orange Town', start: 4, end: 8 },
          { name: 'Syrup Village', start: 9, end: 18 },
          { name: 'Baratie', start: 19, end: 30 },
          { name: 'Arlong Park', start: 31, end: 44 },
          { name: 'Loguetown', start: 45, end: 53 },
          { name: 'Warship Island', start: 54, end: 61, excludeFromEastBlue: true }
        ];

        const getStars = (ep) => { try { return sailProgress.stars.get(String(ep)) || 0; } catch (e) { return 0; } };

        // compute East Blue totals (exclude warship) and split into 2 pages
        const eastBlueIslands = islands.filter(isl => !isl.excludeFromEastBlue);
        let eastBlueTotal = 0; let eastBlueMax = 0;
        for (const isl of eastBlueIslands) {
          const count = isl.end - isl.start + 1; eastBlueMax += count * 3;
          for (let e = isl.start; e <= isl.end; e++) eastBlueTotal += getStars(e);
        }
        const filledEast = eastBlueMax === 0 ? 0 : Math.floor((eastBlueTotal / eastBlueMax) * 8);
        const eastBar = '▰'.repeat(filledEast) + '▱'.repeat(8 - filledEast);

        // split East Blue islands into two pages
        const page = sub === 'next' ? 2 : 1;
        const midPoint = Math.ceil(eastBlueIslands.length / 2);
        const pageIslands = page === 1 ? eastBlueIslands.slice(0, midPoint) : eastBlueIslands.slice(midPoint);

        const fields = [];
        fields.push({ name: 'East Blue saga', value: `[${eastBlueTotal}/${eastBlueMax}]✭`, inline: false });
        fields.push({ name: '\u200b', value: eastBar, inline: false });

        for (const isl of pageIslands) {
          const epCount = isl.end - isl.start + 1;
          let islandStars = 0;
          for (let e = isl.start; e <= isl.end; e++) islandStars += getStars(e);
          const islandMax = epCount * 3;
          const islandFilled = islandMax === 0 ? 0 : Math.floor((islandStars / islandMax) * 8);
          const islandBar = '▰'.repeat(islandFilled) + '▱'.repeat(8 - islandFilled);

          let episodeLines = '';
          for (let e = isl.start; e <= isl.end; e++) {
            const stars = getStars(e);
            let status = '';
            if (e > progress) status = ' ⛓';
            else if (e < progress) status = ` [${stars}/3]✭`;
            episodeLines += `Episode ${e}${status}\n`;
          }

          fields.push({ name: `**${isl.name}** [${islandStars}/${islandMax}]✭`, value: islandBar, inline: false });
          fields.push({ name: '\u200b', value: episodeLines.trim(), inline: false });
        }

        const Embed = EmbedBuilder;
        const embed = new Embed()
          .setTitle('World Map')
          .setDescription(`View your progress — page ${page}/${2}`)
          .setThumbnail('https://files.catbox.moe/e4w287.webp')
          .addFields(fields)
          .setFooter({ text: `page ${page}/2` });

        // update buttons to allow toggling
        const backBtn = new ButtonBuilder().setCustomId(`map_nav:back:${userId}`).setLabel('Back').setStyle(ButtonStyle.Secondary).setDisabled(page === 1);
        const nextBtn = new ButtonBuilder().setCustomId(`map_nav:next:${userId}`).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === 2);
        const row = new ActionRowBuilder().addComponents(backBtn, nextBtn);

        await interaction.update({ embeds: [embed], components: [row] });
        return;
      }

      // Handle sail_ep2_choice buttons
      if (action === "sail_ep2_choice") {
        const userId = ownerId;
        const choice = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", flags: MessageFlags.Ephemeral });
          return;
        }

        // Acknowledge the button immediately to avoid "interaction failed"
        try { await interaction.deferUpdate(); } catch (e) { /* ignore */ }

        try { console.log('sail_ep2_choice pressed by', interaction.user.id, 'owner', userId, 'choice', choice); } catch (e) {}

        const Progress = (await import("../models/Progress.js")).default;
        const progress = await Progress.findOne({ userId });

        if (choice === "yes") {
          // Help Zoro: get Zoro card, -1 karma, move to stage 2
          progress.karma = (progress.karma || 0) - 1;
          await progress.save();

          // Add Zoro card to inventory (use canonical card id)
          const Inventory = (await import("../models/Inventory.js")).default;
          const inventory = await Inventory.findOne({ userId }) || new Inventory({ userId });
          inventory.cards = inventory.cards || {};
          inventory.cards['roronoazoro_c_01'] = (inventory.cards['roronoazoro_c_01'] || 0) + 1;
          await inventory.save();

          // Start Stage 2 battle
          try {
            console.log('Calling startEpisode2Stage2 (yes) for', userId);
            await startEpisode2Stage2(userId, interaction, true);
          } catch (e) {
            console.error('Failed to start Episode2 Stage2 (yes):', e && e.message ? e.message : e);
            try { await interaction.followUp({ content: 'Error starting Episode 2 battle.', ephemeral: true }); } catch (err) {}
          }
        } else {
          // Don't help Zoro: +1 karma, schedule final Zoro encounter at the end
          progress.karma = (progress.karma || 0) + 1;
          await progress.save();

          // Always proceed to stage 2; final Zoro will appear after Helmeppo and Marines
          try {
            console.log('Calling startEpisode2Stage2 (no) for', userId);
            await startEpisode2Stage2(userId, interaction, false);
          } catch (e) {
            console.error('Failed to start Episode2 Stage2 (no):', e && e.message ? e.message : e);
            try { await interaction.followUp({ content: 'Error starting Episode 2 battle.', ephemeral: true }); } catch (err) {}
          }
        }
      }

      // Handle accuracy button (sail_accuracy:<sessionId>:stop)
      if (action === 'sail_accuracy') {
        const sessionId = parts[1];
        try { await handleAccuracy(sessionId, interaction); } catch (e) { console.error('Accuracy handler failed:', e); }
        return;
      }

      // Handle sail_ep5_choice buttons
      if (action === "sail_ep5_choice") {
        const userId = ownerId;
        const choice = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", flags: MessageFlags.Ephemeral });
          return;
        }

        try { await interaction.deferUpdate(); } catch (e) {}

        const Progress = (await import("../models/Progress.js")).default;
        const progress = await Progress.findOne({ userId });

        if (choice === "no") {
          // Nami refuses: -1 karma and secret death stage
          progress.karma = (progress.karma || 0) - 1;
          await progress.save();
          // mark session to secretDeath by setting phase=99 and startSailTurn
          const sessionId = `sail_ep5_${userId}_active`;
          // find a matching session by user
          let foundId = null;
          for (const [sid, s] of (global.SAIL_SESSIONS || new Map()).entries()) {
            if (s.userId === userId && s.episode === 5) { foundId = sid; break; }
          }
          if (foundId) {
            const s = global.SAIL_SESSIONS.get(foundId);
            s.phase = 99;
            await startSailTurn(foundId, interaction.channel);
          }
        } else {
          // yes: +1 karma, proceed to fight phase
          progress.karma = (progress.karma || 0) + 1;
          await progress.save();
          let foundId = null;
          for (const [sid, s] of (global.SAIL_SESSIONS || new Map()).entries()) {
            if (s.userId === userId && s.episode === 5) { foundId = sid; break; }
          }
          if (foundId) {
            const s = global.SAIL_SESSIONS.get(foundId);
            s.phase = 4; // spawn fight in startSailTurn
            await startSailTurn(foundId, interaction.channel);
          }
        }
        return;
      }

      // Handle sail_ep6_choice buttons (if needed in future) - placeholder
      if (action === "sail_ep6_choice") {
        const userId = ownerId;
        if (interaction.user.id !== userId) return await interaction.reply({ content: 'Only the original requester can use these buttons.', flags: MessageFlags.Ephemeral });
        try { await interaction.deferUpdate(); } catch (e) {}
        return;
      }

      // Handle sail_selectchar buttons
      if (action === "sail_selectchar") {
        const sessionId = parts[1];
        const cardIndex = parseInt(parts[2]);
        const session = global.SAIL_SESSIONS.get(sessionId);
        if (session && session.turnTimer) { try { clearTimeout(session.turnTimer); session.turnTimer = null; } catch (e) {} }
        if (!session || session.userId !== interaction.user.id) { try { await interaction.followUp({ content: "Session not found or not your turn.", ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: "Session not found or not your turn." }); } catch (err) {} } return; }

        const card = session.cards[cardIndex];
        if (!card || card.health <= 0 || (card.stamina || 3) <= 0) return interaction.reply({ content: "Invalid card.", ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle('Choose Action')
          .setDescription(`Choose an action for ${card.card.name}.`);

        const attackButton = new ButtonBuilder()
          .setCustomId(`sail_chooseaction:${sessionId}:${cardIndex}:attack`)
          .setLabel('Attack')
          .setStyle(ButtonStyle.Primary);

        const specialButton = new ButtonBuilder()
          .setCustomId(`sail_chooseaction:${sessionId}:${cardIndex}:special`)
          .setLabel('Special')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!card.scaled.specialAttack || (card.stamina ?? 3) < 3 || card.usedSpecial);

        const row = new ActionRowBuilder().addComponents(attackButton, specialButton);

        await interaction.update({ embeds: [embed], components: [row] });
      }

      // Handle sail_haki buttons (open haki menu for card)
      if (action === "sail_haki") {
        const sessionId = parts[1];
        const charPart = parts[2];
        const session = global.SAIL_SESSIONS.get(sessionId);
        if (session && session.turnTimer) { try { clearTimeout(session.turnTimer); session.turnTimer = null; } catch (e) {} }
        if (!session || session.userId !== interaction.user.id) { try { await interaction.followUp({ content: "Session not found or not your turn.", ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: "Session not found or not your turn." }); } catch (err) {} } return; }

        // If 'all' button, open selector for which character's haki to use
        if (charPart === 'all') {
          // Defer the interaction to acknowledge it
          try {
            if (!interaction.deferred && !interaction.replied) {
              await interaction.deferUpdate();
            }
            } catch (err) {
              if (err && err.code === 10062) return; // Interaction expired
              try {
                try { await interaction.followUp({ content: "Error processing your action. Please try again.", ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: "Error processing your action. Please try again." }); } catch (err) {} }
              } catch (e) {}
              return;
            }

          const options = session.cards.map((c, idx) => ({ idx, name: c.card.name, has: !!(c.haki && (c.haki.armament.present || c.haki.observation.present || c.haki.conqueror.present)), alive: c.health > 0, playable: !(typeof c.stamina === 'number' && c.stamina <= 0) }));
          const entries = options.filter(o => o.has && o.alive && o.playable);
          if (entries.length === 0) {
            try { await interaction.followUp({ content: 'No playable characters with Haki available.', ephemeral: true }); } catch (e) {}
            return;
          }
          const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = await import('discord.js');
          const embed = new EmbedBuilder().setTitle('Choose Haki Character').setDescription('Select which character to open Haki menu for.').setColor(0x3498db);
          const btns = entries.map(e => new ButtonBuilder().setCustomId(`sail_haki_select:${sessionId}:${e.idx}`).setLabel(e.name).setStyle(ButtonStyle.Primary));
          const selRow = new ActionRowBuilder().addComponents(btns.slice(0,5));
          try { const follow = await interaction.followUp({ embeds: [embed], components: [selRow], ephemeral: true }); } catch (e) {}

          // Collector for selection
          const selFilter = (ii) => ii.user.id === session.userId && ii.customId && ii.customId.startsWith('sail_haki_select');
          const selCollector = interaction.channel.createMessageComponentCollector({ filter: selFilter, time: 20000 });
          selCollector.on('collect', async ii => {
            try {
              if (!ii.deferred && !ii.replied) {
                await ii.deferUpdate();
              }
            } catch (err) {
              if (err && err.code === 10062) return; // Interaction expired
              try {
                try { await ii.followUp({ content: "Error processing your action. Please try again.", ephemeral: true }); } catch (e) { try { await ii.channel.send({ content: "Error processing your action. Please try again." }); } catch (err) {} }
              } catch (e) {}
              return;
            }
            const selParts = ii.customId.split(':');
            const selIdx = parseInt(selParts[2]);
            try {
              await handleSailHakiMenu(sessionId, selIdx, session, ii);
            } catch (err) {
              console.error('handleSailHakiMenu error', err);
              try { await ii.followUp({ content: 'An error occurred opening Haki menu.', ephemeral: true }); } catch (e) {}
            }
            selCollector.stop();
          });
          return;
        }
        // otherwise older per-character id (fallback)
        try {
          await handleSailHakiMenu(sessionId, parseInt(charPart), session, interaction);
        } catch (err) {
          console.error('handleSailHakiMenu error', err);
          try { await interaction.followUp({ content: 'An error occurred opening Haki menu.', ephemeral: true }); } catch (e) {}
        }
        return;
      }

      // Handle sail_chooseaction buttons
      if (action === "sail_chooseaction") {
        const sessionId = parts[1];
        const cardIndex = parseInt(parts[2]);
        const actionType = parts[3];
        const session = global.SAIL_SESSIONS.get(sessionId);
        if (session && session.turnTimer) { try { clearTimeout(session.turnTimer); session.turnTimer = null; } catch (e) {} }
        if (!session || session.userId !== interaction.user.id) return;
        const card = session.cards[cardIndex];
        if (!card) return;
        if (actionType === 'special') {
          if (!card.scaled.specialAttack || card.usedSpecial || (card.stamina ?? 3) < 3) return;
        }
        const aliveEnemies = session.enemies.filter(e => e.health > 0);
        if (aliveEnemies.length === 1) {
          await performSailAttack(session, cardIndex, aliveEnemies[0], actionType, interaction);
        } else {
          const embed = new EmbedBuilder()
            .setTitle('Select Target')
            .setDescription(`Choose a target for ${card.card.name}'s ${actionType}.`);
          const targetButtons = aliveEnemies.map((e, idx) =>
            new ButtonBuilder()
              .setCustomId(`sail_selecttarget:${sessionId}:${cardIndex}:${actionType}:${session.enemies.indexOf(e)}`)
              .setLabel(e.name)
              .setStyle(ButtonStyle.Primary)
          );
          const row = new ActionRowBuilder().addComponents(targetButtons);
          try {
            await interaction.update({ embeds: [embed], components: [row] });
          } catch (e) {
            if (e && e.code === 10062) return; // Interaction expired
            try {
              await interaction.reply({ content: "Error updating targets. Please try again.", ephemeral: true });
            } catch (err) {}
          }
        }
      }

      // Handle sail_selecttarget buttons
      if (action === "sail_selecttarget") {
        const sessionId = parts[1];
        const cardIndex = parseInt(parts[2]);
        const actionType = parts[3];
        const enemyIndex = parseInt(parts[4]);
        const session = global.SAIL_SESSIONS.get(sessionId);
        if (session && session.turnTimer) { try { clearTimeout(session.turnTimer); session.turnTimer = null; } catch (e) {} }
        if (!session || session.userId !== interaction.user.id) return;
        const enemy = session.enemies[enemyIndex];
        if (!enemy || enemy.health <= 0) return;
        await performSailAttack(session, cardIndex, enemy, actionType, interaction);
      }

      // Handle sail_heal buttons
      if (action === "sail_heal") {
        const sessionId = parts[1];
        const session = global.SAIL_SESSIONS.get(sessionId);
        if (session && session.turnTimer) { try { clearTimeout(session.turnTimer); session.turnTimer = null; } catch (e) {} }
        if (!session || session.userId !== interaction.user.id) return;
        const Inventory = (await import("../models/Inventory.js")).default;
        const inventory = await Inventory.findOne({ userId: session.userId }) || new Inventory({ userId: session.userId });
        const healingItems = ['meat', 'fish', 'sake', 'sea king meat'];
        const available = healingItems.filter(item => (inventory.items.get(item) || 0) > 0);
        if (available.length === 0) return interaction.reply({ content: 'No healing items available.', ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('Select Healing Item')
          .setDescription('Choose an item to use.');
        const itemButtons = available.map(item =>
          new ButtonBuilder()
            .setCustomId(`sail_heal_item:${sessionId}:${item}`)
            .setLabel(item)
            .setStyle(ButtonStyle.Primary)
        );
        const row = new ActionRowBuilder().addComponents(itemButtons);
        try {
          await interaction.update({ embeds: [embed], components: [row] });
        } catch (e) {
          if (e && e.code === 10062) return; // Interaction expired
          try {
            await interaction.reply({ content: "Error updating items. Please try again.", ephemeral: true });
          } catch (err) {}
        }
      }

      // Handle sail_heal_item buttons
      if (action === "sail_heal_item") {
        const sessionId = parts[1];
        const item = parts[2];
        const session = global.SAIL_SESSIONS.get(sessionId);
        if (session && session.turnTimer) { try { clearTimeout(session.turnTimer); session.turnTimer = null; } catch (e) {} }
        if (!session || session.userId !== interaction.user.id) return;
        const embed = new EmbedBuilder()
          .setTitle('Select Card to Heal')
          .setDescription(`Using ${item}. Choose a card to heal.`);
        const healButtons = session.cards.map((c, idx) =>
          new ButtonBuilder()
            .setCustomId(`sail_heal_card:${sessionId}:${item}:${idx}`)
            .setLabel(c.card.name)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(c.health <= 0)
        );
        const row = new ActionRowBuilder().addComponents(healButtons);
        try {
          await interaction.update({ embeds: [embed], components: [row] });
        } catch (e) {
          if (e && e.code === 10062) return; // Interaction expired
          try {
            await interaction.reply({ content: "Error updating cards. Please try again.", ephemeral: true });
          } catch (err) {}
        }
      }

      // Handle sail_haki_use actions
      if (action === 'sail_haki_use') {
        const sessionId = parts[1];
        const cardIndex = parseInt(parts[2]);
        const ability = parts[3];
        const session = global.SAIL_SESSIONS.get(sessionId);
        if (session && session.turnTimer) { try { clearTimeout(session.turnTimer); session.turnTimer = null; } catch (e) {} }
        if (!session || session.userId !== interaction.user.id) { try { await interaction.followUp({ content: 'Session not found or not your turn.', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Session not found or not your turn.' }); } catch (err) {} } return; }
        const card = session.cards[cardIndex];
        if (!card) { try { await interaction.followUp({ content: 'Invalid card', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Invalid card' }); } catch (err) {} } return; }

        // perform abilities (similar to duel)
        if (ability === 'ryou') {
          if ((card.stamina || 0) < 2) { try { await interaction.followUp({ content: 'Not enough stamina for Ryou.', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Not enough stamina for Ryou.' }); } catch (err) {} } return; }
          card.stamina = Math.max(0, card.stamina - 2);
          session.ryou = session.ryou || {};
          session.ryou[session.userId] = { cardIdx: cardIndex, remaining: 1 };
          try { await interaction.followUp({ content: `${interaction.user} used Ryou! Next incoming attack will redirect to ${card.card.name} and deal no damage.`, ephemeral: false }); } catch (e) { try { await interaction.channel.send({ content: `${interaction.user} used Ryou! Next incoming attack will redirect to ${card.card.name} and deal no damage.` }); } catch (err) {} }
          try { await startSailTurn(sessionId, interaction.channel); } catch (e) {}
          return;
        }
        if (ability === 'futuresight') {
          if ((card.stamina || 0) < 1) { try { await interaction.followUp({ content: 'Not enough stamina for Future Sight.', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Not enough stamina for Future Sight.' }); } catch (err) {} } return; }
          card.stamina = Math.max(0, card.stamina - 1);
          card.nextAttackGuaranteedDodge = true;
          try { await interaction.followUp({ content: `${interaction.user} used Future Sight on ${card.card.name}! It will dodge the next incoming attack.`, ephemeral: false }); } catch (e) { try { await interaction.channel.send({ content: `${interaction.user} used Future Sight on ${card.card.name}! It will dodge the next incoming attack.` }); } catch (err) {} }
          try { await startSailTurn(sessionId, interaction.channel); } catch (e) {}
          return;
        }
        if (ability === 'conqueror') {
          if ((card.stamina || 0) < 2) { try { await interaction.followUp({ content: 'Not enough stamina for Conqueror.', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Not enough stamina for Conqueror.' }); } catch (err) {} } return; }
          card.stamina = Math.max(0, card.stamina - 2);
          const stars = (card.haki && card.haki.conqueror && card.haki.conqueror.stars) || 0;
          const threshold = 100 + (stars * 10);
          const knocked = [];
          for (const e of session.enemies) {
            if (e.health > 0 && e.health <= threshold) { e.health = 0; knocked.push(e.name); }
          }
          try { await interaction.followUp({ content: `Conqueror used! Knocked out: ${knocked.length ? knocked.join(', ') : 'None'}`, ephemeral: false }); } catch (e) { try { await interaction.channel.send({ content: `Conqueror used! Knocked out: ${knocked.length ? knocked.join(', ') : 'None'}` }); } catch (err) {} }
          try { await startSailTurn(sessionId, interaction.channel); } catch (e) {}
          return;
        }
        if (ability === 'conq_aoe') {
          if ((card.stamina || 0) < 2) { try { await interaction.followUp({ content: 'Not enough stamina for Conqueror AoE.', ephemeral: true }); } catch (e) { try { await interaction.channel.send({ content: 'Not enough stamina for Conqueror AoE.' }); } catch (err) {} } return; }
          card.stamina = Math.max(0, card.stamina - 2);
          const stars = (card.haki && card.haki.conqueror && card.haki.conqueror.stars) || 0;
          const dmgPct = stars * 0.10;
          const dmg = Math.round(card.maxHealth * dmgPct);
          for (const e of session.enemies) {
            if (e.health > 0) {
              e.health = Math.max(0, e.health - dmg);
            }
          }
          try { await interaction.followUp({ content: `${interaction.user} used Advanced Conqueror AoE for ${dmg} damage to all enemies!`, ephemeral: false }); } catch (e) { try { await interaction.channel.send({ content: `${interaction.user} used Advanced Conqueror AoE for ${dmg} damage to all enemies!` }); } catch (err) {} }
          try { await startSailTurn(sessionId, interaction.channel); } catch (e) {}
          return;
        }
      }

      // Handle sail_heal_card buttons
      if (action === "sail_heal_card") {
        const sessionId = parts[1];
        const item = parts[2];
        const cardIndex = parseInt(parts[3]);
        const session = global.SAIL_SESSIONS.get(sessionId);
        if (session && session.turnTimer) { try { clearTimeout(session.turnTimer); session.turnTimer = null; } catch (e) {} }
        if (!session || session.userId !== interaction.user.id) return;
        const card = session.cards[cardIndex];
        if (!card || card.health <= 0) return;
        const isSupport = String(card.card.type).toLowerCase() === 'support';
        let healPercent;
        if (item === 'meat') healPercent = isSupport ? 0.05 : 0.1;
        else if (item === 'fish') healPercent = isSupport ? 0.1 : 0.05;
        else if (item === 'sake') healPercent = isSupport ? 0.2 : 0.05;
        else if (item === 'sea king meat') healPercent = isSupport ? 0.05 : 0.2;
        const healAmount = Math.floor(card.maxHealth * healPercent);
        const actualHeal = Math.min(healAmount, card.maxHealth - card.health);
        card.health += actualHeal;
        session.cards.forEach((c, idx) => {
          if (idx !== cardIndex && c.health > 0) {
            c.stamina = Math.max(0, (c.stamina ?? 3) - 1);
          }
        });
        const Inventory = (await import("../models/Inventory.js")).default;
        const inventory = await Inventory.findOne({ userId: session.userId });
        if (inventory) {
          inventory.items.set(item, (inventory.items.get(item) || 0) - 1);
          await inventory.save();
        }
        const healEmbed = new EmbedBuilder()
          .setTitle('Heal Result')
          .setDescription(`Healed ${card.card.name} for ${actualHeal} HP! Current HP: ${card.health}/${card.maxHealth}`);
        try {
          await interaction.update({ embeds: [healEmbed], components: [] });
        } catch (e) {
          if (e && e.code === 10062) return; // Interaction expired
          try {
            await interaction.reply({ content: "Error applying heal. Please try again.", ephemeral: true });
          } catch (err) {}
        }
        setTimeout(async () => {
          await enemyAttack(session, interaction.channel);
          await startSailTurn(sessionId, interaction.channel);
        }, 2000);
      }

      // Handle quest view/claim buttons
      if (action === "quest_view") {
        // customId format from command: quest_view:<type>:<userId>
        const questType = parts[1]; // daily or weekly
        const userId = parts[2];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        const Quest = (await import("../models/Quest.js")).default;
        let questDoc = await Quest.getCurrentQuests(questType);
        
        if (!questDoc.quests.length) {
          const { generateQuests } = await import("../lib/quests.js");
          questDoc.quests = generateQuests(questType);
          await questDoc.save();
        }

        const questEmbed = await (await import("../commands/quests.js")).buildQuestEmbed(questDoc, interaction.user);

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`quest_view:daily:${userId}`)
              .setLabel("Daily")
              .setStyle(questType === "daily" ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`quest_view:weekly:${userId}`)
              .setLabel("Weekly")
              .setStyle(questType === "weekly" ? ButtonStyle.Primary : ButtonStyle.Secondary)
          );

        const claimRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`quest_claim:${userId}`)
              .setLabel("Claim Completed")
              .setStyle(ButtonStyle.Success)
          );

        await interaction.update({
          embeds: [questEmbed],
          components: [row, claimRow]
        });
        return;
      }

      if (action === "quest_claim") {
        const userId = parts[1];
        
        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        const Quest = (await import("../models/Quest.js")).default;
        const Balance = (await import("../models/Balance.js")).default;
        const { calculateQuestRewards } = await import("../lib/quests.js");

        // Get both daily and weekly quests
        const [dailyQuests, weeklyQuests] = await Promise.all([
          Quest.getCurrentQuests("daily"),
          Quest.getCurrentQuests("weekly")
        ]);

        let claimed = 0;
        let totalMoney = 0;
        let totalChests = [];
        let totalResetTokens = 0;

        // Process both quest sets
        for (const questDoc of [dailyQuests, weeklyQuests]) {
          const userProgress = questDoc.getUserProgress(userId);
          
          for (const quest of questDoc.quests) {
            const progress = userProgress.get(quest.id);
            if (!progress || progress.claimed || progress.current < quest.target) continue;

            // Calculate rewards
            const rewards = calculateQuestRewards(quest);
            totalMoney += rewards.money;
            totalChests.push(...rewards.chests);
            totalResetTokens += rewards.resetTokens;

            // Mark as claimed
            progress.claimed = true;
            userProgress.set(quest.id, progress);
            claimed++;
          }

          if (claimed > 0) {
            questDoc.progress.set(userId, userProgress);
            await questDoc.save();
          }
        }

        if (claimed === 0) {
          await interaction.reply({ 
            content: "You have no completed quests to claim.", 
            ephemeral: true 
          });
          return;
        }

        // Update user's balance, XP and inventory
        let bal = await Balance.findOne({ userId });
        if (!bal) bal = new Balance({ userId, amount: 500, xp: 0, level: 0 });

        bal.amount += totalMoney;
        bal.resetTokens = (bal.resetTokens || 0) + totalResetTokens;
        // Award XP for claiming quests (small amount per claimed quest)
        const XP_PER_QUEST = 5;
        bal.xp = (bal.xp || 0) + (claimed * XP_PER_QUEST);
        while ((bal.xp || 0) >= 100) {
          bal.xp -= 100;
          bal.level = (bal.level || 0) + 1;
        }
        await bal.save();

        // Add quest chests to user's inventory
        if (totalChests.length > 0) {
          const Inventory = (await import("../models/Inventory.js")).default;
          let inv = await Inventory.findOne({ userId });
          if (!inv) inv = new Inventory({ userId, items: {}, chests: { C:0, B:0, A:0, S:0 }, xpBottles: 0 });
          inv.chests = inv.chests || { C:0, B:0, A:0, S:0 };
          for (const c of totalChests) {
            const rank = String(c.rank || "C").toUpperCase();
            const count = parseInt(c.count || 0, 10) || 0;
            inv.chests[rank] = (inv.chests[rank] || 0) + count;
          }
          await inv.save();
        }

        const rewardEmbed = new EmbedBuilder()
          .setTitle("Quests Claimed!")
          .setColor(0xFFFFFF)
          .setDescription(
            `You claimed ${claimed} quest${claimed !== 1 ? 's' : ''}!\n\n` +
            `Rewards:\n` +
            `• ${totalMoney}¥\n` +
            (totalResetTokens > 0 ? `• ${totalResetTokens} Reset Token${totalResetTokens !== 1 ? 's' : ''}\n` : '') +
            (totalChests.length > 0 ? `• ${totalChests.map(c => `${c.count}× ${c.rank} Chest${c.count !== 1 ? 's' : ''}`).join(', ')}\n` : '')
          );

        await interaction.reply({ 
          embeds: [rewardEmbed], 
          ephemeral: true 
        });

        // Refresh the quest display
        const questDoc = interaction.message.embeds[0].title.toLowerCase().includes("daily") ? dailyQuests : weeklyQuests;
        const questEmbed = await (await import("../commands/quests.js")).buildQuestEmbed(questDoc, interaction.user);
        
        const components = interaction.message.components;
        await interaction.message.edit({
          embeds: [questEmbed],
          components
        });
        return;
      }

      // INFO paging: support info_prev/info_next customIds with index
      if (action === "info_prev" || action === "info_next") {
          const rootCardId = parts[2];
          const targetIndex = parseInt(parts[3] || "0", 10) || 0;
          const rootCard = getCardById(rootCardId);
          if (!rootCard) {
            await interaction.reply({ content: "Root card not found.", ephemeral: true });
            return;
          }

          const chain = getEvolutionChain(rootCard);
          const len = chain.length;
          if (len === 0) {
            await interaction.reply({ content: "No evolutions available for this card.", ephemeral: true });
            return;
          }

          const idx = ((targetIndex % len) + len) % len;
          const newCardId = chain[idx];
          const newCard = getCardById(newCardId);
          if (!newCard) {
            await interaction.reply({ content: "Evolution card not found.", ephemeral: true });
            return;
          }

          // fetch progress to check ownership
          const progDoc = await Progress.findOne({ userId: ownerId });
          const cardsMap = progDoc ? (progDoc.cards instanceof Map ? progDoc.cards : new Map(Object.entries(progDoc.cards || {}))) : new Map();
          const ownedEntry = cardsMap.get(newCard.id) || null;

          // build embed using shared builder so layout matches info command
          // Always show the base (unmodified) card embed for navigation —
          // keep user-specific stats separate and reachable via the "👤" button.
          const newEmbed = buildCardEmbed(newCard, ownedEntry, interaction.user);
          if (!ownedEntry || (ownedEntry.count || 0) <= 0) {
            newEmbed.setColor(0x2f3136);

            // Check if this card is a lower version of an upgrade owned by user
            // Only block when the user does NOT own the requested card
            const chainForPag = getEvolutionChain(newCard);
            let ownedHigherIdForPag = null;
            for (let i = chainForPag.indexOf(newCard.id) + 1; i < chainForPag.length; i++) {
              const higherCardId = chainForPag[i];
              const higherEntry = cardsMap.get(higherCardId);
              if (higherEntry && (higherEntry.count || 0) > 0) {
                ownedHigherIdForPag = higherCardId;
                break;
              }
            }
            if ((!ownedEntry || (ownedEntry.count || 0) <= 0) && ownedHigherIdForPag) {
              const ownedHigher = getCardById(ownedHigherIdForPag);
              await interaction.reply({ content: `You own a higher version (${(ownedHigher && ownedHigher.name) || 'upgraded version'}) and cannot view this version.`, ephemeral: true });
              return;
            }
          }

          // compute prev/next indices for this chain and attach buttons
          const prevIndex = (idx - 1 + len) % len;
          const nextIndex = (idx + 1) % len;
          const prevIdNew = `info_prev:${ownerId}:${rootCard.id}:${prevIndex}`;
          const nextIdNew = `info_next:${ownerId}:${rootCard.id}:${nextIndex}`;

          const btns = [
            new ButtonBuilder().setCustomId(prevIdNew).setLabel("Previous mastery").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(nextIdNew).setLabel("Next mastery").setStyle(ButtonStyle.Primary)
          ];

          // if the user owns this card, add the "Your stats" primary button
          if (ownedEntry && (ownedEntry.count || 0) > 0) {
            btns.push(
              new ButtonBuilder()
                .setCustomId(`info_userstats:${ownerId}:${newCard.id}`)
                .setLabel("👤")
                .setStyle(ButtonStyle.Secondary)
            );
          }

          const row = new ActionRowBuilder().addComponents(...btns);

          await interaction.update({ embeds: [newEmbed], components: [row] });
          return;
        }

      // SHOP pagination: shop_prev:<ownerId>:<idx> and shop_next:<ownerId>:<idx>
      if (action === "shop_prev" || action === "shop_next") {
        try {
          const { pages, buildEmbed, buildRow } = await import("../lib/shopPages.js");
          const rawIdx = parseInt(parts[2] || "0", 10) || 0;
          let newIndex = rawIdx;
          if (action === "shop_prev") newIndex = Math.max(0, rawIdx - 1);
          if (action === "shop_next") newIndex = Math.min(pages.length - 1, rawIdx + 1);

          const embed = buildEmbed(pages[newIndex]);
          const row = buildRow(ownerId, newIndex);

          await interaction.update({ embeds: [embed], components: [row] });
        } catch (e) {
          console.error('shop pagination handler error:', e && e.message ? e.message : e);
          try { await interaction.reply({ content: 'Error handling shop pagination.', ephemeral: true }); } catch (er) {}
        }
        return;
      }

      // INFO user stats: info_userstats:<userId>:<cardId>
      if (action === "info_userstats") {
        const cardId = parts[2];
        const userId = parts[1];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        const card = getCardById(cardId);
        if (!card) {
          await interaction.reply({ content: "Card not found.", ephemeral: true });
          return;
        }

        // fetch progress to check ownership
        const progDoc = await Progress.findOne({ userId });
        
        const cardsMap = progDoc ? (progDoc.cards instanceof Map ? progDoc.cards : new Map(Object.entries(progDoc.cards || {}))) : new Map();
        let ownedEntry = null;
        
        // Try to find the card in user's collection
        if (cardsMap instanceof Map) {
          ownedEntry = cardsMap.get(card.id) || cardsMap.get(String(card.id).toLowerCase()) || null;
          if (!ownedEntry) {
            for (const [k, v] of cardsMap.entries()) {
              if (String(k).toLowerCase() === String(card.id).toLowerCase()) {
                ownedEntry = v; 
                break;
              }
            }
          }
        }
        

        // Check if user owns the card
        if (!ownedEntry || (ownedEntry.count || 0) <= 0) {
          await interaction.reply({ content: "You don't own this card.", ephemeral: true });
          return;
        }

        // Get equipped weapon if any
        let equippedWeapon = null;
        const WeaponInventory = (await import("../models/WeaponInventory.js")).default;
        const winv = await WeaponInventory.findOne({ userId });
        if (winv && winv.weapons) {
          if (winv.weapons instanceof Map) {
            for (const [wid, w] of winv.weapons.entries()) {
              if (w.equippedTo === card.id) {
                const wcard = getCardById(wid);
                if (wcard) {
                  equippedWeapon = { id: wid, card: wcard, ...w };
                }
                break;
              }
            }
          } else {
            for (const [wid, w] of Object.entries(winv.weapons || {})) {
              if (w && w.equippedTo === card.id) {
                const wcard = getCardById(wid);
                if (wcard) {
                  equippedWeapon = { id: wid, card: wcard, ...w };
                }
                break;
              }
            }
          }
        }

        // Apply team boosts if card is in user's team
        if (progDoc && progDoc.team && Array.isArray(progDoc.team) && progDoc.team.includes(cardId)) {
          const { computeTeamBoostsDetailed } = await import("../lib/boosts.js");
          const teamBoostsInfo = computeTeamBoostsDetailed(progDoc.team, cardsMap, winv);
          const totalBoosts = teamBoostsInfo.totals;
          // Apply team boosts to ownedEntry for display
          if (totalBoosts.atk || totalBoosts.hp || totalBoosts.special) {
            ownedEntry = { ...ownedEntry, boost: totalBoosts };
          }
        }

        // Build user card embed with teamBanner for banner boost calculation
        const teamBanner = winv ? winv.teamBanner : null;
        const userEmbed = buildUserCardEmbed(card, ownedEntry, interaction.user, equippedWeapon, teamBanner);
        if (!userEmbed) {
          await interaction.reply({ content: "Unable to build user card stats.", ephemeral: true });
          return;
        }

        // Build buttons: back to base stats and previous/next
        const buttons = [];
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`info_base:${userId}:${card.id}`)
            .setLabel("Base Stats")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [userEmbed], components: [new ActionRowBuilder().addComponents(...buttons)] });
        return;
      }

      // INFO user weapon stats: info_userweapon:<userId>:<weaponId>
      if (action === "info_userweapon") {
        const weaponId = parts[2];
        const userId = parts[1];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        const WeaponInventory = (await import("../models/WeaponInventory.js")).default;
        const winv = await WeaponInventory.findOne({ userId });
        if (!winv) {
          await interaction.reply({ content: "You don't have any weapons.", ephemeral: true });
          return;
        }

        const userWeapon = winv.weapons instanceof Map ? winv.weapons.get(weaponId) : (winv.weapons && winv.weapons[weaponId]);
        if (!userWeapon) {
          await interaction.reply({ content: "You haven't crafted this weapon.", ephemeral: true });
          return;
        }

        const { buildUserWeaponEmbed } = await import("../lib/weaponEmbed.js");
        const weapon = getCardById(weaponId);
        if (!weapon) {
          await interaction.reply({ content: "Weapon not found.", ephemeral: true });
          return;
        }

        // Check if this is a signature weapon equipped to a card and whether the 25% applies
        // The 25% signature boost only applies when the equipped card appears at index > 0
        // in the weapon's `signatureCards` list (i.e. upgrade 2+), not the base form.
        let isSignatureBoosted = false;
        const weaponCard = getCardById(weaponId);
        if (userWeapon.equippedTo && weaponCard && Array.isArray(weaponCard.signatureCards)) {
          const equippedCard = getCardById(userWeapon.equippedTo);
          if (equippedCard) {
            const idx = weaponCard.signatureCards.indexOf(equippedCard.id);
            if (idx > 0) isSignatureBoosted = true;
          }
        }

        const embed = buildUserWeaponEmbed(weapon, userWeapon, interaction.user, isSignatureBoosted);
        if (!embed) {
          await interaction.reply({ content: "Unable to build weapon info.", ephemeral: true });
          return;
        }

        // Back button to base stats for weapon
        const back = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`info_weaponbase:${userId}:${weaponId}`).setLabel("Base Stats").setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({ embeds: [embed], components: [back] });
        return;
      }

      // INFO base stats: info_base:<userId>:<cardId>
      if (action === "info_weaponbase") {
        const weaponId = parts[2];
        const userId = parts[1];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        const { buildWeaponEmbed, buildUserWeaponEmbed } = await import("../lib/weaponEmbed.js");
        const WeaponInventory = (await import("../models/WeaponInventory.js")).default;

        const weapon = getCardById(weaponId);
        if (!weapon) {
          await interaction.reply({ content: "Weapon not found.", ephemeral: true });
          return;
        }

        const embed = buildWeaponEmbed(weapon, interaction.user);

        // Check if user crafted it
        const winv = await WeaponInventory.findOne({ userId });
        const userWeapon = winv ? (winv.weapons instanceof Map ? winv.weapons.get(weaponId) : (winv.weapons && winv.weapons[weaponId])) : null;

        const buttons = [];
        if (userWeapon) {
          buttons.push(new ButtonBuilder().setCustomId(`info_userweapon:${userId}:${weaponId}`).setLabel("👤").setStyle(ButtonStyle.Secondary));
        }
        buttons.push(new ButtonBuilder().setCustomId(`info_weaponbase:${userId}:${weaponId}`).setLabel("Base Stats").setStyle(ButtonStyle.Secondary));

        const components = buttons.length ? [new ActionRowBuilder().addComponents(...buttons)] : [];
        await interaction.update({ embeds: [embed], components });
        return;
      }

      if (action === "info_base") {
        const cardId = parts[2];
        const userId = parts[1];

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        const card = getCardById(cardId);
        if (!card) {
          await interaction.reply({ content: "Card not found.", ephemeral: true });
          return;
        }

        // fetch progress to check ownership
        const progDoc = await Progress.findOne({ userId });
        const cardsMap = progDoc ? (progDoc.cards instanceof Map ? progDoc.cards : new Map(Object.entries(progDoc.cards || {}))) : new Map();
        let ownedEntry = null;
        
        if (cardsMap instanceof Map) {
          ownedEntry = cardsMap.get(card.id) || cardsMap.get(String(card.id).toLowerCase()) || null;
          if (!ownedEntry) {
            for (const [k, v] of cardsMap.entries()) {
              if (String(k).toLowerCase() === String(card.id).toLowerCase()) {
                ownedEntry = v; 
                break;
              }
            }
          }
        }

        // Build base (unmodified) card embed — user-specific stats are shown
        // only when the user presses the "👤" (Your stats) button.
        const baseEmbed = buildCardEmbed(card, ownedEntry, interaction.user);
        if (!ownedEntry || (ownedEntry.count || 0) <= 0) {
          baseEmbed.setColor(0x2f3136);
        }

        // Rebuild evolution chain and get current position
        const chain = getEvolutionChain(card);
        const len = chain.length;
        
        // Build buttons: Previous/Next if multiple evolutions exist, plus User Stats if owned
        const buttons = [];
        if (len > 1) {
          const idx = 0;  // Always back to the first (base) card
          const prevIndex = (idx - 1 + len) % len;
          const nextIndex = (idx + 1) % len;
          const prevIdBase = `info_prev:${userId}:${card.id}:${prevIndex}`;
          const nextIdBase = `info_next:${userId}:${card.id}:${nextIndex}`;
          buttons.push(
            new ButtonBuilder()
              .setCustomId(prevIdBase)
              .setLabel("Previous mastery")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(nextIdBase)
              .setLabel("Next mastery")
              .setStyle(ButtonStyle.Primary)
          );
        }
        
        // Add Your Stats button if owned
        if (ownedEntry && (ownedEntry.count || 0) > 0) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`info_userstats:${userId}:${card.id}`)
              .setLabel("👤")
              .setStyle(ButtonStyle.Secondary)
          );
        }

        const components = buttons.length > 0 ? [new ActionRowBuilder().addComponents(...buttons)] : [];
        await interaction.update({ embeds: [baseEmbed], components });
        return;
      }


      // COLLECTION pagination AND select menu handling
      if (action.startsWith("collection_")) {
        const sortKey = parts[2];
        const pageNum = parseInt(parts[3] || "0", 10) || 0;

        const progDoc = await Progress.findOne({ userId: ownerId });
        if (!progDoc || !progDoc.cards) {
          await interaction.reply({ content: "You have no cards.", ephemeral: true });
          return;
        }

        const cardsMap = progDoc.cards instanceof Map ? progDoc.cards : new Map(Object.entries(progDoc.cards || {}));
        const items = [];
        for (const [cardId, entry] of cardsMap.entries()) {
          const card = getCardById(cardId);
          if (!card) continue;
          items.push({ card, entry });
        }

        function computeScoreLocal(card, entry) {
          const level = entry.level || 0;
          const multiplier = 1 + level * 0.01;
          const power = (card.power || 0) * multiplier;
          const health = (card.health || 0) * multiplier;
          return power + health * 0.2;
        }

        // Normalize sort key aliases (some places use 'level_desc'/'level_asc')
      let mode = sortKey;
      if (mode === 'level_desc' || mode === 'lbtw') mode = 'lbtw';
      if (mode === 'level_asc' || mode === 'lwtb') mode = 'lwtb';

      if (mode === "best") items.sort((a, b) => computeScoreLocal(b.card, b.entry) - computeScoreLocal(a.card, a.entry));
      else if (mode === "wtb") items.sort((a, b) => computeScoreLocal(a.card, a.entry) - computeScoreLocal(b.card, b.entry));
      else if (mode === "lbtw") items.sort((a, b) => (b.entry.level || 0) - (a.entry.level || 0));
      else if (mode === "lwtb") items.sort((a, b) => (a.entry.level || 0) - (b.entry.level || 0));
      else if (mode === "rank") items.sort((a, b) => (((getRankInfo(b.card.rank) && getRankInfo(b.card.rank).value) || 0) - ((getRankInfo(a.card.rank) && getRankInfo(a.card.rank).value) || 0)));
      else if (mode === "nto") items.sort((a, b) => (b.entry.acquiredAt || 0) - (a.entry.acquiredAt || 0));
      else if (mode === "otn") items.sort((a, b) => (a.entry.acquiredAt || 0) - (b.entry.acquiredAt || 0));

        const PAGE_SIZE = 5;
        const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        let newPage = pageNum;
        // If user clicked the info button for this page, show a select menu of the page's characters
        if (action === 'collection_info') {
          const pageItems = items.slice(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE);
          const options = pageItems.map((it, idx) => {
            const card = it.card;
            const _ri = getRankInfo(card.rank);
            return { label: card.name, value: card.id, description: (_ri && _ri.name) || (card.rank || '') };
          });
          const select = new StringSelectMenuBuilder().setCustomId(`collection_select:${ownerId}:${sortKey}:${pageNum}`).setPlaceholder('Select a character').addOptions(options);
          const rows = [new ActionRowBuilder().addComponents(select)];
          await interaction.update({ embeds: [], components: rows });
          return;
        }
        if (action === "collection_prev") newPage = Math.max(0, pageNum - 1);
        if (action === "collection_next") newPage = Math.min(totalPages - 1, pageNum + 1);
        if (action === "collection_back") newPage = pageNum; // simply re-render the same page (back target)

        // Compact page rendering: name + rank only (preserve new collection UI)
        const pageItems = items.slice(newPage * PAGE_SIZE, (newPage + 1) * PAGE_SIZE);
        const lines = pageItems.map((it, idx) => {
          const card = it.card;
          const _r = getRankInfo(card.rank);
          const rank = (_r && _r.name) || (card.rank || "-");
          return `**${newPage * PAGE_SIZE + idx + 1}. ${card.name}** [${rank}]`;
        });

        const embed = new EmbedBuilder().setTitle("Collection").setDescription(lines.join("\n")).setFooter({ text: `Page ${newPage + 1}/${totalPages}` });
        const prevIdNew = `collection_prev:${ownerId}:${sortKey}:${newPage}`;
        const nextIdNew = `collection_next:${ownerId}:${sortKey}:${newPage}`;
        const infoIdNew = `collection_info:${ownerId}:${sortKey}:${newPage}`;
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(prevIdNew).setLabel("Previous").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(nextIdNew).setLabel("Next").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(infoIdNew).setLabel('ⓘ').setStyle(ButtonStyle.Primary)
        );

        // Recreate sort dropdown so it persists across pagination
        const sortMenu = new StringSelectMenuBuilder()
          .setCustomId(`collection_sort:${ownerId}`)
          .setPlaceholder('Sort collection')
          .addOptions([
            { label: 'Best to Worst', value: 'best' },
            { label: 'Worst to Best', value: 'wtb' },
            { label: 'Level High → Low', value: 'lbtw' },
            { label: 'Level Low → High', value: 'lwtb' },
            { label: 'Rank High → Low', value: 'rank' },
            { label: 'Newest → Oldest', value: 'nto' },
            { label: 'Oldest → Newest', value: 'otn' }
          ]);
        const sortRow = new ActionRowBuilder().addComponents(sortMenu);

        await interaction.update({ embeds: [embed], components: [sortRow, row] });
        return;
      }

      // Handle craft_craft buttons
      if (action === "craft_craft") {
        const weaponId = parts[1];
        const userId = ownerId;

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "Only the original requester can use these buttons.", ephemeral: true });
          return;
        }

        const weapon = getWeaponById(weaponId);
        if (!weapon) {
          await interaction.reply({ content: "Weapon not found.", ephemeral: true });
          return;
        }

        const Progress = (await import("../models/Progress.js")).default;
        const progress = await Progress.findOne({ userId });
        if (!progress || !progress.cards || !progress.cards.get(weaponId)) {
          await interaction.reply({ content: "You don't have the blueprint for this weapon.", ephemeral: true });
          return;
        }

        const blueprintEntry = progress.cards.get(weaponId);
        if ((blueprintEntry.count || 0) <= 0) {
          await interaction.reply({ content: "You don't have the blueprint for this weapon.", ephemeral: true });
          return;
        }

        // Check materials
        const Inventory = (await import("../models/Inventory.js")).default;
        const inventory = await Inventory.findOne({ userId }) || new Inventory({ userId, items: new Map(), chests: { C:0, B:0, A:0, S:0 }, xpBottles: 0 });
        const requiredMaterials = weapon.materials || {};
        const missing = [];
        for (const [mat, qty] of Object.entries(requiredMaterials)) {
          const has = inventory.items.get(mat) || 0;
          if (has < qty) missing.push(`${mat} (${has}/${qty})`);
        }
        if (missing.length > 0) {
          await interaction.reply({ content: `Missing materials: ${missing.join(', ')}.`, ephemeral: true });
          return;
        }

        // Deduct materials
        for (const [mat, qty] of Object.entries(requiredMaterials)) {
          inventory.items.set(mat, (inventory.items.get(mat) || 0) - qty);
        }
        await inventory.save();

        // Remove blueprint
        blueprintEntry.count -= 1;
        if (blueprintEntry.count <= 0) {
          progress.cards.delete(weaponId);
        }
        await progress.save();

        // Add weapon to inventory
        const WeaponInventory = (await import("../models/WeaponInventory.js")).default;
        let winv = await WeaponInventory.findOne({ userId }) || new WeaponInventory({ userId, weapons: new Map() });
        if (!winv.weapons) winv.weapons = new Map();
        const existing = winv.weapons.get(weaponId) || { count: 0, equippedTo: null, teamBanner: null };
        existing.count += 1;
        winv.weapons.set(weaponId, existing);
        await winv.save();

        await interaction.reply({ content: `Successfully crafted ${weapon.name}!`, ephemeral: true });
      }
    }
  } catch (err) {
    console.error("Error handling button interaction:", err);
    try {
      if (!interaction.replied) await interaction.reply({ content: "Error handling interaction.", ephemeral: true });
    } catch (e) {}
    return;
  }

  // fallback to chat input commands (slash)
  if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
    const cmdName = (interaction.commandName || '').toLowerCase();
    const command = client.commands.get(cmdName);
    if (!command) {
      console.log('Command not found:', interaction.commandName);
      try { if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Command not found on this bot instance.', ephemeral: true }); } catch (e) {}
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error('Error executing command:', error && error.message ? error.message : error);
      try { if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true }); } catch (e) {}
    }
  }
}

// Episode 2 helper functions

async function startEpisode2SecretStage(userId, interaction) {
  // Secret stage: Fight with Zoro
  const Progress = (await import("../models/Progress.js")).default;
  const progress = await Progress.findOne({ userId });
  if (!progress || !progress.team || progress.team.length === 0) {
    await interaction.reply({ content: "You need a team to sail. Use /team to set your team.", ephemeral: true });
    return;
  }

  // Zoro enemy
  const enemies = [
    { name: 'Roronoa Zoro', health: 210, maxHealth: 210, attackRange: [25, 50], power: 35, specialAttack: { name: "Oni Giri", range: [85, 135] }, usedSpecial: false }
  ];

  const sessionId = `sail_ep2_secret_${userId}_${Date.now()}`;
  global.SAIL_SESSIONS = global.SAIL_SESSIONS || new Map();

  // Get user's cards with boosts
  const WeaponInventory = (await import('../models/WeaponInventory.js')).default;
  const winv = await WeaponInventory.findOne({ userId });
  const hasBanner = winv && winv.teamBanner === 'alvida_pirates_banner_c_01';
  const { computeTeamBoosts } = await import("../lib/boosts.js");
  const { getCardById } = await import("../cards.js");

  const p1TeamBoosts = computeTeamBoosts(progress.team || [], progress.cards || null, winv);
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

    // Apply team boosts
    if (p1TeamBoosts.atk) {
      const atkMul = 1 + (p1TeamBoosts.atk / 100);
      attackMin = Math.round(attackMin * atkMul);
      attackMax = Math.round(attackMax * atkMul);
    }
    if (p1TeamBoosts.hp) {
      const hpMul = 1 + (p1TeamBoosts.hp / 100);
      health = Math.round(health * hpMul);
    }
    if (special && p1TeamBoosts.special) {
      const spMul = 1 + (p1TeamBoosts.special / 100);
      special.range = [Math.round(special.range[0] * spMul), Math.round(special.range[1] * spMul)];
    }

    // Apply banner passive boost
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

  global.SAIL_SESSIONS.set(sessionId, {
    userId,
    user: interaction.user,
    cards: p1Cards,
    lifeIndex: 0,
    enemies,
    phase: 1,
    sessionId,
    channelId: interaction.channel.id,
    msgId: null,
    difficulty: 'hard', // Secret stage is always hard
    episode: 2,
    secretStage: true
  });

  await startSailTurn(sessionId, interaction.channel);
}

const startEpisode2Stage2 = async (userId, interaction, hasZoro) => {
  const Progress = (await import("../models/Progress.js")).default;
  const progress = await Progress.findOne({ userId });
  if (!progress || !progress.team || progress.team.length === 0) {
    try {
      await interaction.followUp({ content: "You need a team to sail. Use /team to set your team.", ephemeral: true });
    } catch (e) {
      await interaction.channel.send({ content: "You need a team to sail. Use /team to set your team." });
    }
    return;
  }

  // Initial enemy for Episode 2 Stage 2: start with Helmeppo (phase-based spawn will add Marines then Zoro)
  const enemies = [ { name: 'Helmeppo', health: 80, maxHealth: 80, attackRange: [12,18], power: 12 } ];

  // Get difficulty and apply enemy stat boost
  const SailProgress = (await import("../models/SailProgress.js")).default;
  const sailProgress = await SailProgress.findOne({ userId });
  const difficulty = (sailProgress && sailProgress.difficulty) || 'easy';
  const multiplier = difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1;
  enemies.forEach(enemy => {
    enemy.health = roundNearestFive(enemy.health * multiplier);
    enemy.maxHealth = enemy.health;
    enemy.attackRange = [Math.ceil(enemy.attackRange[0] * multiplier), Math.ceil(enemy.attackRange[1] * multiplier)];
    enemy.power = Math.ceil(enemy.power * multiplier);
  });

  const sessionId = `sail_ep2_${userId}_${Date.now()}`;
  global.SAIL_SESSIONS = global.SAIL_SESSIONS || new Map();

  // mark last embed sent to avoid immediate duplicate prompts
  const now = Date.now();

  // Get user's cards
  const WeaponInventory = (await import('../models/WeaponInventory.js')).default;
  const winv = await WeaponInventory.findOne({ userId });
  const hasBanner = winv && winv.teamBanner === 'alvida_pirates_banner_c_01';
  const { computeTeamBoosts } = await import("../lib/boosts.js");
  const { getCardById } = await import("../cards.js");

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

    // Apply banner passive boost
    const bannerSignature = ['Alvida_c_01', 'heppoko_c_01', 'Peppoko_c_01', 'Poppoko_c_01', 'koby_c_01'];
    if (hasBanner && bannerSignature.includes(cardId)) {
      attackMin = Math.round(attackMin * 1.05);
      attackMax = Math.round(attackMax * 1.05);
      power = Math.round(power * 1.05);
      health = Math.round(health * 1.05);
    }

    let scaled = { attackRange: [Math.round(attackMin), Math.round(attackMax)], power: Math.round(power) };
    const hakiApplied = applyHakiStatBoosts(scaled, card, progress);
    scaled = hakiApplied.scaled;
    const finalPower = roundNearestFive(Math.round(scaled.power));
    const finalAttackMin = roundNearestFive(Math.round(scaled.attackRange[0] || 0));
    const finalAttackMax = roundNearestFive(Math.round(scaled.attackRange[1] || 0));
    const finalHealth = roundNearestFive(Math.round(health * (hakiApplied.haki.armament.multiplier || 1)));
    if (special && special.range) special.range = roundRangeToFive([Math.round(special.range[0] || 0), Math.round(special.range[1] || 0)]);

    const hakiFinal = hakiApplied.haki || parseHaki(card);
    return { cardId, card, scaled: { attackRange: [finalAttackMin, finalAttackMax], specialAttack: special, power: finalPower }, health: finalHealth, maxHealth: finalHealth, level, stamina: 3, usedSpecial: false, attackedLastTurn: false, haki: hakiFinal, dodgeChance: (hakiFinal.observation.stars || 0) * 0.05 };
  });

  global.SAIL_SESSIONS.set(sessionId, {
    userId,
    user: interaction.user,
    cards: p1Cards,
    lifeIndex: 0,
    enemies,
    phase: 2,
    sessionId,
    channelId: interaction.channel.id,
    msgId: null,
    difficulty,
    episode: 2,
    hasZoro
  });

  // initialize debounce marker so startSailTurn won't immediately send another embed
  await startSailTurn(sessionId, interaction.channel);
};



// Start Episode 3: Morgan vs Luffy
const startEpisode3Stage2 = async (userId, interaction) => {
  const Progress = (await import("../models/Progress.js")).default;
  const progress = await Progress.findOne({ userId });
  if (!progress || !progress.team || progress.team.length === 0) {
    try {
      await interaction.followUp({ content: "You need a team to sail. Use /team to set your team.", ephemeral: true });
    } catch (e) {
      await interaction.channel.send({ content: "You need a team to sail. Use /team to set your team." });
    }
    return;
  }

  // Initial enemies: three Marines (Stage 2), then Axe-hand Morgan
  const enemies = [
    { name: 'Marine', health: 65, maxHealth: 65, attackRange: [6,12], power: 8 },
    { name: 'Marine', health: 65, maxHealth: 65, attackRange: [6,12], power: 8 },
    { name: 'Marine', health: 65, maxHealth: 65, attackRange: [6,12], power: 8 }
  ];

  const SailProgress = (await import("../models/SailProgress.js")).default;
  const sailProgress = await SailProgress.findOne({ userId });
  const difficulty = (sailProgress && sailProgress.difficulty) || 'easy';
  const multiplier = difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1;
  enemies.forEach(enemy => {
    enemy.health = roundNearestFive(enemy.health * multiplier);
    enemy.maxHealth = enemy.health;
    enemy.attackRange = [Math.ceil(enemy.attackRange[0] * multiplier), Math.ceil(enemy.attackRange[1] * multiplier)];
    enemy.power = Math.ceil(enemy.power * multiplier);
  });

  const sessionId = `sail_ep3_${userId}_${Date.now()}`;
  global.SAIL_SESSIONS = global.SAIL_SESSIONS || new Map();

  const WeaponInventory = (await import('../models/WeaponInventory.js')).default;
  const winv = await WeaponInventory.findOne({ userId });
  const hasBanner = winv && winv.teamBanner === 'alvida_pirates_banner_c_01';
  const { computeTeamBoosts } = await import("../lib/boosts.js");
  const { getCardById } = await import("../cards.js");

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
    const hakiApplied = applyHakiStatBoosts(scaled, card, progress);
    scaled = hakiApplied.scaled;
    const finalPower = roundNearestFive(Math.round(scaled.power));
    const finalAttackMin = roundNearestFive(Math.round(scaled.attackRange[0] || 0));
    const finalAttackMax = roundNearestFive(Math.round(scaled.attackRange[1] || 0));
    const finalHealth = roundNearestFive(Math.round(health * (hakiApplied.haki.armament.multiplier || 1)));
    if (special && special.range) special.range = roundRangeToFive([Math.round(special.range[0] || 0), Math.round(special.range[1] || 0)]);

    const hakiFinal = hakiApplied.haki || parseHaki(card);
    return { cardId, card, scaled: { attackRange: [finalAttackMin, finalAttackMax], specialAttack: special, power: finalPower }, health: finalHealth, maxHealth: finalHealth, level, stamina: 3, usedSpecial: false, attackedLastTurn: false, haki: hakiFinal, dodgeChance: (hakiFinal.observation.stars || 0) * 0.05 };
  });

  global.SAIL_SESSIONS.set(sessionId, {
    userId,
    user: interaction.user,
    cards: p1Cards,
    lifeIndex: 0,
    enemies,
    phase: 2,
    sessionId,
    channelId: interaction.channel.id,
    msgId: null,
    difficulty,
    episode: 3,
    hasMorgan: true
  });

  await startSailTurn(sessionId, interaction.channel);
};

export const startEpisode4Stage2 = async (userId, interaction) => {
  const Progress = (await import("../models/Progress.js")).default;
  const progress = await Progress.findOne({ userId });
  if (!progress || !progress.team || progress.team.length === 0) {
    try {
      await interaction.followUp({ content: "You need a team to sail. Use /team to set your team.", ephemeral: true });
    } catch (e) {
      await interaction.channel.send({ content: "You need a team to sail. Use /team to set your team." });
    }
    return;
  }

  // Stage 1 is a narrative embed; do not spawn enemies yet. Stage 2 will spawn Buggy Pirates when the player advances.
  const enemies = [];

  const SailProgress = (await import("../models/SailProgress.js")).default;
  const sailProgress = await SailProgress.findOne({ userId });
  const difficulty = (sailProgress && sailProgress.difficulty) || 'easy';
  const multiplier = difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1;
  enemies.forEach(enemy => {
    enemy.health = roundNearestFive(enemy.health * multiplier);
    enemy.maxHealth = enemy.health;
    enemy.attackRange = [Math.ceil(enemy.attackRange[0] * multiplier), Math.ceil(enemy.attackRange[1] * multiplier)];
    enemy.power = Math.ceil(enemy.power * multiplier);
  });

  const sessionId = `sail_ep4_${userId}_${Date.now()}`;
  global.SAIL_SESSIONS = global.SAIL_SESSIONS || new Map();

  const WeaponInventory = (await import('../models/WeaponInventory.js')).default;
  const winv = await WeaponInventory.findOne({ userId });
  const hasBanner = winv && winv.teamBanner === 'alvida_pirates_banner_c_01';
  const { computeTeamBoosts } = await import("../lib/boosts.js");
  const { getCardById } = await import("../cards.js");

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

  global.SAIL_SESSIONS.set(sessionId, {
    userId,
    user: interaction.user,
    cards: p1Cards,
    lifeIndex: 0,
    enemies,
    phase: 1,
    sessionId,
    channelId: interaction.channel.id,
    msgId: null,
    difficulty,
    episode: 4
  });

  await startSailTurn(sessionId, interaction.channel);
};

export const startEpisode5Stage2 = async (userId, interaction) => {
  const Progress = (await import("../models/Progress.js")).default;
  const progress = await Progress.findOne({ userId });
  if (!progress || !progress.team || progress.team.length === 0) {
    try { await interaction.followUp({ content: "You need a team to sail. Use /team to set your team.", ephemeral: true }); } catch (e) { await interaction.channel.send({ content: "You need a team to sail. Use /team to set your team." }); }
    return;
  }

  const enemies = [];
  const SailProgress = (await import("../models/SailProgress.js")).default;
  const sailProgress = await SailProgress.findOne({ userId });
  const difficulty = (sailProgress && sailProgress.difficulty) || 'easy';
  const multiplier = difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1;

  const sessionId = `sail_ep5_${userId}_${Date.now()}`;
  global.SAIL_SESSIONS = global.SAIL_SESSIONS || new Map();

  const WeaponInventory = (await import('../models/WeaponInventory.js')).default;
  const winv = await WeaponInventory.findOne({ userId });
  const hasBanner = winv && winv.teamBanner === 'alvida_pirates_banner_c_01';
  const { computeTeamBoosts } = await import("../lib/boosts.js");
  const { getCardById } = await import("../cards.js");

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
        power += atkBoost; attackMin += atkBoost; attackMax += atkBoost; health += hpBoost;
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
      attackMin = Math.round(attackMin * 1.05); attackMax = Math.round(attackMax * 1.05); power = Math.round(power * 1.05); health = Math.round(health * 1.05);
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

  global.SAIL_SESSIONS.set(sessionId, {
    userId,
    user: interaction.user,
    cards: p1Cards,
    lifeIndex: 0,
    enemies,
    phase: 1,
    sessionId,
    channelId: interaction.channel.id,
    msgId: null,
    difficulty,
    episode: 5
  });

  await startSailTurn(sessionId, interaction.channel);
};

export const startEpisode6Stage2 = async (userId, interaction) => {
  const Progress = (await import("../models/Progress.js")).default;
  const progress = await Progress.findOne({ userId });
  if (!progress || !progress.team || progress.team.length === 0) {
    try { await interaction.followUp({ content: "You need a team to sail. Use /team to set your team.", ephemeral: true }); } catch (e) { await interaction.channel.send({ content: "You need a team to sail. Use /team to set your team." }); }
    return;
  }

  const enemies = [];
  const SailProgress = (await import("../models/SailProgress.js")).default;
  const sailProgress = await SailProgress.findOne({ userId });
  const difficulty = (sailProgress && sailProgress.difficulty) || 'easy';
  const multiplier = difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.25 : 1;

  const sessionId = `sail_ep6_${userId}_${Date.now()}`;
  global.SAIL_SESSIONS = global.SAIL_SESSIONS || new Map();

  const WeaponInventory = (await import('../models/WeaponInventory.js')).default;
  const winv = await WeaponInventory.findOne({ userId });
  const hasBanner = winv && winv.teamBanner === 'alvida_pirates_banner_c_01';
  const { computeTeamBoosts } = await import("../lib/boosts.js");
  const { getCardById } = await import("../cards.js");

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
        power += atkBoost; attackMin += atkBoost; attackMax += atkBoost; health += hpBoost;
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
      attackMin = Math.round(attackMin * 1.05); attackMax = Math.round(attackMax * 1.05); power = Math.round(power * 1.05); health = Math.round(health * 1.05);
    }

    const finalPower = roundNearestFive(Math.round(power));
    const baseAttackMin = Math.round(attackMin);
    const baseAttackMax = Math.round(attackMax);
    const finalAttackMin = (hasBanner && bannerSignature.includes(cardId)) ? baseAttackMin : roundNearestFive(baseAttackMin);
    const finalAttackMax = (hasBanner && bannerSignature.includes(cardId)) ? baseAttackMax : roundNearestFive(baseAttackMax);
    const finalHealth = roundNearestFive(Math.round(health));
    if (special && special.range) special.range = roundRangeToFive([Math.round(special.range[0] || 0), Math.round(special.range[1] || 0)]);

    return { cardId, card, scaled: { attackRange: [finalAttackMin, finalAttackMax], specialAttack: special, power: finalPower }, health: finalHealth, maxHealth: finalHealth, level, stamina: 3, usedSpecial: false, attackedLastTurn: false };
  });

  global.SAIL_SESSIONS.set(sessionId, {
    userId,
    user: interaction.user,
    cards: p1Cards,
    lifeIndex: 0,
    enemies,
    phase: 1,
    sessionId,
    channelId: interaction.channel.id,
    msgId: null,
    difficulty,
    episode: 6
  });

  await startSailTurn(sessionId, interaction.channel);
};


