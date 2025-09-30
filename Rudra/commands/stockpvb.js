const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbstock",
  version: "1.5.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Plants vs Brainrots auto-stock with emoji and styled boxes (dynamic allowed minutes)",
  usePrefix: true,
  commandCategory: "pvb tools",
  usages: "/pvbstock on|off|check",
  cooldowns: 10,
};

const autoStockTimers = {};
const ALLOWED_MINUTES = [1, 6, 11, 16, 21]; // allowed minutes for restock

// Emoji mapping with category type
const ITEM_EMOJI = {
  "Cactus": { emoji: "🌵", type: "Rare" },
  "Strawberry": { emoji: "🍓", type: "Rare" },
  "Pumpkin": { emoji: "🎃", type: "Rare" },
  "Sunflower": { emoji: "🌻", type: "Rare" },
  "Dragon Fruit": { emoji: "🐉🍉", type: "Rare" },
  "Eggplant": { emoji: "🍆", type: "Rare" },
  "Watermelon": { emoji: "🍉✨", type: "✨ Mythic ✨" },
  "Water Melon": { emoji: "🍉✨", type: "✨ Mythic ✨" },
  "Grape": { emoji: "🍇✨", type: "✨ Mythic ✨" },
  "Cocotank": { emoji: "🥥🛡️", type: "💪 Godly" },
  "Carnivorous Plant": { emoji: "🪴🦷", type: "💪 Godly" },
  "Mr-Carrot": { emoji: "🥕🎩", type: "🎩 Secret" },
  "Mr Carrot": { emoji: "🥕🎩", type: "🎩 Secret" },
  "Tomatrio": { emoji: "🍅👨‍👦‍👦", type: "🎩 Secret" },
  "Shroombino": { emoji: "🍄🎭", type: "🎩 Secret" },
  "Bat": { emoji: "🦇", type: "Common" },
  "Water Bucket": { emoji: "🪣💧", type: "Epic" },
  "Frost Grenade": { emoji: "🧊💣", type: "Epic" },
  "Banana Gun": { emoji: "🍌🔫", type: "Epic" },
  "Frost Blower": { emoji: "❄️🌬️", type: "Legendary" },
  "Lucky Potion": { emoji: "🍀🧪", type: "Legendary" },
  "Speed Potion": { emoji: "⚡🧪", type: "Legendary" },
  "Carrot Launcher": { emoji: "🥕🚀", type: "Godly" },
};

const CATEGORY_EMOJI = {
  "Rare": "🌿",
  "✨ Mythic ✨": "✨",
  "💪 Godly": "💪",
  "🎩 Secret": "🎩",
  "Common": "🟢",
  "Epic": "🔵",
  "Legendary": "🟣",
  "Godly": "🟡",
};

function getEmoji(name) {
  return ITEM_EMOJI[name]?.emoji || "❔";
}

function formatPlants(items) {
  if (!items || items.length === 0) return "❌ No plants found.";
  const grouped = {};
  items.forEach(i => {
    const type = ITEM_EMOJI[i.name]?.type || "Rare";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(`• ${getEmoji(i.name)} ${i.name} (${i.stock ?? "N/A"})`);
  });
  let output = "";
  ["Rare", "✨ Mythic ✨", "💪 Godly", "🎩 Secret"].forEach(type => {
    if (grouped[type]) {
      const emoji = CATEGORY_EMOJI[type] || "";
      output += `[${emoji} ${type}]\n${grouped[type].join("\n")}\n\n`;
    }
  });
  return output.trim();
}

function formatGear(items) {
  if (!items || items.length === 0) return "❌ No gear found.";
  const grouped = {};
  items.forEach(i => {
    const type = ITEM_EMOJI[i.name]?.type || "Common";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(`• ${getEmoji(i.name)} ${i.name} (${i.stock ?? "N/A"})`);
  });
  let output = "";
  ["Common", "Epic", "Legendary", "Godly"].forEach(type => {
    if (grouped[type]) {
      const emoji = CATEGORY_EMOJI[type] || "";
      output += `[${emoji} ${type}]\n${grouped[type].join("\n")}\n\n`;
    }
  });
  return output.trim();
}

async function fetchPVBRStock() {
  try {
    const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock?since=0");
    return res.data?.data || [];
  } catch (e) {
    console.error("Error fetching PVBR stock:", e);
    return [];
  }
}

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
  next.setSeconds(0);
  next.setMilliseconds(0);
  return next;
}

async function sendStock(threadID, api) {
  const stock = await fetchPVBRStock();
  if (!stock || stock.length === 0) return api.sendMessage("⚠️ Failed to fetch PVBR stock.", threadID);

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const plants = stock.filter(i => i.category === "SEEDS");
  const gear = stock.filter(i => i.category === "GEAR");

  const msg = `
╭─────────────────╮
🌱 𝗣𝗹𝗮𝗻𝘁𝘀 𝘃𝘀 𝗕𝗿𝗮𝗶𝗻𝗿𝗼𝘁𝘀 𝗦𝘁𝗼𝗰𝗸 🌱
🕒 ${now.toLocaleTimeString("en-PH", { hour12: false })}
╰─────────────────╯

╭─🌿 Plants────────╮
${formatPlants(plants)}
╰─────────────────╯

╭─🛠️ Gear──────────╮
${formatGear(gear)}
╰─────────────────╯
`.trim();

  api.sendMessage(msg, threadID);
}

async function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;

  const loop = async () => {
    await sendStock(threadID, api);
    const next = getNextRestock();
    const delay = next.getTime() - new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })).getTime();
    autoStockTimers[threadID] = setTimeout(loop, delay);
  };

  loop();
}

function stopAutoStock(threadID) {
  if (autoStockTimers[threadID]) {
    clearTimeout(autoStockTimers[threadID]);
    delete autoStockTimers[threadID];
  }
}

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
    return api.sendMessage("✅ PVBR Auto-stock enabled. Updates at allowed minutes.", threadID, messageID);
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

module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("pvbrstock")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — PVBR Auto-stock resumed.", tid);
    }
  }
};
