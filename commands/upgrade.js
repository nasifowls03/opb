import { SlashCommandBuilder } from "discord.js";
import Progress from "../models/Progress.js";
import Balance from "../models/Balance.js";
import { cards, getCardById, getRankInfo } from "../cards.js";

export const data = new SlashCommandBuilder().setName("upgrade").setDescription("Upgrade a card").addStringOption(opt => opt.setName("card").setDescription("Card id or name").setRequired(true));

function fuzzyFindCard(query) {
  if (!query) return null;
  const q = String(query).toLowerCase();
  let card = cards.find(c => c.id.toLowerCase() === q);
  if (card) return card;
  card = cards.find(c => c.name.toLowerCase() === q);
  if (card) return card;
  card = cards.find(c => c.name.toLowerCase().startsWith(q));
  if (card) return card;
  card = cards.find(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  return card || null;
}

export async function execute(interactionOrMessage, client) {
  const isInteraction = typeof interactionOrMessage.isCommand === "function" || typeof interactionOrMessage.isChatInputCommand === "function";
  const user = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
  const channel = isInteraction ? interactionOrMessage.channel : interactionOrMessage.channel;
  const userId = user.id;

  const query = isInteraction ? interactionOrMessage.options.getString("card") : interactionOrMessage.content.trim().split(/\s+/).slice(2).join(" ");
  let baseCard = fuzzyFindCard(query);
  if (!baseCard) {
    const reply = `Please state a valid card`;
    if (isInteraction) await interactionOrMessage.reply({ content: reply, ephemeral: true }); else await channel.send(reply);
    return;
  }

  // If multiple cards share the same name, prefer the version the user owns (so they can upgrade that exact copy)
  let prog = await Progress.findOne({ userId });
  if (!prog) prog = new Progress({ userId, cards: {} });
  const cardsMap = prog.cards instanceof Map ? prog.cards : new Map(Object.entries(prog.cards || {}));
  const same = cards.filter(c => (c.name || "").toLowerCase() === (baseCard.name || "").toLowerCase());
  if (same.length > 1) {
    let ownedCandidates = same.filter(c => (cardsMap.get(c.id) || {}).count > 0);
    if (ownedCandidates.length > 0) {
      // pick highest rank owned (prefer upgraded owned card if present)
      ownedCandidates.sort((a,b) => (getRankInfo(b.rank)?.value||0) - (getRankInfo(a.rank)?.value||0));
      // use the owned highest-rank as the baseCard for upgrade
      baseCard = ownedCandidates[0];
    }
  }

  // find upgrade target from baseCard.evolutions (first upgrade)
  const evoIds = baseCard.evolutions || [];
  if (!evoIds.length) {
    const reply = `No upgrade available for **${baseCard.name}**.`;
    if (isInteraction) await interactionOrMessage.reply({ content: reply, ephemeral: true }); else await channel.send(reply);
    return;
  }

  const upgradeCard = getCardById(evoIds[0]);
  if (!upgradeCard) {
    const reply = `Upgrade data not found for **${baseCard.name}**.`;
    if (isInteraction) await interactionOrMessage.reply({ content: reply, ephemeral: true }); else await channel.send(reply);
    return;
  }

  if (!upgradeCard.upgradeRequirements) {
    const reply = `Upgrade requirements not set for **${upgradeCard.name}**.`;
    if (isInteraction) await interactionOrMessage.reply({ content: reply, ephemeral: true }); else await channel.send(reply);
    return;
  }

  // user's progress and cards are already loaded above (reuse `prog` and `cardsMap`)

  const baseEntry = cardsMap.get(baseCard.id);
  if (!baseEntry || (baseEntry.count || 0) <= 0) {
    const reply = `You don't own ${baseCard.name}. You need the base card to upgrade.`;
    if (isInteraction) await interactionOrMessage.reply({ content: reply, ephemeral: true }); else await channel.send(reply);
    return;
  }

  const userLevel = baseEntry.level || 0;
  const { cost, minLevel } = upgradeCard.upgradeRequirements;
  if (userLevel < minLevel) {
    const reply = `Your **${baseCard.name}** must be at least level **${minLevel}** to upgrade.`;
    if (isInteraction) await interactionOrMessage.reply({ content: reply, ephemeral: true }); else await channel.send(reply);
    return;
  }

  let bal = await Balance.findOne({ userId });
  if (!bal) bal = new Balance({ userId, amount: 500 });
  if ((bal.amount || 0) < cost) {
    const reply = `You need ${cost}¥ to upgrade to **${upgradeCard.name}**.`;
    if (isInteraction) await interactionOrMessage.reply({ content: reply, ephemeral: true }); else await channel.send(reply);
    return;
  }

  // deduct cost
  bal.amount -= cost;
  await bal.save();
  // Remove previous card from collection (when upgrading from base to upgrade)
  if (baseCard.id !== upgradeCard.id) {
    cardsMap.delete(baseCard.id);
  }

  // create or update upgraded card entry — carry over level/xp from base
  const upgradedEntry = cardsMap.get(upgradeCard.id) || { count: 0, xp: 0, level: 0 };
  upgradedEntry.count = Math.max(1, upgradedEntry.count || 0);
  // carry over level and xp
  upgradedEntry.level = baseEntry.level || 0;
  upgradedEntry.xp = baseEntry.xp || 0;
  upgradedEntry.acquiredAt = Date.now();
  cardsMap.set(upgradeCard.id, upgradedEntry);

  // save back
  prog.cards = cardsMap;
  prog.markModified('cards');
  await prog.save();

  const reply = `Successfully upgraded **${baseCard.name}** to **${upgradeCard.name}**!.`;
  if (isInteraction) await interactionOrMessage.reply({ content: reply }); else await channel.send(reply);
}
