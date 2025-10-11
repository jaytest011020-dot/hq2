const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbstock",
  version: "3.6.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "PVBR auto-stock aligned exactly every 5 mins + 20s, no spam, with rare seed alerts",
  usePrefix: true,
  commandCategory: "pvb tools",
  usages: "/pvbstock on|off|check",
  cooldowns: 10,
};

// Track active GC timers
const autoStockTimers = {};

// Emoji mapping
const ITEM_EMOJI = {
  "Cactus": "🌵", "Strawberry": "🍓", "Pumpkin": "🎃", "Sunflower": "🌻",
  "Dragon Fruit": "🐉🍉", "Eggplant": "🍆", "Watermelon": "🍉✨", "Grape": "🍇✨",
  "Cocotank": "🥥🛡️", "Carnivorous Plant": "🪴🦷", "King Limone": "🍋", "Mango": "🥭", "Mr Carrot": "🥕🎩",
  "Tomatrio": "🍅👨‍👦‍👦", "Shroombino": "🍄🎭", "Bat": "⚾",
  "Water Bucket": "🪣💧", "Frost Grenade": "🧊💣", "Banana Gun": "🍌🔫",
  "Frost Blower": "❄️🌬️", "Lucky Potion": "🍀🧪", "Speed Potion": "⚡🧪",
  "Carrot Launcher": "🥕🚀"
};

// Rarity map
const CATEGORY_EMOJI = {
  "common": "🟢", "rare": "🌿", "epic": "🔵", "legendary": "🟣",
  "mythic": "✨", "godly": "🟡", "secret": "🎩", "unknown": "❔"
};

const MANUAL_RARITY = {
  "Cactus": "rare", "Strawberry": "rare", "Pumpkin": "epic", "Sunflower": "epic",
  "Dragon Fruit": "legendary", "Eggplant": "legendary", "Watermelon": "mythic", "Grape": "mythic",
  "Cocotank": "godly", "Carnivorous Plant": "godly", "King Limone": "secret", "Mango": "secret",
  "Mr Carrot": "secret", "Tomatrio": "secret", "Shroombino": "secret",
  "Bat": "common", "Water Bucket": "epic", "Frost Grenade": "epic", "Banana Gun": "epic",
  "Frost Blower": "legendary", "Lucky Potion": "legendary", "Speed Potion": "legendary",
  "Carrot Launcher": "godly"
};

// Helpers
function getEmoji(name) {
  const clean = name.replace(/ Seed$/i, "");
  return ITEM_EMOJI[clean] || "❔";
}
function getRarity(name) {
  const clean = name.replace(/ Seed$/i, "");
  return MANUAL_RARITY[clean] || "unknown";
}
function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "Unknown";
}

function formatItems(items) {
  if (!items?.length) return "❌ Empty";

  const grouped = {};
  for (const i of items) {
    const type = getRarity(i.name);
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(`• ${getEmoji(i.name)} ${i.name.replace(/ Seed$/i, "")} (${i.currentStock ?? "?"})`);
  }

  const order = ["common", "rare", "epic", "legendary", "mythic", "godly", "secret", "unknown"];
  return order
    .filter(cat => grouped[cat])
    .map(cat => `[${CATEGORY_EMOJI[cat]} ${capitalizeFirst(cat)}]\n${grouped[cat].join("\n")}`)
    .join("\n\n");
}

async function fetchPVBRStock() {
  try {
    const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock?since=0");
    return res.data?.items || [];
  } catch (e) {
    console.error("Error fetching PVBR stock:", e);
    return [];
  }
}

// 🕒 Every 5 mins + 20s exact (00:20, 05:20, 10:20, etc.)
function getNextRestock() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const m = now.getMinutes();
  const next = new Date(now);

  const nextM = Math.ceil((m + 0.1) / 5) * 5; // round up to next 5
  if (nextM >= 60) next.setHours(next.getHours() + 1);

  next.setMinutes(nextM % 60);
  next.setSeconds(20);
  next.setMilliseconds(0);

  return next;
}

