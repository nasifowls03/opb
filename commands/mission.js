import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Balance from "../models/Balance.js";
import Inventory from "../models/Inventory.js";
import Quest from "../models/Quest.js";

export const data = new SlashCommandBuilder().setName("mission").setDescription("Daily trivia mission (5 questions)");
export const category = "Economy";
export const description = "Daily trivia mission";

const QUESTIONS = [
  { q: "Who was the first Straw Hat to be shown in the anime?", a: ["Roronoa Zoro","Monkey D. Luffy","Nami","Usopp"], correct: 1 },
  { q: "How old was Luffy pre-time skip?", a: ["15","17","19","16"], correct: 1 },
  { q: "Who was the first antagonist of One Piece?", a: ["Buggy","Arlong","Crocodile","Alvida"], correct: 3 },
  { q: "What was the first ever named attack used by Luffy?", a: ["Gomu Gomu no Gatling","Gomu Gomu no Pistol","Gomu Gomu no Rocket","Gomu Gomu no Bazooka"], correct: 1 },
  { q: "Where was Gol D. Roger executed?", a: ["Marineford","Loguetown","Water 7","Sabaody Archipelago"], correct: 1 },
  { q: "What is the name of the dog in Orange Town?", a: ["Poro","ChouChou","Boodle","Hocker"], correct: 1 },
  { q: "Who was the first Warlord of the sea to be introduced?", a: ["Crocodile","Dracule Mihawk","Bartholomew Kuma","Boa Hancock"], correct: 1 },
  { q: "How many times did Zoro lose to Kuina?", a: ["1 time","10 times","100 times","2001 times"], correct: 3 },
  { q: "What is the name of the Straw Hats' first ship?", a: ["Thousand Sunny","Going Merry","Red Force","Oro Jackson"], correct: 1 },
  { q: "How many berries did Nami have to gather for Arlong in order to free Cocoyasi Village?", a: ["10,000 Berries","1,000,000 Berries","100,000,000 Berries","10,000,000 Berries"], correct: 2 },
  { q: "Which devil fruit was the first to appear after Luffy's?", a: ["Mera Mera no Mi","Hie Hie no Mi","Gura Gura no Mi","Sube Sube no Mi (Alvida)"], correct: 3 },
  { q: "Which sword does Zoro use with his mouth?", a: ["Enma","Wado Ichimonji","Sandai Kitetsu","Shusui"], correct: 1 },
  { q: "True/False: Gaimon isn't filler", a: ["False","True","False","True"], correct: 1 },
  { q: "What was Luffy's first bounty?", a: ["1,500,000 Berries","300,000 Berries","30,000,000 Berries","5,000,000 Berries"], correct: 2 },
  { q: "What is Smoker's epithet?", a: ["The Smoky Marine","White Hunter","The White Chase","Iron Fist"], correct: 1 },
  { q: "What was the first island the Straw Hats visited in the Grand Line?", a: ["Reverse Mountain","Twin Cape","Whisky Peak","Little Garden"], correct: 1 },
  { q: "Which character is associated with the phrase 'Gya ga ga ga ga!'?", a: ["Brogy","Kaya","Perona","Mr. 2"], correct: 0 },
  { q: "Where in the world was Sanji born?", a: ["East Blue","West Blue","South Blue","North Blue"], correct: 3 },
  { q: "What is the name of Brook's old crew?", a: ["Sun Pirates","Rumbar Pirates","Red Hair Pirates","Blackbeard Pirates"], correct: 1 },
  { q: "In which arc did Nico Robin wear this outfit?", a: ["Alabasta","Enies Lobby","Skypiea","Water 7"], correct: 0 },
  { q: "Who defeated Miss Doublefinger in Alabasta?", a: ["Nami","Usopp","Sanji","Nico Robin"], correct: 0 },
  { q: "Who is Ace's biological father?", a: ["Monkey D. Dragon","Gol D. Roger","Portgas D. Rouge","Whitebeard"], correct: 1 },
  { q: "Where was Nami's weapon (Clima-Tact) first shown?", a: ["Drum Island","Arlong Park","Loguetown","Water 7"], correct: 1 },
  { q: "Who was the doctor of Gol D. Roger's crew?", a: ["Tom","Crocus","Dr. Hiluluk","Hiriluk"], correct: 1 },
  { q: "Which character has an obsession with cherry pies?", a: ["Mrs. Pink","Señor Pink","Charlotte Pudding","Tashigi"], correct: 1 },
  { q: "Who of these characters can't use Observation Haki?", a: ["Sengoku","Jinbe","Kaku","Buggy"], correct: 3 },
  { q: "Who was the first Marine Admiral to be introduced?", a: ["Sakazuki (Akainu)","Kuzan (Aokiji)","Borsalino (Kizaru)","Monkey D. Garp"], correct: 1 },
  { q: "For whom did Tom entrust the Pluton blueprints?", a: ["Franky","Iceberg","Nico Robin","Tom himself"], correct: 0 },
  { q: "Who was the Fleet Admiral of the Navy 3 decades ago?", a: ["Sengoku","Kong","Monkey D. Garp","Akainu"], correct: 1 },
  { q: "True/False: Sanji has fought using his hands", a: ["False","True","False","True"], correct: 0 },
  { q: "Which weapon did Uso... Sogeking use to shoot the World Government flag in Enies Lobby?", a: ["A pistol","Kabuto (slingshot)","A cannon","A flare"], correct: 1 },
  { q: "What color is the transponder snail used to summon a Buster Call?", a: ["Blue","Golden (gold-colored)","Orange","Green"], correct: 1 },
  { q: "What happened?", a: ["A battle","The World Government flag was shot down","An alliance","A betrayal"], correct: 1 },
  { q: "What is the name of Kizaru's fruit?", a: ["Goro Goro no Mi","Pika Pika no Mi","Hie Hie no Mi","Mera Mera no Mi"], correct: 1 },
  { q: "Which mark is the one used by Celestial Dragons?", a: ["Celestial Seal","Hoof of the Soaring Dragon","Saint Mark","Dragon Mark"], correct: 1 },
  { q: "Who opened the Gate of Justice to Marineford for Luffy and the Impel Down escapees?", a: ["Jinbe","Emporio Ivankov","Marco","Whitebeard"], correct: 1 },
  { q: "Which Straw Hat's voice actor voiced fake Zoro?", a: ["Hiroaki Hirata","Kazuya Nakai","Akemi Okamura","Kappei Yamaguchi"], correct: 1 },
  { q: "In which arc was Franky's hair a cannon?", a: ["Water 7","Dressrosa Arc","Enies Lobby","Sabaody"], correct: 0 },
  { q: "How many New Fishman pirates did Luffy defeat using Conqueror's Haki?", a: ["3","50,000","1","5"], correct: 0 },
  { q: "Who took over Chopper's body in Punk Hazard?", a: ["Caesar Clown","Trafalgar Law","Momonosuke","Vergo"], correct: 1 },
  { q: "True/False: Doflamingo resigned from the Seven Warlords", a: ["True","False","True","False"], correct: 0 },
  { q: "Who has shrunk/broke Don Chinjao's drill head?", a: ["Baby 5","Monkey D. Luffy","Cavendish","Sabo"], correct: 0 },
  { q: "Who won the fight of Block D? (Dressrosa)", a: ["Kyros","Rebecca","Bartolomeo","Don Chinjao"], correct: 0 },
  { q: "Why exactly does Señor Pink wear baby clothes?", a: ["To intimidate opponents","Because his wife and child died, and it's how he honors them","To be fashionable","As a disguise"], correct: 1 },
  { q: "Where was the first Road Poneglyph located that the Straw Hats found?", a: ["Zou","Skypiea","Fishman Island","Sabaody"], correct: 0 },
  { q: "Who could not only listen, but communicate with Zunesha?", a: ["Kozuki Oden","Momonosuke","Kin'emon","Toko"], correct: 0 },
  { q: "Who is the first son of Charlotte Linlin?", a: ["Katakuri","Charlotte Perospero","Pudding","Capone"], correct: 0 },
  { q: "What is the only race/tribe you can't find on Totto Land as mentioned in the arc?", a: ["Giants","Merfolk","Fishmen","Longarm"], correct: 0 },
  { q: "Who of these characters isn't royalty?", a: ["Pudding","Vivi","Nefertari Cobra","Nami"], correct: 3 },
  { q: "In which arc was advanced Armament Haki/Ryuo first utilized?", a: ["Dressrosa","Wano Country Arc","Punk Hazard","Sabaody"], correct: 0 },
  { q: "True/False: Momonosuke's sister is the oiran of Wano", a: ["True","False","True","False"], correct: 0 },
  { q: "Which devil fruit does Sasaki have?", a: ["Ryu Ryu no Mi, Model: Triceratops","Riki Riki no Mi","Tori Tori no Mi","Ushi Ushi no Mi"], correct: 0 },
  { q: "Who has the largest bust size of these characters?", a: ["Nami","Nico Robin","Tashigi","Boa Hancock"], correct: 3 },
  { q: "Who of these characters isn't a former Rocks Pirate?", a: ["Kaido","Shiki","Big Mom","Whitebeard"], correct: 0 }
];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export async function execute(interactionOrMessage) {
  const isInteraction = typeof interactionOrMessage.isCommand === "function" || typeof interactionOrMessage.isChatInputCommand === "function";
  const user = isInteraction ? interactionOrMessage.user : interactionOrMessage.author;
  const channel = isInteraction ? interactionOrMessage.channel : interactionOrMessage.channel;
  const userId = user.id;

  let bal = await Balance.findOne({ userId });
  if (!bal) { bal = new Balance({ userId, amount: 500 }); }

  const now = Date.now();
  const last = bal.lastMission ? new Date(bal.lastMission).getTime() : 0;
  const daysSince = Math.floor((now - last) / (24*60*60*1000));
  if (last && daysSince === 0) {
    const reply = "You've already done today's mission.";
    if (isInteraction) return interactionOrMessage.reply({ content: reply, ephemeral: true });
    return channel.send(reply);
  }

  // pick 5 random questions
  const pool = QUESTIONS.slice();
  const picked = [];
  while (picked.length < 5 && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx,1)[0]);
  }

  // interactive flow: ask sequentially
  let current = 0;
  let correctCount = 0;
  const answers = [];

  const askQuestion = async (msg) => {
    const q = picked[current];
    const embed = new EmbedBuilder()
      .setTitle(`Question ${current+1}`)
      .setColor(0xD4AF37)
      .setDescription(q.q)
      .addFields(
        { name: "A", value: q.a[0], inline: true },
        { name: "B", value: q.a[1], inline: true },
        { name: "C", value: q.a[2], inline: true },
        { name: "D", value: q.a[3], inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mission_a:${userId}:${current}`).setLabel("A").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`mission_b:${userId}:${current}`).setLabel("B").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`mission_c:${userId}:${current}`).setLabel("C").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`mission_d:${userId}:${current}`).setLabel("D").setStyle(ButtonStyle.Primary)
    );

    if (msg) return msg.edit({ embeds: [embed], components: [row] });
    if (isInteraction) return interactionOrMessage.reply({ embeds: [embed], components: [row], fetchReply: true });
    return channel.send({ embeds: [embed], components: [row] });
  };

  // start
  const startMsg = await askQuestion(null);
  const collector = startMsg.createMessageComponentCollector({ time: 120000 });
  collector.on("collect", async i => {
    if (i.user.id !== userId) return i.reply({ content: "Not your mission.", ephemeral: true });
    const parts = i.customId.split(":");
    const choice = parts[0].split("_")[1];
    const q = picked[current];
    const idx = { a:0,b:1,c:2,d:3 }[choice];
    answers.push(idx);
    if (idx === q.correct) correctCount++;
    current++;
    if (current >= picked.length) {
      collector.stop();
      // award per-correct rewards
      let totalBeli = 0;
      const chestGain = { C:0,B:0,A:0 };
      for (let k=0;k<picked.length;k++) {
        if (answers[k] === picked[k].correct) {
          totalBeli += randInt(50,250);
          if (Math.random() <= 0.5) chestGain.C += randInt(1,2);
          if (Math.random() <= 0.1) chestGain.B += 1;
        }
      }
      // bonus for all correct
      if (correctCount === picked.length) {
        if (Math.random() <= 0.3) chestGain.C += 1;
        if (Math.random() <= 0.5) chestGain.B += 1;
        if (Math.random() <= 0.2) chestGain.A += 1;
      }

      bal.amount = (bal.amount || 0) + totalBeli;
      bal.lastMission = new Date();
      await bal.save();

      let inv = await Inventory.findOne({ userId });
      if (!inv) inv = new Inventory({ userId, items: {}, chests: { C:0,B:0,A:0,S:0 }, xpBottles:0 });
      inv.chests = inv.chests || { C:0,B:0,A:0,S:0 };
      inv.chests.C += chestGain.C;
      inv.chests.B += chestGain.B;
      inv.chests.A += chestGain.A;
      await inv.save();

      // Record quest progress for completing a mission (count each question as 1 mission)
      try {
        const [dailyQuests, weeklyQuests] = await Promise.all([
          Quest.getCurrentQuests("daily"),
          Quest.getCurrentQuests("weekly")
        ]);
        await Promise.all([
          dailyQuests.recordAction(userId, "mission", picked.length),
          weeklyQuests.recordAction(userId, "mission", picked.length)
        ]);
      } catch (e) {
        console.error("Failed to record mission quest progress:", e);
      }

      const resultEmbed = new EmbedBuilder()
        .setTitle("Mission Complete")
        .setColor(0xD4AF37)
        .setDescription(`You answered ${correctCount}/${picked.length} correctly. You earned ${totalBeli}¥.`)
        .addFields({ name: "Chests", value: `C: ${chestGain.C} • B: ${chestGain.B} • A: ${chestGain.A}` });

      return i.update({ embeds: [resultEmbed], components: [] });
    }
    // ask next question
    await i.update({ content: "Answer recorded.", embeds: [], components: [] });
    const nextMsg = await askQuestion(startMsg);
  });

}
