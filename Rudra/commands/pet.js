const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");

// Constants
const FEED_COST = 100;
const MAX_LEVEL = 100;

// Pet rarities with fixed names, skill type and percent
const PET_SHOP = [
  { name: "Fluffy", rarity: "Common", skill: { type: "coinBoost", value: 0.05 }, minPrice: 500, maxPrice: 1000 },
  { name: "Shadow", rarity: "Rare", skill: { type: "coinBoost", value: 0.10 }, minPrice: 1000, maxPrice: 5000 },
  { name: "Thunder", rarity: "Epic", skill: { type: "coinBoost", value: 0.15 }, minPrice: 15000, maxPrice: 25000 },
  { name: "Blaze", rarity: "Legendary", skill: { type: "coinBoost", value: 0.20 }, minPrice: 25000, maxPrice: 50000 },
  { name: "Aurora", rarity: "Devine", skill: { type: "coinBoost", value: 0.25 }, minPrice: 50000, maxPrice: 100000 },
  { name: "Prism", rarity: "Prismatic", skill: { type: "coinBoost", value: 0.30 }, minPrice: 100000, maxPrice: 500000 },
  { name: "Sparky", rarity: "Common", skill: { type: "bankBoost", value: 0.02 }, minPrice: 500, maxPrice: 1000 },
  { name: "Luna", rarity: "Rare", skill: { type: "bankBoost", value: 0.05 }, minPrice: 1000, maxPrice: 5000 },
  { name: "Nova", rarity: "Epic", skill: { type: "bankBoost", value: 0.08 }, minPrice: 15000, maxPrice: 25000 },
  { name: "Titan", rarity: "Legendary", skill: { type: "bankBoost", value: 0.10 }, minPrice: 25000, maxPrice: 50000 },
  { name: "Zephyr", rarity: "Devine", skill: { type: "bankBoost", value: 0.15 }, minPrice: 50000, maxPrice: 100000 },
  { name: "Galaxy", rarity: "Prismatic", skill: { type: "bankBoost", value: 0.20 }, minPrice: 100000, maxPrice: 500000 },
  { name: "Bolt", rarity: "Common", skill: { type: "jobBoost", value: 0.03 }, minPrice: 500, maxPrice: 1000 },
  { name: "Viper", rarity: "Rare", skill: { type: "jobBoost", value: 0.05 }, minPrice: 1000, maxPrice: 5000 },
  { name: "Fury", rarity: "Epic", skill: { type: "jobBoost", value: 0.10 }, minPrice: 15000, maxPrice: 25000 },
  { name: "Shadowfang", rarity: "Legendary", skill: { type: "jobBoost", value: 0.15 }, minPrice: 25000, maxPrice: 50000 },
  { name: "Eclipse", rarity: "Devine", skill: { type: "jobBoost", value: 0.20 }, minPrice: 50000, maxPrice: 100000 },
  { name: "Celestia", rarity: "Prismatic", skill: { type: "jobBoost", value: 0.25 }, minPrice: 100000, maxPrice: 500000 },
  { name: "Frost", rarity: "Common", skill: { type: "coinBoost", value: 0.05 }, minPrice: 500, maxPrice: 1000 },
  { name: "Inferno", rarity: "Rare", skill: { type: "coinBoost", value: 0.10 }, minPrice: 1000, maxPrice: 5000 },
];

// Helpers
function getRandomPrice(pet) {
  return Math.floor(Math.random() * (pet.maxPrice - pet.minPrice + 1)) + pet.minPrice;
}

function getNextLevelXP(level) {
  return level; // 1 XP per feed, required XP increases linearly
}

module.exports.config = {
  name: "pet",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Pet system with buy, feed, stats, sell, rarity, skill, and leveling",
  usages: "/pet buy | /pet feed | /pet stats | /pet sell",
  commandCategory: "economy",
  cooldowns: 3,
};

