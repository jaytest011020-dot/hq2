const axios = require('axios');
const https = require('https');
const { setData, getData } = require('../../database.js');

module.exports.config = {
  name: "stockPvB",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Plants vs Brainrots auto-stock with full seeds and gear + emoji and styled boxes",
  usePrefix: true,
  commandCategory: "PvB tools",
  usages: "/stockpvb on|off|check",
  cooldowns: 10,
};

// Auto-stock timers per GC
const autoStockTimers = {};

// Special items alert (You can modify this list based on game items)
const SPECIAL_ITEMS = [
  "Legendary Gear",
  "Mythical Seed",
  "Rare Gear"
];

// Emoji mapping for seeds and gear
const ITEM_EMOJI = {
  "Sunflower": "🌻", "Pumpkin": "🎃", "Dragon Fruit": "🐉",
  "Watermelon": "🍉", "Tomato": "🍅", "Strawberry": "🍓",
  "Carrot": "🥕", "Apple": "🍎", "Mango": "🥭",
  // Add more seeds as needed
  "Watering Can": "💧", "Trowel": "🔨", "Trading Ticket": "🎟️",
  "Basic Sprinkler": "🌊", "Advanced Sprinkler": "💦",
  "Master Sprinkler": "🌟💦", "Godly Sprinkler": "🌪️",
  // Add more gear as needed
};

// Helper: assign emoji to item
function getEmoji(name) {
  return ITEM_EMOJI[name] || "❔";
}

// Helper: get next 5-minute aligned restock
function getNext5Min(date = null) {
  const now = date || new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  let minutes = now.getMinutes();
  let nextMinutes = Math.floor(minutes / 5) * 5 + 1;
  if (nextMinutes <= minutes) nextMinutes += 5;
  const next = new Date(now);
  next.setMinutes(nextMinutes);
  next.setSeconds(0, 0);
  if (nextMinutes >= 60) {
    next.setHours(now.getHours() + 1);
    next.setMinutes(nextMinutes % 60);
  }
  return next;
}

// Fetch stock data from PvB API
async function fetchPvBStock() {
  const options = {
    method: "GET",
    hostname: "plantsvsbrainrots.com",
    path: "/api/stock",  // Adjust the API endpoint accordingly
    headers: {
      accept: "*/*",
      "content-type": "application/json",
      referer: "https://plantsvsbrainrots.com/stock"
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", e => reject(e));
    req.end();
  });
}

// Format a section (seeds, gear)
function formatSectionText(items) {
  if (!items || items.length === 0) return "❌ Empty";
  return items.map(i => `• ${getEmoji(i.name)} ${i.name} (${i.quantity ?? i.value ?? "N/A"})`).join("\n");
}

// Send styled stock update
async function sendPvBStock(threadID, api) {
  const data = await fetchPvBStock();  // Use the Plants vs Brainrots stock data
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  // Format stock sections
  const seedText = formatSectionText(data.seedsStock);
  const gearText = formatSectionText(data.gearStock);

  // Styled message template
  const stockMsg = `
╭─────────────────╮
🌱 𝗔𝘂𝘁𝗼-𝗦𝘁𝗼𝗰𝗸 𝗨𝗽𝗱𝗮𝘁𝗲 🌱
🕒 Current Time: ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
╰─────────────────╯

╭─🌱 Seeds───────────╮
${seedText}
╰──────────────────╯

╭─🛠️ Gear──────────╮
${gearText}
╰──────────────────╯`;
  api.sendMessage(stockMsg, threadID);

  // Special items alert
  const allItems = [...(data.gearStock || []), ...(data.seedsStock || [])];
  const foundSpecial = allItems.filter(i => SPECIAL_ITEMS.some(si => i.name.toLowerCase().includes(si.toLowerCase())));
  if (foundSpecial.length > 0) {
    const specialMsg = `
🚨 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗦𝘁𝗼𝗰𝗸 🚨
──────────────────────
🕒 Current Time: ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
──────────────────────
${foundSpecial.map(i => `✨ ${i.name} (${i.quantity ?? i.value ?? "N/A"})`).join("\n")}
──────────────────────`;
    api.sendMessage(specialMsg, threadID);
  }
}

// Start auto-stock timer
async function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min(now);
  const delay = next.getTime() - now.getTime();

  setTimeout(() => {
    sendPvBStock(threadID, api);
    autoStockTimers[threadID] = setInterval(() => sendPvBStock(threadID, api), 5 * 60 * 1000);
  }, delay);
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();
  let gcData = (await getData(`stockPvB/${threadID}`)) || { enabled: false };

  if (gcData.enabled && option && option !== "off" && option !== "check") {
    return api.sendMessage("⚠️ Auto-stock is already active.", threadID, messageID);
  }

  if (option === "on") {
    if (gcData.enabled) return api.sendMessage("⚠️ Auto-stock already enabled.", threadID, messageID);
    gcData.enabled = true;
    await setData(`stockPvB/${threadID}`, gcData);
    startAutoStock(threadID, api);
    return api.sendMessage("✅ Auto-stock enabled. Updates every 5 minutes.", threadID, messageID);
  }

  if (option === "off") {
    gcData.enabled = false;
    await setData(`stockPvB/${threadID}`, gcData);
    if (autoStockTimers[threadID]) {
      clearInterval(autoStockTimers[threadID]);
      delete autoStockTimers[threadID];
    }
    return api.sendMessage("❌ Auto-stock disabled.", threadID, messageID);
  }

  if (option === "check") {
    const status = gcData.enabled ? "ON ✅" : "OFF ❌";
    return api.sendMessage(`📊 Auto-stock status: ${status}`, threadID, messageID);
  }

  api.sendMessage("⚠️ Usage: /stockpvb on|off|check", threadID, messageID);
};

// Auto-resume all enabled GCs on bot restart
module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("stockPvB")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — Auto-stock resumed.", tid);
    }
  }
};
