const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stockpvb",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Plants vs Brainrots auto-stock with emoji and styled boxes (aligned every 5 min + 10s)",
  usePrefix: true,
  commandCategory: "pvbr tools",
  usages: "/stockpvb on|off|check",
  cooldowns: 10,
};

const autoStockTimers = {};

// Emoji mapping
const ITEM_EMOJI = {
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

// Helper: get next restock time aligned to mm:10 seconds (every 5 min)
function getNextRestock(date = null) {
  const now = date || new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));

  let minutes = now.getMinutes();
  let nextMinutes = Math.floor(minutes / 5) * 5 + 5; // next 5 min mark
  if (nextMinutes >= 60) {
    nextMinutes = 0;
    now.setHours(now.getHours() + 1);
  }

  const next = new Date(now);
  next.setMinutes(nextMinutes);
  next.setSeconds(10); // fixed at 10 seconds
  next.setMilliseconds(0);

  return next;
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

// Auto-stock loop (aligned)
async function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNextRestock(now);
  const delay = next.getTime() - now.getTime();

  setTimeout(() => {
    sendStock(threadID, api);
    autoStockTimers[threadID] = setInterval(() => sendStock(threadID, api), 5 * 60 * 1000);
  }, delay);
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
    return api.sendMessage("✅ PVBR Auto-stock enabled. Updates every 5 minutes (aligned to mm:10).", threadID, messageID);
  }

  if (option === "off") {
    gcData.enabled = false;
    await setData(`pvbrstock/${threadID}`, gcData);
    if (autoStockTimers[threadID]) {
      clearInterval(autoStockTimers[threadID]);
      delete autoStockTimers[threadID];
    }
    return api.sendMessage("❌ PVBR Auto-stock disabled.", threadID, messageID);
  }

  if (option === "check") {
    const status = gcData.enabled ? "ON ✅" : "OFF ❌";
    return api.sendMessage(`📊 PVBR Auto-stock status: ${status}`, threadID, messageID);
  }

  api.sendMessage("⚠️ Usage: /stockpvb on|off|check", threadID, messageID);
};

// Auto-resume on bot restart
module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("pvbrstock")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — PVBR Auto-stock resumed.", tid);
    }
  }
};
