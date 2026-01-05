import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import SailProgress from "../models/SailProgress.js";
import Progress from "../models/Progress.js";
import Balance from "../models/Balance.js";
import Inventory from "../models/Inventory.js";
import { getCardById } from "../cards.js";
import { episodes as episodeDefs, formatRewardsList } from "../events/episodes_definitions.js";

export const data = new SlashCommandBuilder()
  .setName("sail_old_disabled")
  .setDescription("Sail through the world and progress in the story");

// Get difficulty color based on the episode or current difficulty
function getDifficultyColor(epDifficulty, currentDifficulty) {
  const diff = epDifficulty || currentDifficulty || 'easy';
  return diff === 'easy' ? 0x2ecc71 : (diff === 'medium' ? 0xf1c40f : 0xe74c3c);
}

// Format rewards for display in embed description
function getRewardsText(stage, difficulty) {
  if (!stage || stage.type !== 'embed' || !stage.rewards) return '';
  return formatRewardsList(stage.rewards, difficulty);
}

export async function execute(interactionOrMessage) {
  const isInteraction = typeof interactionOrMessage.isCommand === "function" || typeof interactionOrMessage.isChatInputCommand === "function";
  const user = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
  const channel = isInteraction ? interactionOrMessage.channel : interactionOrMessage.channel;
  const userId = user.id;

  const progress = await Progress.findOne({ userId });
  const sailProgress = await SailProgress.findOne({ userId }) || new SailProgress({ userId });
  const difficulty = (sailProgress && sailProgress.difficulty) || 'easy';
  const difficultyColor = getDifficultyColor(null, difficulty);

  // Enforce cooldown after defeat: 5 minutes
  if (sailProgress && sailProgress.lastSail) {
    try {
      const last = new Date(sailProgress.lastSail).getTime();
      const diff = Date.now() - last;
      const cooldown = 5 * 60 * 1000;
      if (diff < cooldown) {
        const remaining = Math.ceil((cooldown - diff) / 1000);
        if (isInteraction) return interactionOrMessage.reply({ content: `You are on cooldown after defeat. Please wait ${remaining} seconds before sailing again.`, ephemeral: true });
        return channel.send(`You are on cooldown after defeat. Please wait ${remaining} seconds before sailing again.`);
      }
    } catch (e) { /* ignore parse errors */ }
  }

  const teamSet = progress && progress.team && progress.team.length > 0;
  const teamNames = teamSet ? progress.team.map(id => {
    const card = getCardById(id);
    const rank = card ? card.rank : 'Unknown';
    const name = card ? card.name : id;
    return `**(${rank})** ${name}`;
  }).join('\n') : '';

  if (sailProgress.progress === 0) {
    // Show intro embed
    const embed = new EmbedBuilder()
      .setColor(difficultyColor)
      .setDescription(`**Introduction - Episode 0**

This is where your journey starts, Pirate!
In this journey, you will be walking the same steps as Luffy into being the future pirate king!
Build your team, get your items ready and be ready to fight, because this will be a hard journey.. Or will it? Choose the difficulty of your journey on the dropdown below. You can always change the difficulty later with command \`op settings\` or \`/settings\` if you ever change your mind.

As you progress, the enemies will get stronger. I recommend preserving your items for future stages.

**${user.username}'s Deck**
${teamSet ? teamNames : 'Deck not set, automatically set your deck with command \`op autoteam\`!'}

**Next Episode**
I'm Luffy! The Man Who Will Become the Pirate King!`)
      .setImage('https://files.catbox.moe/6953qz.gif');

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`sail:${userId}:sail`)
          .setLabel('Sail')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`sail:${userId}:map`)
          .setLabel('Map')
          .setStyle(ButtonStyle.Secondary)
      );

    const dropdown = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`sail_difficulty:${userId}`)
          .setPlaceholder('Select difficulty')
          .addOptions(
            { label: 'Easy', value: 'easy' },
            { label: 'Medium', value: 'medium' },
            { label: 'Hard', value: 'hard' }
          )
      );

    if (isInteraction) {
      await interactionOrMessage.reply({ embeds: [embed], components: [buttons, dropdown] });
    } else {
      await channel.send({ embeds: [embed], components: [buttons, dropdown] });
    }
  } else if (sailProgress.progress >= 1 && sailProgress.progress <= 8) {
    // All episodes 1-8: Show the first embed stage from the definition
    const episodeNum = sailProgress.progress;
    const epDef = episodeDefs && episodeDefs[episodeNum];

    if (!epDef || !epDef.stages || epDef.stages.length === 0) {
      const reply = `Your current sail progress: Episode ${episodeNum} (not yet defined)`;
      if (isInteraction) {
        await interactionOrMessage.reply({ content: reply, ephemeral: true });
      } else {
        await channel.send(reply);
      }
      return;
    }

    // Award XP if not already awarded for this difficulty
    let progressDoc = await Progress.findOne({ userId });
    if (!progressDoc) {
      progressDoc = new Progress({ userId, team: [], cards: new Map() });
    }
    if (!progressDoc.cards || typeof progressDoc.cards.get !== 'function') {
      progressDoc.cards = new Map(Object.entries(progressDoc.cards || {}));
    }

    let xpAmount = 0;
    const xpKey = `ep${episodeNum}_${difficulty}`;
    if (!sailProgress.awardedXp || !sailProgress.awardedXp[xpKey]) {
      xpAmount = difficulty === 'hard' ? 30 : difficulty === 'medium' ? 20 : 10;
      // Award XP to user
      progressDoc.userXp = (progressDoc.userXp || 0) + xpAmount;
      let levelsGained = 0;
      while (progressDoc.userXp >= 100) {
        progressDoc.userXp -= 100;
        progressDoc.userLevel = (progressDoc.userLevel || 1) + 1;
        levelsGained++;
      }
      // Give level up rewards
      if (levelsGained > 0) {
        const balance = await Balance.findOne({ userId }) || new Balance({ userId });
        const inventory = await Inventory.findOne({ userId }) || new Inventory({ userId });
        let oldLevel = progressDoc.userLevel - levelsGained;
        for (let lvl = oldLevel + 1; lvl <= progressDoc.userLevel; lvl++) {
          balance.balance += lvl * 50;
          const rankIndex = Math.floor((lvl - 1) / 10);
          const ranks = ['C', 'B', 'A', 'S'];
          const currentRank = ranks[rankIndex] || 'S';
          const prevRank = ranks[rankIndex - 1];
          const chance = (lvl % 10 || 10) * 10;
          if (Math.random() * 100 < chance) {
            inventory.chests[currentRank] += 1;
          } else if (prevRank) {
            inventory.chests[prevRank] += 1;
          }
        }
        await balance.save();
        await inventory.save();
      }
      // Add XP to each card in the team
      for (const cardId of progressDoc.team || []) {
        let entry = progressDoc.cards.get(cardId) || { count: 0, xp: 0, level: 0 };
        if (!entry.count) entry.count = 1;
        entry.xp = entry.xp || 0;
        let totalXp = (entry.xp || 0) + xpAmount;
        let newLevel = entry.level || 0;
        while (totalXp >= 100) {
          totalXp -= 100;
          newLevel += 1;
        }
        entry.xp = totalXp;
        entry.level = newLevel;
        progressDoc.cards.set(cardId, entry);
        progressDoc.markModified('cards');
      }
      await progressDoc.save();
      sailProgress.awardedXp = sailProgress.awardedXp || {};
      sailProgress.awardedXp[xpKey] = true;
      await sailProgress.save();
    } else {
      xpAmount = difficulty === 'hard' ? 30 : difficulty === 'medium' ? 20 : 10;
    }

    // Get the first embed stage (intro stage)
    const introStage = epDef.stages.find(s => s.type === 'embed') || epDef.stages[0];
    const epColor = getDifficultyColor(epDef.difficulty, difficulty);
    const rewardsText = getRewardsText(introStage, difficulty);

    const embed = new EmbedBuilder()
      .setColor(epColor)
      .setTitle(`${introStage.title || epDef.title}`)
      .setDescription((introStage.description || '') + (rewardsText ? `\n\n${rewardsText}` : ''))
      .setImage(introStage.image || epDef.image || '');

    // Buttons for sailing or map
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`sail_battle_ep${episodeNum}:${userId}:start`)
          .setLabel(`Sail to Episode ${episodeNum}`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`sail:${userId}:map`)
          .setLabel('Map')
          .setStyle(ButtonStyle.Secondary)
      );

    if (isInteraction) {
      await interactionOrMessage.reply({ embeds: [embed], components: [buttons] });
    } else {
      await channel.send({ embeds: [embed], components: [buttons] });
    }
  } else {
    // Fallback for episodes beyond 8
    const reply = `Your current sail progress: Episode ${sailProgress.progress}`;
    if (isInteraction) {
      await interactionOrMessage.reply({ content: reply, ephemeral: true });
    } else {
      await channel.send(reply);
    }
  }
}

export const category = "Gameplay";
export const description = "Sail through the world and progress in the story";
