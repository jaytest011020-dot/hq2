const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");

// Constants
const FEED_COST = 100;
const MAX_LEVEL = 100;
const MAX_SKILL = 0.30; // 30% cap

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
];

// Helpers
function getRandomPrice(pet) {
  return Math.floor(Math.random() * (pet.maxPrice - pet.minPrice + 1)) + pet.minPrice;
}

function getNextLevelXP(level) {
  return level; // 1 XP per feed, linear growth
}

module.exports.config = {
  name: "pet",
  version: "1.1.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Pet system with buy, feed, stats, sell, rarity, skill, and leveling (level 100, skill 30%)",
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
        msg += `║ ${i+1}. ${p.name} (${p.rarity}) - Price: ${price.toLocaleString()} coins - Skill: ${p.skill.type}+${(p.skill.value*100).toFixed(2)}%\n`;
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
      skill: { ...petData.skill, value: 0 }, // Start skill at 0
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

    // Increase XP
    pet.xp += 1;
    const nextXP = getNextLevelXP(pet.level);

    // Level up if XP exceeds next level requirement
    if (pet.xp >= nextXP && pet.level < MAX_LEVEL) {
      pet.level += 1;
      pet.xp = 0;

      // Increase skill linearly, max 30%
      const skillIncrement = MAX_SKILL / MAX_LEVEL;
      pet.skill.value = Math.min(pet.skill.value + skillIncrement, MAX_SKILL);
    }

    await setData(`bank/${threadID}/${senderID}`, userBank);
    await setData(`pets/${threadID}/${senderID}`, pet);

    return api.sendMessage(`🍖 You fed your pet!\nLevel: ${pet.level}/${MAX_LEVEL}\nXP: ${pet.xp}/${getNextLevelXP(pet.level)}\nSkill: ${pet.skill.type}+${(pet.skill.value*100).toFixed(2)}%\n💰 Coins left: ${userBank.balance.toLocaleString()}`, threadID, messageID);
  }

  // ------------------ STATS ------------------
  if (command === "stats") {
    if (!pet) return api.sendMessage("❌ You don't have a pet.", threadID, messageID);

    const totalBars = 20;
    const filledBars = Math.floor((pet.skill.value / MAX_SKILL) * totalBars);
    const emptyBars = totalBars - filledBars;
    const progressBar = "█".repeat(filledBars) + "░".repeat(emptyBars);

    const msg = `🐾 Pet Stats
Name: ${pet.name}
Rarity: ${pet.rarity}
Level: ${pet.level}/${MAX_LEVEL}
XP: ${pet.xp}/${getNextLevelXP(pet.level)}
Skill: ${pet.skill.type}+${(pet.skill.value*100).toFixed(2)}%
Progress: [${progressBar}]`;

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
