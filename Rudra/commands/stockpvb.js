const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbstock",
  version: "3.1.2",
  hasPermssion: 3,
  credits: "Jaylord La Peña + ChatGPT",
  description: "PVBR auto-stock per GC, aligned minutes, auto-detect seeds & gear, with godly/secret seed alert",
  usePrefix: true,
  commandCategory: "pvb tools",
  usages: "/pvbstock on|off|check",
  cooldowns: 10,
};

// Allowed restock minutes
const ALLOWED_MINUTES = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56];

// Track scheduled timers per GC
const autoStockTimers = {};

// Emoji mapping
const ITEM_EMOJI = {
  "Cactus": "🌵",
  "Strawberry": "🍓",
  "Pumpkin": "🎃",
  "Sunflower": "🌻",
  "Dragon Fruit": "🐉🍉",
  "Eggplant": "🍆",
  "Watermelon": "🍉✨",
  "Grape": "🍇✨",
  "Cocotank": "🥥🛡️",
  "Carnivorous Plant": "🪴🦷",
  "CarnivorousPlant": "🪴🦷",
  "Carnivorous-Plant": "🪴🦷",
  "Mr Carrot": "🥕🎩",
  "MrCarrot": "🥕🎩",
  "Mr-Carrot": "🥕🎩",
  "Tomatrio": "🍅👨‍👦‍👦",
  "Shroombino": "🍄🎭",
  "Bat": "⚾",
  "Water Bucket": "🪣💧",
  "Frost Grenade": "🧊💣",
  "Banana Gun": "🍌🔫",
  "Frost Blower": "❄️🌬️",
  "Lucky Potion": "🍀🧪",
  "Speed Potion": "⚡🧪",
  "Carrot Launcher": "🥕🚀",
};

// Category emoji
const CATEGORY_EMOJI = {
  "common": "🟢",
  "rare": "🌿",
  "epic": "🔵",
  "legendary": "🟣",
  "mythic": "✨",
  "godly": "🟡",
  "secret": "🎩",
  "unknown": "❔",
};

// Manual rarity mapping
const MANUAL_RARITY = {
  "Cactus": "rare",
  "Strawberry": "rare",
  "Pumpkin": "epic",
  "Sunflower": "epic",
  "Dragon Fruit": "legendary",
  "Eggplant": "legendary",
  "Watermelon": "mythic",
  "Grape": "mythic",
  "Cocotank": "godly",
  "Carnivorous Plant": "godly",
  "Mr Carrot": "secret",
  "Tomatrio": "secret",
  "Shroombino": "secret",
  "Bat": "common",
  "Water Bucket": "epic",
  "Frost Grenade": "epic",
  "Banana Gun": "epic",
  "Frost Blower": "legendary",
  "Lucky Potion": "legendary",
  "Speed Potion": "legendary",
  "Carrot Launcher": "godly",
};

// Helpers
function getEmoji(name) {
  const cleanName = name.replace(/ Seed$/i, "");
  return ITEM_EMOJI[cleanName] || "❔";
}

function getRarity(name) {
  const cleanName = name.replace(/ Seed$/i, "");
  return MANUAL_RARITY[cleanName] || "unknown";
}

