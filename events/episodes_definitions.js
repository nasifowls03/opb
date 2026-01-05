// Complete episode definitions with all episodes using a uniform stage-based structure.
// Each episode has a `stages` array where each stage can be:
// - { type: 'embed', title, description, image, rewards }
// - { type: 'fight', title, enemies: [ { id, name, health, attack: [min,max] }, ... ] }
// - { type: 'accuracy', title, description, image, duration, tick, successWindow }
// - { type: 'reward', title, description, image }
//
// Rewards format (displayed to player):
// - { type: 'beli', amount: 'min-max' | number, hardOnly: false }
// - { type: 'chest', rank: 'C'|'B'|'A'|'S', amount: number, hardOnly: false }
// - { type: 'card', name: 'CardName', hardOnly: false }
// - { type: 'reset', amount: number, hardOnly: false }
// - { type: 'blueprint', name: 'BlueprintName', hardOnly: false }

// Helper function to format rewards for display
export function formatRewardsList(rewards, difficulty) {
  if (!rewards || !Array.isArray(rewards)) return '';
  const lines = [];
  for (const reward of rewards) {
    if (reward.hardOnly && difficulty !== 'hard') continue;
    if (reward.type === 'beli') {
      if (typeof reward.amount === 'string') {
        lines.push(`${reward.amount} beli`);
      } else {
        lines.push(`${reward.amount} beli`);
      }
    } else if (reward.type === 'chest') {
      const label = reward.hardOnly ? ` (Hard mode exclusive)` : '';
      lines.push(`${reward.amount}x ${reward.rank} chest${label}`);
    } else if (reward.type === 'card') {
      const label = reward.hardOnly ? ` (Hard mode exclusive)` : '';
      lines.push(`1x ${reward.name}${label}`);
    } else if (reward.type === 'reset') {
      const label = reward.hardOnly ? ` (Hard mode exclusive)` : '';
      lines.push(`${reward.amount}x Reset Token${label}`);
    } else if (reward.type === 'blueprint') {
      const label = reward.hardOnly ? ` (Hard mode exclusive)` : '';
      lines.push(`1x ${reward.name}${label}`);
    }
  }
  return lines.length > 0 ? '**Possible Rewards:**\n' + lines.join('\n') : '';
}

