module.exports.config = {
  name: "fusemachine",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Shows plant fusion recipes with rarity",
  commandCategory: "pvb tools",
  usages: "/fusemachine",
  cooldowns: 5,
};

// Fusion data
const FUSIONS = [
  { name: "Noobini Cactusini", ingredients: "Cactus + Noobini Bananani", rarity: "Rare" },
  { name: "Orangutini Strawberrini", ingredients: "Strawberry + Orangutini Annanasini", rarity: "Rare" },
  { name: "Svinino Pumpkinino", ingredients: "Pumpkin + Svinino Bombondino", rarity: "Epic" },
  { name: "Brr Brr Sunflowerim", ingredients: "Sunflower + Brr Brr Patapim", rarity: "Epic" },
  { name: "Dragonfrutina Dolphinita", ingredients: "Dragon Fruit + Bananita Dolphinita", rarity: "Legendary" },
  { name: "Eggplantini Burbalonini", ingredients: "Eggplant + Burbaloni Lulioli", rarity: "Legendary" },
  { name: "Bombardilo Watermelondrilo", ingredients: "Watermelon + Bombardiro Crocodilo", rarity: "Mythic" },
  { name: "Cocotanko Giraffanto", ingredients: "Cocotank + Giraffa Celeste", rarity: "Godly" },
  { name: "Carnivourita Tralalerita", ingredients: "Carnivorous Plant + Tralalelo Tralala", rarity: "Godly" },
  { name: "Los Mr Carrotitos", ingredients: "Mr Carrot + Los Tralalitos", rarity: "Secret" },
];

// Emoji mapping by rarity
const RARITY_EMOJI = {
  "Rare": "🌿",
  "Epic": "🔵",
  "Legendary": "🟣",
  "Mythic": "✨",
  "Godly": "🟡",
  "Secret": "🎩",
};

module.exports.run = async function({ api, event }) {
  const { threadID } = event;

  let msg = "🌱 𝗙𝘂𝘀𝗲 𝗠𝗮𝗰𝗵𝗶𝗻𝗲 𝗥𝗲𝗰𝗶𝗽𝗲𝘀 🌱\n\n";

  FUSIONS.forEach(f => {
    msg += `${RARITY_EMOJI[f.rarity] || "❔"} ${f.name}\nIngredients: ${f.ingredients}\nRarity: ${f.rarity}\n\n`;
  });

  return api.sendMessage(msg.trim(), threadID);
};
