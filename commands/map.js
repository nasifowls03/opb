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
  const progress = sailProgress.progress;
  const totalEpisodes = 3; // for East Blue
  const progressBar = '▰'.repeat(progress) + '▱'.repeat(totalEpisodes - progress);

  const embed = new EmbedBuilder()
    .setTitle('World Map')
    .setDescription('View your progress')
    .setThumbnail('https://files.catbox.moe/e4w287.webp')
    .addFields(
      { name: `East blue saga ${progress}/${totalEpisodes}`, value: `${progressBar}\nhome sea`, inline: false },
      { name: `Goat Island${stars >= 3 ? ' ★★★' : progress >= 1 ? ' ⛓' : ''}`, value: `Where Coby and Alvida reside\n\n*page 1/1*`, inline: false }
    );

  if (isInteraction) {
    await interactionOrMessage.reply({ embeds: [embed] });
  } else {
    await channel.send({ embeds: [embed] });
  }
}

export const category = "Gameplay";
export const description = "View your sailing progress map";