import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import SailProgress from '../models/SailProgress.js';

export const data = new SlashCommandBuilder()
  .setName('sailmode')
  .setDescription('Set your sail difficulty mode (easy, medium, hard)')
  .addStringOption(opt => opt.setName('mode').setDescription('Difficulty mode').setRequired(true).addChoices(
    { name: 'easy', value: 'easy' },
    { name: 'medium', value: 'medium' },
    { name: 'hard', value: 'hard' }
  ))
  .addUserOption(opt => opt.setName('user').setDescription('Set mode for another user (owner only)'));

export async function execute(interactionOrMessage, client) {
  const isInteraction = typeof interactionOrMessage.isCommand === 'function' || typeof interactionOrMessage.isChatInputCommand === 'function';
  const user = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
  const channel = isInteraction ? interactionOrMessage.channel : interactionOrMessage.channel;

  try {
    const callerId = String(user.id);
    let targetId = callerId;
    let mode = null;

    if (isInteraction) {
      mode = interactionOrMessage.options.getString('mode');
      const target = interactionOrMessage.options.getUser('user');
      if (target) {
        // Only allow owner to set others' mode
        const envOwner = process.env.OWNER_ID;
        if (!envOwner || callerId !== String(envOwner)) {
          return interactionOrMessage.reply({ content: 'Only the bot owner can set other users\' sail mode.', ephemeral: true });
        }
        targetId = String(target.id);
      }
    } else {
      const parts = interactionOrMessage.content.trim().split(/\s+/);
      mode = parts[2] ? parts[2].toLowerCase() : null;
      const mention = parts[3] || null;
      if (mention) targetId = String(mention.replace(/[^0-9]/g, ''));
    }

    if (!['easy','medium','hard'].includes(mode)) {
      const reply = 'Invalid mode. Choose one of: easy, medium, hard.';
      if (isInteraction) return interactionOrMessage.reply({ content: reply, ephemeral: true }); else return channel.send(reply);
    }

    const sail = await SailProgress.findOneAndUpdate({ userId: targetId }, { $set: { difficulty: mode } }, { upsert: true, new: true });
    const embed = new EmbedBuilder().setTitle('Sail Mode Updated').setDescription(`Sail mode for <@${targetId}> set to **${mode}**`).setColor(0x2ecc71);
    if (isInteraction) return interactionOrMessage.reply({ embeds: [embed], ephemeral: true });
    return channel.send({ embeds: [embed] });
  } catch (e) {
    console.error('sailmode error', e);
    const reply = 'Failed to set sail mode.';
    if (isInteraction) return interactionOrMessage.reply({ content: reply, ephemeral: true });
    return channel.send(reply);
  }
}

export const description = 'Set sail difficulty mode (easy/medium/hard)';
