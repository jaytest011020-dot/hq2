const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbstock",
  version: "2.6.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "PVBR auto-stock per GC, aligned minutes, no prep message, no countdown, current time + next restock",
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
  "Mr-Carrot": "🥕🎩",
  "Mr Carrot": "🥕🎩",
  "Tomatrio": "🍅👨‍👦‍👦",
  "Shroombino": "🍄🎭",
  "Bat": "🦇",
  "Water Bucket": "🪣💧",
  "Frost Grenade": "🧊💣",
  "Banana Gun": "🍌🔫",
  "Frost Blower": "❄️🌬️",
  "Lucky Potion": "🍀🧪",
  "Speed Potion": "⚡🧪",
  "Carrot Launcher": "🥕🚀",
};

// Category emoji (for message boxes)
const CATEGORY_EMOJI = {
  "common": "🟢",
  "rare": "🌿",
  "epic": "🔵",
  "legendary": "🟣",
  "godly": "🟡",
  "mythic": "✨",
  "secret": "🎩",
  "unknown": "❔",
};

// Helpers
function getEmoji(name) {
  return ITEM_EMOJI[name] || "❔";
}

// Capitalize first letter
function capitalizeFirst(str) {
  if (!str) return "Unknown";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format items by category
function formatItems(items) {
  if (!items || items.length === 0) return "❌ Empty";

  const grouped = {};
  items.forEach(i => {
    const type = i.rarity ? i.rarity.toLowerCase() : "unknown";
    if (!grouped[type]) grouped[type] = [];

    grouped[type].push(
      `• ${getEmoji(i.name)} ${i.name}\n   🏷 Price: ${i.currentPrice ?? "N/A"}\n   📦 Stock: ${i.currentStock ?? "N/A"}\n`
    );
  });

  const CATEGORY_ORDER = ["common", "rare", "epic", "legendary", "godly", "mythic", "secret", "unknown"];
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

// Calculate next aligned restock time with a 20-second delay
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

// Send stock message with boxes for Seeds and Gear
async function sendStock(threadID, api) {
  const stock = await fetchPVBRStock();
  if (!stock || stock.length === 0) return api.sendMessage("⚠️ Failed to fetch PVBR stock.", threadID);

  const seeds = stock.filter(i => i.category.toLowerCase() === "seed");
  const gear = stock.filter(i => i.category.toLowerCase() === "gear");

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

// Start auto-stock
function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;
  scheduleNextStock(threadID, api);
}

// Stop auto-stock
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
