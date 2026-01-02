import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import SailProgress from "../models/SailProgress.js";

export const data = new SlashCommandBuilder()
  .setName("map")
  .setDescription("View your sailing progress map");

export async function execute(interactionOrMessage) {
  const isInteraction = typeof interactionOrMessage.isCommand === "function" || typeof interactionOrMessage.isChatInputCommand === "function";
  const user = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
  const channel = isInteraction ? interactionOrMessage.channel : interactionOrMessage.channel;
  const userId = user.id;

  const sailProgress = await SailProgress.findOne({ userId }) || new SailProgress({ userId });

  const stars = sailProgress.stars.get('1') || 0;
  const stars2 = sailProgress.stars.get('2') || 0;
  const stars3 = sailProgress.stars.get('3') || 0;
  const progress = sailProgress.progress;
  const locked = progress < 1;
  const filled = locked ? 0 : Math.floor((stars / 3) * 8);
  const progressBar = '▰'.repeat(filled) + '▱'.repeat(8 - filled);
  const status = progress < 1 ? '⛓' : stars === 3 ? `${stars}/3 ✮` : '';
  const locked2 = progress < 2;
  const filled2 = locked2 ? 0 : Math.floor(((stars2 + stars3) / 6) * 8);
  const progressBar2 = '▰'.repeat(filled2) + '▱'.repeat(8 - filled2);
  const status2 = progress < 2 ? '⛓' : stars2 === 3 ? '3/3 ✮' : '';
  const status3 = progress < 2 ? '⛓' : stars3 === 3 ? '3/3 ✮' : '';

  const embed = new EmbedBuilder()
    .setTitle('World Map')
    .setDescription('View your progress')
    .setThumbnail('https://files.catbox.moe/e4w287.webp')
    .addFields(
      { name: 'East Blue saga', value: ' ', inline: false },
      { name: `Goat Island${locked ? ' ⛓' : ''}`, value: `${progressBar}\nEpisode one${status ? ' ' + status : ''}`, inline: false },
      { name: `**Shells Town**${locked2 ? ' ⛓' : ''}`, value: `${progressBar2}\nEpisode two${status2 ? ' ' + status2 : ''}\nEpisode three${status3 ? ' ' + status3 : ''}`, inline: false }
    )
    .setFooter({ text: 'page 1/1' });

  if (isInteraction) {
    await interactionOrMessage.reply({ embeds: [embed] });
  } else {
    await channel.send({ embeds: [embed] });
  }
}

export const category = "Gameplay";
export const description = "View your sailing progress map";