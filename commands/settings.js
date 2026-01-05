import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Configure your adventure settings (difficulty)');

export async function execute(interaction) {
  const userId = interaction.user.id;
  const embed = new EmbedBuilder()
    .setTitle('Adventure Settings')
    .setDescription('Choose your preferred difficulty for the adventure. This controls enemy strength and reward multipliers.');

  const select = new StringSelectMenuBuilder()
    .setCustomId(`settings_difficulty:${userId}`)
    .setPlaceholder('Select difficulty')
    .addOptions(
      { label: 'Easy', value: 'easy', description: 'Lower difficulty, smaller rewards' },
      { label: 'Medium', value: 'medium', description: 'Default difficulty' },
      { label: 'Hard', value: 'hard', description: 'Hard difficulty, better rewards' }
    );

  const row = new ActionRowBuilder().addComponents(select);
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

export const description = 'Configure user settings';
