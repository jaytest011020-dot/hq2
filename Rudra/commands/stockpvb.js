const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbstock",
  version: "2.4.0",
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

// Track scheduled GCs
const autoStockTimers = {};

// Emoji mapping
const ITEM_EMOJI = {
  "Cactus": { emoji: "🌵", type: "Rare" },
  "Strawberry": { emoji: "🍓", type: "Rare" },
  "Pumpkin": { emoji: "🎃", type: "Rare" },
  "Sunflower": { emoji: "🌻", type: "Rare" },
  "Dragon Fruit": { emoji: "🐉🍉", type: "Rare" },
  "Eggplant": { emoji: "🍆", type: "Rare" },
  "Watermelon": { emoji: "🍉✨", type: "✨ Mythic ✨" },
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

// Helpers
function getEmoji(name) { return ITEM_EMOJI[name]?.emoji || "❔"; }

function formatItems(items, categories) {
  if (!items || items.length === 0) return "❌ Empty";
  const grouped = {};
  items.forEach(i => {
    const type = ITEM_EMOJI[i.name]?.type || "Rare";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(`• ${getEmoji(i.name)} ${i.name} (${i.stock ?? "N/A"})`);
  });
  let output = "";
  categories.forEach(type => {
    if (grouped[type]) output += `[${CATEGORY_EMOJI[type] || ""} ${type}]\n${grouped[type].join("\n")}\n\n`;
  });
  return output.trim();
}

// Fetch stock from PVBR API
async function fetchPVBRStock() {
  try {
    const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock?since=0");
    return res.data?.data || [];
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
  next.setSeconds(20);  // Set the second to 20 for the 20-second delay
  next.setMilliseconds(0);  // Ensure no milliseconds are added
  return next;
}

// Send stock message with the aligned time + 20 second delay
async function sendStock(threadID, api) {
  const stock = await fetchPVBRStock();
  if (!stock || stock.length === 0) return api.sendMessage("⚠️ Failed to fetch PVBR stock.", threadID);

  const plants = stock.filter(i => i.category === "SEEDS");
  const gear = stock.filter(i => i.category === "GEAR");

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const nextRestock = getNextRestock(now);

  const msg = `
╭─────────────────╮
🌱 𝗣𝗹𝗮𝗻𝘁𝘀 𝘃𝘀 𝗕𝗿𝗮𝗶𝗻𝗿𝗼𝘁𝘀 𝗦𝘁𝗼𝗰𝗸 🌱
🕒 Current Time: ${now.toLocaleTimeString("en-PH", { hour12: true })}
🕒 Next Restock: ${nextRestock.toLocaleTimeString("en-PH", { hour12: true })}
╰─────────────────╯

╭─🌿 Plants────────╮
${formatItems(plants, ["Rare", "✨ Mythic ✨", "💪 Godly", "🎩 Secret"])}
╰─────────────────╯

╭─🛠️ Gear──────────╮
${formatItems(gear, ["Common", "Epic", "Legendary", "Godly"])}
╰─────────────────╯`;

  // Adding the 20-second delay before sending the message
  setTimeout(async () => {
    await api.sendMessage(msg, threadID);
  }, 20000);  // 20 seconds delay after fetching
}

// Recursive scheduling at the aligned time + 20 seconds delay
function scheduleNextStock(threadID, api) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNextRestock(now);
  const delay = next.getTime() - now.getTime(); // This will align with the next available time + 20 seconds

  setTimeout(async () => {
    await sendStock(threadID, api);  // Send the stock message after the delay
    scheduleNextStock(threadID, api);  // Recursively schedule the next fetch/send cycle
  }, delay);
}

// Start auto-stock for a GC
function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;
  autoStockTimers[threadID] = true; // mark as scheduled
  scheduleNextStock(threadID, api);  // Start scheduling the next fetch/send cycle
}

// Stop auto-stock for a GC
function stopAutoStock(threadID) {
  if (autoStockTimers[threadID]) {
    delete autoStockTimers[threadID]; // remove scheduled timer
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
    stopAutoStock(threadID); // stop auto-stock for the GC
    return api.sendMessage("❌ PVBR Auto-stock disabled.", threadID, messageID);
  }

  if (option === "check") {
    const status = gcData.enabled ? "ON ✅" : "OFF ❌";
    return api.sendMessage(`📊 PVBR Auto-stock status: ${status}`, threadID, messageID);
  }

  api.sendMessage("⚠️ Usage: /pvbstock on|off|check", threadID, messageID);
};

// Resume all enabled GCs on bot restart
module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("pvbstock")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — PVBR Auto-stock resumed.", tid);
    }
  }
};
