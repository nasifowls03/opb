import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Progress from '../models/Progress.js';
import Inventory from '../models/Inventory.js';
import Balance from '../models/Balance.js';

export const data = new SlashCommandBuilder().setName('start').setDescription('Create your account and receive starter rewards');

export async function execute(interactionOrMessage, client) {
  const isInteraction = typeof interactionOrMessage.isCommand === 'function' || typeof interactionOrMessage.isChatInputCommand === 'function';
  const user = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
  const channel = isInteraction ? interactionOrMessage.channel : interactionOrMessage.channel;

  try {
    const userId = String(user.id);

    // Use findOneAndUpdate with upsert for all documents to avoid duplicate issues
    await Progress.findOneAndUpdate(
      { userId },
      {
        $set: {
          cards: {
            'luffy_c_01': { cardId: 'luffy_c_01', count: 1, xp: 0, level: 0 }
          },
          team: []
        }
      },
      { upsert: true }
    );

    await Inventory.findOneAndUpdate(
      { userId },
      { $set: { chests: { C: 3, B: 0, A: 0, S: 0 }, items: {}, xpBottles: 0, xpScrolls: 0, xpBooks: 0 } },
      { upsert: true }
    );

    await Balance.findOneAndUpdate(
      { userId },
      { $set: { amount: 500, resetTokens: 0, lastDaily: null, dailyStreak: 0, gambleWindow: 0, gamblesToday: 0, lastMission: null, xp: 0, level: 0 } },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setTitle('It all starts here!')
      .setColor(0xffffff)
      .setDescription("You're account has successfully been registered.\n\n**Starter rewards**\n1x Monkey D. Lufffy card\n3x C tier chests\n500 beli¥\n\nRun `op tutorial` to start the tutorial")
      .setImage('https://files.catbox.moe/2h8896.gif')
      .setFooter({ text: `Welcome, ${user.username}` });

    if (isInteraction) {
      await interactionOrMessage.reply({ embeds: [embed] });
    } else {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Error in start command:', err);
    const msg = 'There was an error creating your account. Try again later.';
    if (isInteraction) return await interactionOrMessage.reply({ content: msg, ephemeral: true });
    return await channel.send({ content: msg });
  }
}

export const description = 'Create a new player account and receive starter rewards';