export const episodes = {
  0: {
    title: 'Introduction - Episode 0',
    stages: [
      {
        type: 'embed',
        title: 'Introduction - Episode 0',
        image: 'https://files.catbox.moe/6953qz.gif',
        description: '**Introduction - Episode 0**\n\nThis is where your journey starts, Pirate !\nIn this journey, you will be walking the same steps as Luffy into being the future pirate king!\nBuild your team, get your items ready and be ready to fight, because this will be a hard journey.. Or will it ? Choose the difficulty of your journey on the dropdown below. You can always change the difficulty later with command `op settings` or `/settings` if you ever change your mind.\n\nAs you progress, the enemies will get stronger. I recommend preserving your items for future stages.\n\n**%USERNAME%\'s Deck**\n%TEAMNAMES%\n\n**Next Episode**\nI\'m Luffy! The Man Who Will Become the Pirate King!',
        rewards: []
      }
    ]
  },
  1: {
    title: "I'm Luffy! The Man Who Will Become the Pirate King!",
    stages: [
      {
        type: 'embed',
        title: "I'm Luffy! The Man Who Will Become the Pirate King! - Episode 1",
        image: 'https://files.catbox.moe/zlda8y.webp',
        description: 'Luffy is found floating at sea by a cruise ship. After repelling an invasion by the Alvida Pirates, he meets a new ally, their chore boy Koby.',
        rewards: [
          { type: 'beli', amount: '100-250', hardOnly: false },
          { type: 'chest', rank: 'C', amount: 1, hardOnly: false },
          { type: 'card', name: 'Koby', hardOnly: false },
          { type: 'card', name: 'Alvida', hardOnly: true },
          { type: 'card', name: 'Heppoko', hardOnly: true },
          { type: 'card', name: 'Peppoko', hardOnly: true },
          { type: 'card', name: 'Poppoko', hardOnly: true },
          { type: 'card', name: 'Alvida pirates banner blueprint', hardOnly: true },
          { type: 'reset', amount: 1, hardOnly: true }
        ]
      },
       {
        type: 'embed',
        title: "Luffy's Entrance - Stage 1",
        image: 'https://files.catbox.moe/s38lnj.webp',
        description: 'Sailors on a passing cruise ship retrieve the barrel, but the ship is attacked with cannon fire by a nearby pirate ship, led by Alvida.Koby and other pirates notice the barrel in the kitchen and find Luffy inside, who was sleeping.'
      },
      {
        type: 'fight',
        title: 'VS 3 Alvida Pirates',
        enemies: [
          { id: 'Heppoko', name: 'Heppoko', health: 50, attack: [5, 10] },
          { id: 'Poppoko', name: 'Poppoko', health: 50, attack: [5, 10] },
          { id: 'Peppoko', name: 'Peppoko', health: 50, attack: [5, 10] }
        ]
      },
       {
        type: 'embed',
        title: "Luffy and koby's talk - stage 3",
        image: 'https://files.catbox.moe/fktdd1.webp',
        description: 'Koby explains that he was riding on a rowboat, but was kidnapped by the Alvida Pirates and forced to become a chore boy. He explains his desires to escape the Alvida Pirates some day and join the Marines.'
      },
      {
type: 'fight',
        title: 'VS 3 Alvida Pirates',
        enemies: [
          { id: 'Alvida', name: 'Alvida', health: 95, attack: [5, 15] },
        ]
      },
       {
        type: 'reward',
        title: "Luffy and koby's escape - stage 5",
        image: 'https://files.catbox.moe/8mq5rl.webp',
        description: 'Having concluded the battle, Luffy boards a dinghy with Koby to continue his travels, catching a glimpse of the female burglar who was also departing the ship on her own dinghy. Luffy aims towards the Grand Line to search for the One Piece treasure but first looks to recruit the infamous Pirate Hunter Roronoa Zoro into his crew.'
      },
    ]
  },
  2: {
    title: 'The Great Swordsman Appears! Pirate Hunter Roronoa Zoro',
    stages: [
      {
        type: 'embed',
        title: 'The Great Swordsman Appears! Pirate Hunter Roronoa Zoro - Episode 2',
        image: 'https://files.catbox.moe/pdfqe1.webp',
        description: 'Luffy and Koby find Zoro captured in Shells Town\'s Marine base, confront the tyrannical Captain Morgan and rescue Zoro.',
        rewards: [
          { type: 'beli', amount: '100-200', hardOnly: false },
          { type: 'chest', rank: 'C', amount: 1, hardOnly: false },
          { type: 'card', name: 'Rika', hardOnly: false },
          { type: 'card', name: 'Roronoa Zoro', hardOnly: false },
          { type: 'card', name: 'Helmeppo', hardOnly: true }
        ]
      },
      {
        type: 'fight',
        title: 'VS Marine Guards',
        enemies: [
          { id: 'guard1', name: 'Marine Guard 1', health: 80, attack: [10, 18] },
          { id: 'guard2', name: 'Marine Guard 2', health: 80, attack: [10, 18] }
        ]
      },
      {
        type: 'reward',
        title: 'Zoro Joins! - Episode 2',
        image: 'https://files.catbox.moe/pdfqe1.webp',
        description: 'Roronoa Zoro, the Pirate Hunter, joins Luffy as the swordsman of the crew.'
      }
    ]
  },
  3: {
    title: "Morgan vs. Luffy! Who's This Mysterious Beautiful Young Girl?",
    stages: [
      {
        type: 'embed',
        title: "Morgan vs. Luffy! Who's This Mysterious Beautiful Young Girl? - Episode 3",
        image: 'https://files.catbox.moe/8os33p.webp',
        description: 'Luffy and Zoro battle and defeat Morgan and the Marines. Koby parts ways with Luffy to join the Marines, and Zoro joins Luffy\'s crew.',
        rewards: [
          { type: 'beli', amount: '250-500', hardOnly: false },
          { type: 'chest', rank: 'C', amount: 1, hardOnly: false },
          { type: 'card', name: 'Axe-Hand Morgan', hardOnly: true }
        ]
      },
      {
        type: 'fight',
        title: 'VS Axe-Hand Morgan',
        enemies: [
          { id: 'morgan', name: 'Axe-Hand Morgan', health: 150, attack: [18, 28] }
        ]
      },
      {
        type: 'reward',
        title: 'Morgan Defeated! - Episode 3',
        image: 'https://files.catbox.moe/8os33p.webp',
        description: 'Koby joins the Marines to reform them from within. Luffy, Zoro, and their new allies set sail.'
      }
    ]
  },
  4: {
    title: "Luffy's Past! The Red-Haired Shanks Appears",
    stages: [
      {
        type: 'embed',
        title: "Luffy's Past! The Red-Haired Shanks Appears - Episode 4",
        image: 'https://files.catbox.moe/9dry00.webp',
        description: 'Luffy\'s backstory with Shanks is revealed. After flashbacks showing Luffy\'s past, enemies emerge.',
        rewards: [
          { type: 'beli', amount: '100-200', hardOnly: false },
          { type: 'chest', rank: 'C', amount: 1, hardOnly: false },
          { type: 'blueprint', name: 'Straw Hat', hardOnly: false },
          { type: 'card', name: 'Higuma', hardOnly: true },
          { type: 'card', name: 'Lord of the Coast', hardOnly: true }
        ]
      },
      {
        type: 'fight',
        title: 'VS Higuma',
        enemies: [
          { id: 'higuma', name: 'Higuma', health: 140, attack: [15, 25] }
        ]
      },
      {
        type: 'reward',
        title: 'Straw Hat Recovered - Episode 4',
        image: 'https://files.catbox.moe/9dry00.webp',
        description: 'Luffy recovers his precious straw hat and Shanks makes a meaningful sacrifice.'
      }
    ]
  },
  5: {
    title: 'Alliance with Nami / Betrayal',
    stages: [
      {
        type: 'embed',
        title: 'Alliance with Nami / Betrayal - Episode 5',
        image: 'https://files.catbox.moe/tr1o0x.webp',
        description: 'After collaborating with Luffy to escape from the Buggy Pirates, events escalate and betrayals occur.',
        rewards: [
          { type: 'beli', amount: '100-200', hardOnly: false },
          { type: 'chest', rank: 'C', amount: 1, hardOnly: false }
        ]
      },
      {
        type: 'fight',
        title: 'VS Buggy Pirates Scouts',
        enemies: [
          { id: 'scout1', name: 'Buggy Scout 1', health: 100, attack: [12, 20] },
          { id: 'scout2', name: 'Buggy Scout 2', health: 100, attack: [12, 20] }
        ]
      },
      {
        type: 'reward',
        title: 'Nami\'s Secret - Episode 5',
        image: 'https://files.catbox.moe/tr1o0x.webp',
        description: 'Nami reveals her true intentions and uneasy alliance with the crew.'
      }
    ]
  },
  6: {
    title: 'Desperate Situation! Beast Tamer Mohji vs. Luffy!',
    stages: [
      {
        type: 'embed',
        title: 'Desperate Situation! Beast Tamer Mohji vs. Luffy! - Episode 6',
        image: 'https://files.catbox.moe/gzwyfp.webp',
        description: 'Luffy faces increasing dangers and must overcome powerful enemies. Mohji and his beast Richie stand in the way.',
        rewards: [
          { type: 'beli', amount: '100-200', hardOnly: false },
          { type: 'chest', rank: 'C', amount: 1, hardOnly: false },
          { type: 'card', name: 'Chouchou', hardOnly: false },
          { type: 'card', name: 'Boodle', hardOnly: false },
          { type: 'card', name: 'Mohji', hardOnly: true },
          { type: 'card', name: 'Richie', hardOnly: true }
        ]
      },
      {
        type: 'fight',
        title: 'VS Richie and Mohji',
        enemies: [
          { id: 'richie', name: 'Richie', health: 140, attack: [14, 24] },
          { id: 'mohji', name: 'Mohji', health: 130, attack: [14, 24] }
        ]
      },
      {
        type: 'reward',
        title: 'Victory! - Episode 6',
        image: 'https://files.catbox.moe/gzwyfp.webp',
        description: 'Luffy emerges victorious. The crew moves forward toward their dream of the Grand Line.'
      }
    ]
  },
  7: {
    title: 'Grand Duel! Zoro vs Cabaji',
    stages: [
      {
        type: 'embed',
        title: 'Grand Duel! Zoro the Swordsman vs. Cabaji the Acrobat! - Episode 7',
        image: 'https://files.catbox.moe/py6qcw.webp',
        description: "Zoro takes on Buggy's acrobat and chief of staff, Cabaji, engaging in a one-on-one sword fight. After Zoro emerges victorious, Luffy battles against Buggy, where his straw hat is damaged by Buggy's attacks.",
        rewards: [
          { type: 'beli', amount: '100-200', hardOnly: false },
          { type: 'chest', rank: 'C', amount: 1, hardOnly: false },
          { type: 'blueprint', name: 'Grand Line Map', hardOnly: false }
        ]
      },
      {
        type: 'accuracy',
        title: 'Buggy ball! - stage 1',
        image: 'https://files.catbox.moe/ulywre.webp',
        description: 'Buggy fires a Buggy Ball at the group; stop the bar as close to the end as possible.',
        duration: 10000,
        tick: 500,
        successWindow: 1500
      },
      {
        type: 'embed',
        title: 'Deflected! - stage 2',
        image: 'https://files.catbox.moe/nz5xp6.webp',
        description: "Luffy deflects the cannonball using his rubber body, firing the projectile back at the Buggy Pirates. Cabaji offers to battle the group on Buggy's behalf, and Zoro decides to duel him one-on-one."
      },
      {
        type: 'fight',
        title: 'VS Richie and Cabaji',
        enemies: [
          { id: 'richie', name: 'Richie', health: 140, attack: [14, 24] },
          { id: 'cabaji', name: 'Cabaji', health: 130, attack: [14, 24] }
        ]
      },
      {
        type: 'reward',
        title: 'Inside the treasure - stage 4',
        image: 'https://files.catbox.moe/py6qcw.webp',
        description: 'Nami opens a chest and finds a Grand Line map. The Grand Line map is awarded to the player inventory when claimed.'
      }
    ]
  },
  8: {
    title: 'Who Will Win? Showdown Between the True Powers of the Devil Fruit!',
    stages: [
      {
        type: 'fight',
        title: 'Fight vs Buggy',
        enemies: [
          { id: 'buggy', name: 'Buggy', health: 190, attack: [25, 40], special: { name: 'Bara Bara festival', range: [100, 140], usedAtStart: true } }
        ]
      },
      {
        type: 'embed',
        title: "Buggy's backstory - stage 2",
        image: 'https://files.catbox.moe/i24rh5.webp',
        description: 'Buggy reveals his relationship with Shanks...'
      },
      {
        type: 'embed',
        title: "Buggy's backstory - stage 3",
        image: 'https://files.catbox.moe/mburzx.webp',
        description: 'Buggy ate a fake Devil Fruit...'
      },
      {
        type: 'accuracy',
        title: 'Present time: you beat the hell out of him - stage 4',
        image: 'https://files.catbox.moe/w1fn7t.webp',
        duration: 8000,
        tick: 500,
        successWindow: 1200
      },
      {
        type: 'embed',
        title: 'Off you go bud - stage 5',
        image: 'https://files.catbox.moe/5n4lin.webp',
        description: 'Luffy sends Buggy flying; Nami gives Luffy the Grand Line map.'
      }
    ]
  }
};

export const locations = {
  orange_town: { name: 'Orange town - East Blue', color: 0xFA8628, episodes: [4,5,6,7] },
  shells_town: { name: 'Shells Town - East Blue', color: 0x3498db, episodes: [2,3] },
  beginning: { name: 'Starting Point', color: 0x2ecc71, episodes: [1] }
};

export default { episodes, formatRewardsList, locations };
