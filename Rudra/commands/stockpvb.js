const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stockpvb",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Plants vs Brainrots auto-stock with emoji and styled boxes",
  usePrefix: true,
  commandCategory: "pvbr tools",
  usages: "/stockpvb on|off|check",
  cooldowns: 10,
};

const autoStockTimers = {};

// Emoji mapping
const ITEM_EMOJI = {
  // Seeds/plants
  "Cactus": "🌵",
  "Strawberry": "🍓",
  "Pumpkin": "🎃",
  "Sunflower": "🌻",
  "Dragon Fruit": "🐉🍉",
  "Eggplant": "🍆",

  // Mythic plants
  "WatermelonE": "🍉✨",
  "Grape": "🍇✨",

  // Godly plants
  "Cocotank": "🥥🛡️",
  "Carnivorous plant": "🪴🦷",

  // Secret plants
  "Mr-carrot": "🥕🎩",
  "Tomatrio": "🍅👨‍👦‍👦",
  "Shroombino": "🍄🎭",

  // Gear
  "Water Bucket": "🪣💧",
  "Frost Grenade": "🧊💣",
  "Banana Gun": "🍌🔫",
  "Frost Blower": "❄️🌬️",
  "Lucky Potion": "🍀🧪",
  "Speed Potion": "⚡🧪",
  "Carrot Launcher": "🥕🚀"
};

// Helper to get emoji
function getEmoji(name) {
  return ITEM_EMOJI[name] || "❔";
}

// Fetch stock from pvbr API
async function fetchPVBRStock() {
  try {
    const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock?since=0");
    return res.data?.data || [];
  } catch (e) {
    console.error("Error fetching PVBR stock:", e);
    return [];
  }
}

// Format stock text
function formatStock(items) {
  if (!items || items.length === 0) return "❌ No items found.";
  return items.map(i => {
    const emoji = getEmoji(i.name);
    const qty = i.stock ?? "N/A";
    return `• ${emoji} ${i.name} (${qty})`;
  }).join("\n");
}

// Send styled stock
async function sendStock(threadID, api) {
  const stock = await fetchPVBRStock();
  if (!stock || stock.length === 0) {
    return api.sendMessage("⚠️ Failed to fetch PVBR stock.", threadID);
  }

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const plants = stock.filter(i => i.category === "SEEDS");
  const gear = stock.filter(i => i.category === "GEAR");

  const msg = `
╭─────────────────╮
🌱 𝗣𝗹𝗮𝗻𝘁𝘀 𝘃𝘀 𝗕𝗿𝗮𝗶𝗻𝗿𝗼𝘁𝘀 𝗦𝘁𝗼𝗰𝗸 🌱
🕒 ${now.toLocaleTimeString("en-PH", { hour12: false })}
╰─────────────────╯

╭─🌿 Plants────────╮
${formatStock(plants)}
╰─────────────────╯

╭─🛠️ Gear──────────╮
${formatStock(gear)}
╰─────────────────╯
  `.trim();

  api.sendMessage(msg, threadID);
}

// Auto-stock loop
async function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;
  sendStock(threadID, api); // send immediately
  autoStockTimers[threadID] = setInterval(() => sendStock(threadID, api), 5 * 60 * 1000); // every 5 minutes
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();
  let gcData = (await getData(`pvbrstock/${threadID}`)) || { enabled: false };

  if (gcData.enabled && option && option !== "off" && option !== "check") {
    return api.sendMessage("⚠️ Auto-stock is already active.", threadID, messageID);
  }

  if (option === "on") {
    gcData.enabled = true;
    await setData(`pvbrstock/${threadID}`, gcData);
    startAutoStock(threadID, api);
    return api.sendMessage("✅ PVBR Auto-stock enabled. Updates every 5 minutes.", threadID, messageID);
  }

  if (option === "off") {
    gcData.enabled = false;
    await setData(`pvbrstock/${threadID}`, gcData);
    if (autoStockTimers[threadID]) {
      clearInterval(autoStockTimers[threadID]);
      delete autoStockTimers[threadID];
    }
    return api.sendMessage("❌ PVB Auto-stock disabled.", threadID, messageID);
  }

  if (option === "check") {
    const status = gcData.enabled ? "ON ✅" : "OFF ❌";
    return api.sendMessage(`📊 PVB Auto-stock status: ${status}`, threadID, messageID);
  }

  api.sendMessage("⚠️ Usage: /stockpvb on|off|check", threadID, messageID);
};

// Auto-resume on bot restart
module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("pvbrstock")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — PVB Auto-stock resumed.", tid);
    }
  }
};
