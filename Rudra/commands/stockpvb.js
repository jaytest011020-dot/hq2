const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbstock",
  version: "2.1.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "PVBR auto-stock per GC, aligned minutes, countdown included",
  usePrefix: true,
  commandCategory: "pvb tools",
  usages: "/pvbstock on|off|check",
  cooldowns: 10,
};

// Allowed restock minutes
const ALLOWED_MINUTES = [1,6,11,16,21,26,31,36,41,46,51,56];

// Timer per GC
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

// Calculate next allowed restock
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

// Send stock message to a GC with live countdown
async function sendStock(threadID, api) {
  const next = getNextRestock();
  const sentMsg = await api.sendMessage(`⏳ Preparing PVBR stock...\nNext Restock: ${next.toLocaleTimeString("en-PH",{hour12:false})}`, threadID);

  // Live countdown
  const countdownInterval = setInterval(async () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const remaining = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));

    await api.editMessage(`⏳ PVBR stock countdown: ${remaining}s\nNext Restock: ${next.toLocaleTimeString("en-PH",{hour12:false})}`, threadID, sentMsg.messageID);

    if (remaining <= 0) {
      clearInterval(countdownInterval);

      // Only fetch and send stock at aligned time
      const stock = await fetchPVBRStock();
      if (!stock || stock.length === 0) return api.editMessage("⚠️ Failed to fetch PVBR stock.", threadID, sentMsg.messageID);

      const plants = stock.filter(i => i.category === "SEEDS");
      const gear = stock.filter(i => i.category === "GEAR");

      const finalMsg = `
╭─────────────────╮
🌱 𝗣𝗹𝗮𝗻𝘁𝘀 𝘃𝘀 𝗕𝗿𝗮𝗶𝗻𝗿𝗼𝘁𝘀 𝗦𝘁𝗼𝗰𝗸 🌱
🕒 ${now.toLocaleTimeString("en-PH",{hour12:false})}
🔄 Next Restock: ${getNextRestock().toLocaleTimeString("en-PH",{hour12:false})}
╰─────────────────╯

╭─🌿 Plants────────╮
${formatItems(plants, ["Rare","✨ Mythic ✨","💪 Godly","🎩 Secret"])}
╰─────────────────╯

╭─🛠️ Gear──────────╮
${formatItems(gear, ["Common","Epic","Legendary","Godly"])}
╰─────────────────╯`;

      await api.editMessage(finalMsg, threadID, sentMsg.messageID);
    }
  }, 1000);
}

// Start auto-stock per GC
async function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;

  const scheduleLoop = async () => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const next = getNextRestock(now);
    const delay = next.getTime() - now.getTime();

    setTimeout(async () => {
      await sendStock(threadID, api);
      scheduleLoop(); // repeat for next allowed minute
    }, delay);
  };

  scheduleLoop();
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
    return api.sendMessage("✅ PVBR Auto-stock enabled. Updates at allowed minutes.", threadID, messageID);
  }

  if (option === "off") {
    gcData.enabled = false;
    await
