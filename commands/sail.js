import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import SailProgress from "../models/SailProgress.js";
import Progress from "../models/Progress.js";
import Balance from "../models/Balance.js";
import Inventory from "../models/Inventory.js";
import { getCardById } from "../cards.js";
import { episodes as episodeDefs, locations as episodeLocations } from "../events/episodes_definitions.js";

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
  const difficulty = (sailProgress && sailProgress.difficulty) || 'easy';
  const difficultyColor = difficulty === 'easy' ? 0x2ecc71 : (difficulty === 'medium' ? 0xf1c40f : 0xe74c3c);

  // enforce cooldown after defeat: 5 minutes
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
    // Show intro embed from definitions (do not change text; substitute username/team)
    const epDef = episodeDefs && episodeDefs[0];
    const defStage = epDef && epDef.stages && epDef.stages[0];
    const descTemplate = defStage && defStage.description ? String(defStage.description) : '';
    const desc = descTemplate.replace('%USERNAME%', user.username).replace('%TEAMNAMES%', teamSet ? teamNames : 'Deck not set, automatically set your deck with command `op autoteam`!');
    const embed = new EmbedBuilder().setColor(difficultyColor).setTitle(defStage && defStage.title ? defStage.title : 'Introduction - Episode 0');
    if (desc && desc.length > 0) embed.setDescription(desc);
    const img = defStage && defStage.image ? defStage.image : 'https://files.catbox.moe/6953qz.gif';
    if (img && String(img).trim().length > 0) embed.setImage(img);

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`sail_battle_ep1:${userId}:start`)
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
  } else {
    // Start the episode the user is currently on
    const episodeNum = sailProgress.progress;
    if (isInteraction) {
      try { if (!interactionOrMessage.deferred && !interactionOrMessage.replied) await interactionOrMessage.deferUpdate(); } catch (e) {}
    }
    try {
      const { startEpisode } = await import('../events/episodeInteractionCreate.js');
      const sessionId = await startEpisode(userId, episodeNum, isInteraction ? interactionOrMessage : { user, channel, reply: async (opts) => channel.send(opts), followUp: async (opts) => channel.send(opts) });
      if (sessionId) {
        const { startSailTurn } = await import('../events/interactionCreate.js');
        await startSailTurn(sessionId, channel);
      }
    } catch (e) {
      console.error(`Failed to start Episode ${episodeNum}:`, e && e.message ? e.message : e);
      const errMsg = `Error starting Episode ${episodeNum} battle.`;
      if (isInteraction) {
        try { await interactionOrMessage.followUp({ content: errMsg, ephemeral: true }); } catch (err) {}
      } else {
        await channel.send(errMsg);
      }
    }
  }
}

export const category = "Gameplay";
export const description = "Sail through the world and progress in the story";