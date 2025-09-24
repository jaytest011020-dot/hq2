const { getData, setData } = require("../../database.js");
const fs = require("fs");

module.exports.config = {
  name: "pet",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Pet system: buy, feed, sell, level, XP, skills, rarity",
  usages: "/pet buy | /pet feed | /pet sell | /pet info",
  commandCategory: "economy",
  cooldowns: 3,
};

// Pet definitions
const PETS = [
  { name: "Cat", rarity: "Common", skill: "Bank Boost", priceRange: [500, 1000] },
  { name: "Dog", rarity: "Common", skill: "Coin Boost", priceRange: [500, 1000] },
  { name: "Rabbit", rarity: "Common", skill: "Job Boost", priceRange: [500, 1000] },
  { name: "Hamster", rarity: "Common", skill: "Bank Boost", priceRange: [500, 1000] },
  { name: "Parrot", rarity: "Rare", skill: "Coin Boost", priceRange: [1000, 5000] },
  { name: "Snake", rarity: "Rare", skill: "Job Boost", priceRange: [1000, 5000] },
  { name: "Wolf", rarity: "Epic", skill: "Bank Boost", priceRange: [15000, 25000] },
  { name: "Tiger", rarity: "Epic", skill: "Coin Boost", priceRange: [15000, 25000] },
  { name: "Lion", rarity: "Legendary", skill: "Job Boost", priceRange: [25000, 50000] },
  { name: "Dragon", rarity: "Legendary", skill: "Bank Boost", priceRange: [25000, 50000] },
  { name: "Phoenix", rarity: "Devine", skill: "Coin Boost", priceRange: [50000, 100000] },
  { name: "Unicorn", rarity: "Devine", skill: "Job Boost", priceRange: [50000, 100000] },
  { name: "Prismatic Dragon", rarity: "Prismatic", skill: "Bank Boost", priceRange: [100000, 500000] },
  { name: "Prismatic Phoenix", rarity: "Prismatic", skill: "Coin Boost", priceRange: [100000, 500000] }
];

// Helper function: random integer
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// XP requirement formula (linear)
function requiredXP(level) {
  return 10 + level; // each level requires 1 more XP than previous, starting at 11 XP
}

// Main command
module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID, messageID } = event;

  const userPetKey = `pet/${senderID}`;
  const userBankKey = `bank/${threadID}/${senderID}`;

  // Load user data
  let petData = (await getData(userPetKey)) || null;
  let bankData = (await getData(userBankKey)) || { balance: 0 };

  const command = args[0]?.toLowerCase() || "";

  // --- BUY PET ---
  if (command === "buy") {
    if (petData) return api.sendMessage("❌ You already have a pet. Sell it first to buy a new one.", threadID, messageID);

    let msg = "🛒 Available Pets to Buy:\n\n";
    PETS.forEach((p, i) => {
      const price = randomInt(p.priceRange[0], p.priceRange[1]);
      msg += `${i + 1}. ${p.name} [${p.rarity}] - ${price.toLocaleString()} coins | Skill: ${p.skill}\n`;
    });
    msg += `\nReply with the number of the pet to buy.`;

    // Save a temporary buy list in memory
    global.buyPetList = global.buyPetList || {};
    global.buyPetList[senderID] = PETS.map(p => ({ ...p, price: randomInt(p.priceRange[0], p.priceRange[1]) }));

    return api.sendMessage(msg, threadID, messageID);
  }

  // --- FEED PET ---
  if (command === "feed") {
    if (!petData) return api.sendMessage("❌ You don't have a pet to feed.", threadID, messageID);
    if (bankData.balance < 100) return api.sendMessage("❌ You need at least 100 coins to feed your pet.", threadID, messageID);

    bankData.balance -= 100;
    petData.xp = (petData.xp || 0) + 1;

    // Level up if XP meets requirement
    let leveledUp = false;
    while (petData.level < 100 && petData.xp >= requiredXP(petData.level)) {
      petData.xp -= requiredXP(petData.level);
      petData.level += 1;
      leveledUp = true;
    }

    await setData(userPetKey, petData);
    await setData(userBankKey, bankData);

    return api.sendMessage(
      `🍖 You fed your pet ${petData.name}.\n💰 100 coins deducted.\n` +
      `✨ Current Level: ${petData.level} | XP: ${petData.xp}/${requiredXP(petData.level)}\n` +
      `${leveledUp ? "🎉 Your pet leveled up!" : ""}`,
      threadID,
      messageID
    );
  }

  // --- SELL PET ---
  if (command === "sell") {
    if (!petData) return api.sendMessage("❌ You don't have a pet to sell.", threadID, messageID);

    // Calculate sell price based on rarity and level (simple formula)
    let basePrice = Math.floor((petData.price || 0) * (1 + petData.level / 100));
    bankData.balance += basePrice;

    await setData(userBankKey, bankData);
    await setData(userPetKey, null);

    return api.sendMessage(
      `💰 You sold your pet ${petData.name} for ${basePrice.toLocaleString()} coins.`,
      threadID,
      messageID
    );
  }

  // --- PET INFO ---
  if (command === "info") {
    if (!petData) return api.sendMessage("❌ You don't have a pet.", threadID, messageID);

    return api.sendMessage(
      `🐾 Your Pet Info:\n` +
      `Name: ${petData.name}\n` +
      `Rarity: ${petData.rarity}\n` +
      `Skill: ${petData.skill}\n` +
      `Level: ${petData.level}\n` +
      `XP: ${petData.xp}/${requiredXP(petData.level)}\n`,
      threadID,
      messageID
    );
  }

  // --- HANDLE BUY REPLY ---
  if (!isNaN(command) && global.buyPetList?.[senderID]) {
    const index = parseInt(command) - 1;
    const petToBuy = global.buyPetList[senderID][index];
    if (!petToBuy) return api.sendMessage("❌ Invalid selection.", threadID, messageID);
    if (bankData.balance < petToBuy.price) return api.sendMessage("❌ You don't have enough coins.", threadID, messageID);

    bankData.balance -= petToBuy.price;
    petData = { ...petToBuy, level: 1, xp: 0 };

    await setData(userBankKey, bankData);
    await setData(userPetKey, petData);

    delete global.buyPetList[senderID];

    return api.sendMessage(
      `🎉 You bought ${petData.name} [${petData.rarity}]!\nSkill: ${petData.skill}\nLevel: 1 | XP: 0\n💰 Coins left: ${bankData.balance.toLocaleString()}`,
      threadID,
      messageID
    );
  }

  // --- DEFAULT ---
  if (!petData) return api.sendMessage("❌ You don't have a pet. Use /pet buy to get one.", threadID, messageID);
  return api.sendMessage(
    `🐾 Your Pet Info:\n` +
    `Name: ${petData.name}\nRarity: ${petData.rarity}\nSkill: ${petData.skill}\nLevel: ${petData.level}\nXP: ${petData.xp}/${requiredXP(petData.level)}`,
    threadID,
    messageID
  );
};
