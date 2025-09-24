const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");

// Cost per feed
const FEED_COST = 100;
const MAX_LEVEL = 100;

// Pet rarities and their attributes
const PET_RARITIES = [
  { name: "Common", minPrice: 500, maxPrice: 1000, skills: { coinBoost: 0.05, bankBoost: 0.02, jobBoost: 0.03 } },
  { name: "Rare", minPrice: 1000, maxPrice: 5000, skills: { coinBoost: 0.10, bankBoost: 0.05, jobBoost: 0.05 } },
  { name: "Epic", minPrice: 15000, maxPrice: 25000, skills: { coinBoost: 0.15, bankBoost: 0.08, jobBoost: 0.10 } },
  { name: "Legendary", minPrice: 25000, maxPrice: 50000, skills: { coinBoost: 0.20, bankBoost: 0.10, jobBoost: 0.15 } },
  { name: "Devine", minPrice: 50000, maxPrice: 100000, skills: { coinBoost: 0.25, bankBoost: 0.15, jobBoost: 0.20 } },
  { name: "Prismatic", minPrice: 100000, maxPrice: 500000, skills: { coinBoost: 0.30, bankBoost: 0.20, jobBoost: 0.25 } },
];

// Helper to get random price within rarity
function getRandomPrice(rarity) {
  return Math.floor(Math.random() * (rarity.maxPrice - rarity.minPrice + 1)) + rarity.minPrice;
}

// Helper to calculate XP needed for next level (e.g., 100 * level)
function getNextLevelXP(level) {
  return level * 100;
}

module.exports.config = {
  name: "pet",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Pet system with buy, feed, stats, sell, rarity and skills",
  usages: "/pet buy | /pet feed | /pet stats | /pet sell",
  commandCategory: "economy",
  cooldowns: 3,
};

module.exports.run = async function({ api, event, args, Users }) {
  const { senderID, threadID, messageID } = event;
  const command = args[0]?.toLowerCase();

  const userBank = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };

  // Load user's pet
  let pet = (await getData(`pets/${threadID}/${senderID}`)) || null;

  // ------------------ BUY ------------------
  if (command === "buy") {
    let msg = "╔══ Available Pets ══\n";
    PET_RARITIES.forEach((r, i) => {
      const price = getRandomPrice(r);
      msg += `║ ${i+1}. ${r.name} - Price: ${price.toLocaleString()} coins - Skills: Coin+${r.skills.coinBoost*100}%, Bank+${r.skills.bankBoost*100}%, Job+${r.skills.jobBoost*100}%\n`;
    });
    msg += "╚═════════════════\nUse: /pet buy <rarity>";
    return api.sendMessage(msg, threadID, messageID);
  }

  // Buy a pet by rarity
  if (args[0] && args[0].toLowerCase() === "buy" && args[1]) {
    if (pet) return api.sendMessage("❌ You already have a pet. Sell it before buying a new one.", threadID, messageID);

    const rarityInput = args[1].toLowerCase();
    const rarity = PET_RARITIES.find(r => r.name.toLowerCase() === rarityInput);
    if (!rarity) return api.sendMessage("❌ Invalid rarity.", threadID, messageID);

    const price = getRandomPrice(rarity);
    if (userBank.balance < price) return api.sendMessage("❌ You don't have enough coins.", threadID, messageID);

    userBank.balance -= price;
    await setData(`bank/${threadID}/${senderID}`, userBank);

    pet = {
      name: rarity.name + " Pet",
      rarity: rarity.name,
      skills: rarity.skills,
      xp: 0,
      level: 1
    };
    await setData(`pets/${threadID}/${senderID}`, pet);

    return api.sendMessage(`✅ You bought a ${rarity.name} pet for ${price.toLocaleString()} coins!`, threadID, messageID);
  }

  // ------------------ FEED ------------------
  if (command === "feed") {
    if (!pet) return api.sendMessage("❌ You don't have a pet to feed.", threadID, messageID);
    if (userBank.balance < FEED_COST) return api.sendMessage(`❌ You need ${FEED_COST} coins to feed your pet.`, threadID, messageID);

    userBank.balance -= FEED_COST;
    pet.xp += 1;

    // Level up
    const nextXP = getNextLevelXP(pet.level);
    if (pet.xp >= nextXP && pet.level < MAX_LEVEL) {
      pet.level += 1;
      pet.xp = 0;
    }

    await setData(`bank/${threadID}/${senderID}`, userBank);
    await setData(`pets/${threadID}/${senderID}`, pet);

    return api.sendMessage(`🍖 You fed your pet! Level: ${pet.level}, XP: ${pet.xp}/${getNextLevelXP(pet.level)}\n💰 Coins left: ${userBank.balance.toLocaleString()}`, threadID, messageID);
  }

  // ------------------ STATS ------------------
  if (command === "stats") {
    if (!pet) return api.sendMessage("❌ You don't have a pet.", threadID, messageID);

    const msg = `🐾 Pet Stats
Name: ${pet.name}
Rarity: ${pet.rarity}
Level: ${pet.level}
XP: ${pet.xp}/${getNextLevelXP(pet.level)}
Skills:
💰 Coin Boost: ${pet.skills.coinBoost*100}%
🏦 Bank Boost: ${pet.skills.bankBoost*100}%
💼 Job Boost: ${pet.skills.jobBoost*100}%`;

    return api.sendMessage(msg, threadID, messageID);
  }

  // ------------------ SELL ------------------
  if (command === "sell") {
    if (!pet) return api.sendMessage("❌ You don't have a pet to sell.", threadID, messageID);

    const sellPrice = getRandomPrice(PET_RARITIES.find(r => r.name === pet.rarity));
    userBank.balance += sellPrice;

    await setData(`bank/${threadID}/${senderID}`, userBank);
    await setData(`pets/${threadID}/${senderID}`, null);

    return api.sendMessage(`💰 You sold your ${pet.rarity} pet for ${sellPrice.toLocaleString()} coins!`, threadID, messageID);
  }

  // Default message
  return api.sendMessage("❌ Invalid pet command. Use /pet buy | /pet feed | /pet stats | /pet sell", threadID, messageID);
};
