import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import SailProgress from "../models/SailProgress.js";
import Progress from "../models/Progress.js";
import { getCardById } from "../cards.js";

export const data = new SlashCommandBuilder()
  .setName("sail")
  .setDescription("Sail through the world and progress in the story");

export async function execute(interactionOrMessage) {
  const isInteraction = typeof interactionOrMessage.isCommand === "function" || typeof interactionOrMessage.isChatInputCommand === "function";
  const user = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
  const channel = isInteraction ? interactionOrMessage.channel : interactionOrMessage.channel;
  const userId = user.id;

  const progress = await Progress.findOne({ userId });
  const sailProgress = await SailProgress.findOne({ userId }) || new SailProgress({ userId });

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
      .setColor('Blue')
      .setDescription(`**Introduction - Episode 0**

This is where your journey starts, Pirate !
In this journey, you will be walking the same steps as Luffy into being the future pirate king!
Build your team, get your items ready and be ready to fight, because this will be a hard journey.. Or will it ? Choose the difficulty of your journey on the dropdown below. You can always change the difficulty later with command \`op settings\` or \`/settings\` if you ever change your mind.

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
  } else if (sailProgress.progress === 1) {
    // Episode 1: Luffy meets Koby and fights Alvida Pirates

    // Award XP if not already awarded for this difficulty
    const progress = await Progress.findOne({ userId });
    if (!progress) {
      progress = new Progress({ userId, team: [], cards: new Map() });
    }
    let xpAmount = 0;
    if (!sailProgress.awardedXp[sailProgress.difficulty]) {
      xpAmount = sailProgress.difficulty === 'hard' ? 30 : sailProgress.difficulty === 'normal' ? 20 : 10;
      progress.userXp = (progress.userXp || 0) + xpAmount;
      while (progress.userXp >= 100) {
        progress.userXp -= 100;
        progress.userLevel = (progress.userLevel || 1) + 1;
      }
      // Add XP to each card in the team
      for (const cardId of progress.team || []) {
        let entry = progress.cards.get(cardId);
        if (!entry) {
          entry = { level: 0, xp: 0, count: 1 };
          progress.cards.set(cardId, entry);
        }
        entry.xp = (entry.xp || 0) + xpAmount;
        while (entry.xp >= 100) {
          entry.xp -= 100;
          entry.level = (entry.level || 0) + 1;
        }
      }
      await progress.save();
      sailProgress.awardedXp[sailProgress.difficulty] = true;
      await sailProgress.save();
    } else {
      xpAmount = sailProgress.difficulty === 'hard' ? 30 : sailProgress.difficulty === 'normal' ? 20 : 10;
    }

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setDescription(`*I'm Luffy! The Man Who Will Become the Pirate King! - episode 1*

Luffy is found floating at sea by a cruise ship. After repelling an invasion by the Alvida Pirates, he meets a new ally, their chore boy Koby.

**Possible rewards:**
100 - 250 beli
1 - 2 C tier chest${sailProgress.difficulty === 'hard' ? '\n1x Koby card\n1x Alvida card (Exclusive to Hard mode)\n1x Heppoko card (Exclusive to Hard mode)\n1x Peppoko card (Exclusive to Hard mode)\n1x Poppoko card (Exclusive to Hard mode)\n1x Alvida Pirates banner blueprint (C rank Item card, signature: alvida pirates, boosts stats by +5%)' : '\n1x Koby card'}${Math.random() < 0.5 ? '\n1 reset token' : ''}

*XP awarded: +${xpAmount} to user and each team card.*`)
      .setImage('https://files.catbox.moe/zlda8y.webp');

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`sail_battle:${userId}:ready`)
          .setLabel("I'm ready!")
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
    // For now, just reply with current progress
    const reply = `Your current sail progress: Episode ${sailProgress.progress}`;
    if (isInteraction) {
      await interactionOrMessage.reply({ content: reply });
    } else {
      await channel.send(reply);
    }
  }
}

export const category = "Gameplay";
export const description = "Sail through the world and progress in the story";