// 🪴 Send stock message
async function sendStock(threadID, api) {
  const stock = await fetchPVBRStock();
  if (!stock?.length) return api.sendMessage("⚠️ Failed to fetch PVBR stock.", threadID);

  const seeds = stock.filter(i => i.name.toLowerCase().includes("seed"));
  const gear = stock.filter(i => !i.name.toLowerCase().includes("seed"));

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNextRestock();

  const msg = `
╭───────────────╮
🌱 𝗣𝗹𝗮𝗻𝘁𝘀 𝘃𝘀 𝗕𝗿𝗮𝗶𝗻𝗿𝗼𝘁𝘀 𝗦𝘁𝗼𝗰𝗸 🌱
🕒 Current Time: ${now.toLocaleTimeString("en-PH", { hour12: true })}
🕒 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: true })}
╰───────────────╯

╭─🌿 Seeds───────╮
${formatItems(seeds)}
╰───────────────╯

╭─🛠️ Gear────────╮
${formatItems(gear)}
╰───────────────╯`;

  await api.sendMessage(msg, threadID);

  // 🚨 Alert for rare seeds
  const rare = seeds.filter(s => ["godly", "secret"].includes(getRarity(s.name)));
  if (rare.length) {
    const alert = `🚨 RARE SEED DETECTED 🚨\n\n${rare
      .map(s => `${getEmoji(s.name)} ${s.name.replace(/ Seed$/i, "")} (${s.currentStock})`)
      .join("\n")}\n\n⚡ Join fast! Choose a non-full server:\n\n` +
      `https://www.roblox.com/share?code=5a9bf02c4952464eaf9c0ae66eb456bf&type=Server\n\n` +
      `https://www.roblox.com/share?code=d1afbbba2d5ed946b83caeb423a09e37&type=Server\n\n` +
      `https://www.roblox.com/share?code=a7e01c0a62c66e4c8a572cd79e77070e&type=Server\n\n` +
      `https://www.roblox.com/share?code=f9b0d9025486cb4494514ad5ee9cce54&type=Server`;

    await api.sendMessage(alert, threadID);
  }
}

// 🔁 No spam: triggers only when exact restock hits
function scheduleNext(threadID, api) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNextRestock();
  let delay = next.getTime() - now.getTime();

  if (delay < 0) delay += 5 * 60 * 1000;

  if (autoStockTimers[threadID]) clearTimeout(autoStockTimers[threadID]);

  autoStockTimers[threadID] = setTimeout(async () => {
    const gcData = await getData(`pvbstock/${threadID}`);
    if (!gcData?.enabled) return stopAutoStock(threadID);

    await sendStock(threadID, api);
    scheduleNext(threadID, api);
  }, delay);
}

function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;
  scheduleNext(threadID, api);
}

function stopAutoStock(threadID) {
  if (autoStockTimers[threadID]) {
    clearTimeout(autoStockTimers[threadID]);
    delete autoStockTimers[threadID];
  }
}

// ⚙️ Command handler
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();
  const gcData = (await getData(`pvbstock/${threadID}`)) || { enabled: false };

  if (option === "on") {
    if (gcData.enabled) return api.sendMessage("⚠️ Auto-stock is already active.", threadID, messageID);
    gcData.enabled = true;
    await setData(`pvbstock/${threadID}`, gcData);
    startAutoStock(threadID, api);
    return api.sendMessage("✅ PVBR Auto-stock enabled. Exact restock timing set every 5 mins + 20s.", threadID, messageID);
  }

  if (option === "off") {
    gcData.enabled = false;
    await setData(`pvbstock/${threadID}`, gcData);
    stopAutoStock(threadID);
    return api.sendMessage("❌ PVBR Auto-stock disabled.", threadID, messageID);
  }

  if (option === "check") {
    return api.sendMessage(`📊 PVBR Auto-stock: ${gcData.enabled ? "ON ✅" : "OFF ❌"}`, threadID, messageID);
  }

  return api.sendMessage("⚙️ Usage: /pvbstock on|off|check", threadID, messageID);
};

// 🔄 Resume after restart
module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("pvbstock")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — PVBR Auto-stock resumed.", tid);
    }
  }
};