module.exports.run = async function({ api, event, args, Users }) {
  const { senderID, threadID, messageID } = event;
  const command = args[0]?.toLowerCase();
  const userBank = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };
  let pet = (await getData(`pets/${threadID}/${senderID}`)) || null;

  // ------------------ BUY ------------------
  if (command === "buy") {
    if (!args[1]) {
      let msg = "╔══ Available Pets ══\n";
      PET_SHOP.forEach((p, i) => {
        const price = getRandomPrice(p);
        msg += `║ ${i+1}. ${p.name} (${p.rarity}) - Price: ${price.toLocaleString()} coins - Skill: ${p.skill.type}+${p.skill.value*100}%\n`;
      });
      msg += "╚═════════════════\nUse: /pet buy <pet_name>";
      return api.sendMessage(msg, threadID, messageID);
    }

    if (pet) return api.sendMessage("❌ You already have a pet. Sell it before buying a new one.", threadID, messageID);

    const petNameInput = args[1];
    const petData = PET_SHOP.find(p => p.name.toLowerCase() === petNameInput.toLowerCase());
    if (!petData) return api.sendMessage("❌ Invalid pet name.", threadID, messageID);

    const price = getRandomPrice(petData);
    if (userBank.balance < price) return api.sendMessage("❌ You don't have enough coins.", threadID, messageID);

    userBank.balance -= price;
    await setData(`bank/${threadID}/${senderID}`, userBank);

    pet = {
      name: petData.name,
      rarity: petData.rarity,
      skill: petData.skill,
      xp: 0,
      level: 1,
    };
    await setData(`pets/${threadID}/${senderID}`, pet);

    return api.sendMessage(`✅ You bought ${petData.name} (${petData.rarity}) for ${price.toLocaleString()} coins!`, threadID, messageID);
  }

  // ------------------ FEED ------------------
  if (command === "feed") {
    if (!pet) return api.sendMessage("❌ You don't have a pet to feed.", threadID, messageID);
    if (userBank.balance < FEED_COST) return api.sendMessage(`❌ You need ${FEED_COST} coins to feed your pet.`, threadID, messageID);

    userBank.balance -= FEED_COST;
    pet.xp += 1;

    const nextXP = getNextLevelXP(pet.level);
    if (pet.xp >= nextXP && pet.level < MAX_LEVEL) {
      pet.level += 1;
      pet.xp = 0;
    }

    await setData(`bank/${threadID}/${senderID}`, userBank);
    await setData(`pets/${threadID}/${senderID}`, pet);

    return api.sendMessage(`🍖 You fed your pet!\nLevel: ${pet.level}, XP: ${pet.xp}/${getNextLevelXP(pet.level)}\n💰 Coins left: ${userBank.balance.toLocaleString()}`, threadID, messageID);
  }

  // ------------------ STATS ------------------
  if (command === "stats") {
    if (!pet) return api.sendMessage("❌ You don't have a pet.", threadID, messageID);

    const msg = `🐾 Pet Stats
Name: ${pet.name}
Rarity: ${pet.rarity}
Level: ${pet.level}
XP: ${pet.xp}/${getNextLevelXP(pet.level)}
Skill: ${pet.skill.type}+${pet.skill.value*100}%`;

    return api.sendMessage(msg, threadID, messageID);
  }

  // ------------------ SELL ------------------
  if (command === "sell") {
    if (!pet) return api.sendMessage("❌ You don't have a pet to sell.", threadID, messageID);

    const sellPrice = getRandomPrice(PET_SHOP.find(p => p.name === pet.name));
    userBank.balance += sellPrice;

    await setData(`bank/${threadID}/${senderID}`, userBank);
    await setData(`pets/${threadID}/${senderID}`, null);

    return api.sendMessage(`💰 You sold your ${pet.name} (${pet.rarity}) for ${sellPrice.toLocaleString()} coins!`, threadID, messageID);
  }

  return api.sendMessage("❌ Invalid pet command. Use /pet buy | /pet feed | /pet stats | /pet sell", threadID, messageID);
};