function capitalizeFirst(str) {
  if (!str) return "Unknown";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format items by category (auto-detect seeds or gear)
function formatItems(items) {
  if (!items || items.length === 0) return "❌ Empty";

  const grouped = {};
  items.forEach(i => {
    const type = getRarity(i.name);
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(`• ${getEmoji(i.name)} ${i.name.replace(/ Seed$/i, "")} (${i.currentStock ?? "N/A"})`);
  });

  const CATEGORY_ORDER = ["common", "rare", "epic", "legendary", "mythic", "godly", "secret", "unknown"];
  let output = "";
  CATEGORY_ORDER.forEach(cat => {
    if (grouped[cat]) {
      output += `[${CATEGORY_EMOJI[cat] || "❔"} ${capitalizeFirst(cat)}]\n${grouped[cat].join("\n")}\n\n`;
    }
  });

  return output.trim();
}

// Fetch stock from PVBR API
async function fetchPVBRStock() {
  try {
    const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock?since=0");
    return res.data?.items || [];
  } catch (e) {
    console.error("Error fetching PVBR stock:", e);
    return [];
  }
}

// Calculate next aligned restock time
function getNextRestock(date = null) {
  const now = date || new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const currentMinute = now.getMinutes();
  let nextMinute = ALLOWED_MINUTES.find(m => m > currentMinute);
  const next = new Date(now);

  if (nextMinute === undefined) {
    next.setHours(now.getHours() + 1);
    nextMinute = ALLOWED_MINUTES[0];
  }

  next.setMinutes(nextMinute);
  next.setSeconds(20);
  next.setMilliseconds(0);
  return next;
}

// Send stock message (auto-detect Seeds & Gear)
async function sendStock(threadID, api) {
  const stock = await fetchPVBRStock();
  if (!stock || stock.length === 0) return api.sendMessage("⚠️ Failed to fetch PVBR stock.", threadID);

  const seeds = stock.filter(i => i.name.toLowerCase().endsWith("seed"));
  const gear = stock.filter(i => !i.name.toLowerCase().endsWith("seed"));

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const nextRestock = getNextRestock(now);

  const msg = `
╭─────────────────╮
🌱 𝗣𝗹𝗮𝗻𝘁𝘀 𝘃𝘀 𝗕𝗿𝗮𝗶𝗻𝗿𝗼𝘁𝘀 𝗦𝘁𝗼𝗰𝗸 🌱
🕒 Current Time: ${now.toLocaleTimeString("en-PH", { hour12: true })}
🕒 Next Restock: ${nextRestock.toLocaleTimeString("en-PH", { hour12: true })}
╰─────────────────╯

╭─🌿 Seeds────────╮
${formatItems(seeds)}
╰─────────────────╯

╭─🛠️ Gear─────────╮
${formatItems(gear)}
╰─────────────────╯`;

  await api.sendMessage(msg, threadID);

  // 🔔 Extra alert for Godly or Secret seeds
  const rareSeeds = seeds.filter(s => {
    const rarity = getRarity(s.name);
    return rarity === "godly" || rarity === "secret";
  });

  if (rareSeeds.length > 0) {
    const rareList = rareSeeds.map(s => `${getEmoji(s.name)} ${s.name.replace(/ Seed$/i, "")} (${s.currentStock})`).join("\n");
    const alertMsg = `🚨 RARE SEED DETECTED 🚨\n\n${rareList}\n\n⚡ Join fast! Please choose a server that is NOT FULL:\n\nhttps://www.roblox.com/share?code=5a9bf02c4952464eaf9c0ae66eb456bf&type=Server\n\nhttps://www.roblox.com/share?code=d1afbbba2d5ed946b83caeb423a09e37&type=Server\n\nhttps://www.roblox.com/share?code=a7e01c0a62c66e4c8a572cd79e77070e&type=Server\n\nhttps://www.roblox.com/share?code=f9b0d9025486cb4494514ad5ee9cce54&type=Server`;
    await api.sendMessage(alertMsg, threadID);
  }
}

// Recursive scheduling
function scheduleNextStock(threadID, api) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNextRestock(now);
  const delay = next.getTime() - now.getTime();

  autoStockTimers[threadID] = setTimeout(async () => {
    await sendStock(threadID, api);
    scheduleNextStock(threadID, api);
  }, delay);
}

function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;
  scheduleNextStock(threadID, api);
}

function stopAutoStock(threadID) {
  if (autoStockTimers[threadID]) {
    clearTimeout(autoStockTimers[threadID]);
    delete autoStockTimers[threadID];
  }
}

// Command handler
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();
  let gcData = (await getData(`pvbstock/${threadID}`)) || { enabled: false };

  if (gcData.enabled && option && option !== "off" && option !== "check") {
    return api.sendMessage("⚠️ Auto-stock is already active.", threadID, messageID);
  }

  if (option === "on") {
    gcData.enabled = true;
    await setData(`pvbstock/${threadID}`, gcData);
    startAutoStock(threadID, api);
    return api.sendMessage("✅ PVBR Auto-stock enabled. Updates at aligned minutes + 20 seconds.", threadID, messageID);
  }

  if (option === "off") {
    gcData.enabled = false;
    await setData(`pvbstock/${threadID}`, gcData);
    stopAutoStock(threadID);
    return api.sendMessage("❌ PVBR Auto-stock disabled.", threadID, messageID);
  }

  if (option === "check") {
    const status = gcData.enabled ? "ON ✅" : "OFF ❌";
    return api.sendMessage(`📊 PVBR Auto-stock status: ${status}`, threadID, messageID);
  }

  api.sendMessage("⚠️ Usage: /pvbstock on|off|check", threadID, messageID);
};

// Resume on restart
module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("pvbstock")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — PVBR Auto-stock resumed.", tid);
    }
  }
};
