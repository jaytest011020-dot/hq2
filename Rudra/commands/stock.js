const axios = require("axios");
const https = require("https");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stock",
  version: "6.6.4",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "GrowAGarden auto-stock with full seeds, eggs, gear, cosmetics + emoji and styled boxes",
  usePrefix: true,
  commandCategory: "gag tools",
  usages: "/stock on|off|check",
  cooldowns: 10,
};

// Auto-stock timers per GC
const autoStockTimers = {};

// Special items alert
const SPECIAL_ITEMS = [
  "Grandmaster Sprinkler",
  "Master Sprinkler",
  "Level-up Lollipop",
  "Medium Treat",
  "Medium Toy"
];

// Emoji mapping for seeds, eggs, gear, cosmetics
const ITEM_EMOJI = {
  // Seeds
  "Carrot": "🥕", "Strawberry": "🍓", "Blueberry": "🫐", "Orange Tulip": "🌷",
  "Tomato": "🍅", "Corn": "🌽", "Daffodil": "🌼", "Watermelon": "🍉",
  "Pumpkin": "🎃", "Apple": "🍎", "Bamboo": "🎍", "Coconut": "🥥",
  "Cactus": "🌵", "Dragon Fruit": "🐉", "Mango": "🥭", "Grape": "🍇",
  "Mushroom": "🍄", "Pepper": "🌶️", "Beanstalk": "🪴", "Ember Lily": "🔥🌸",
  "Sugar Apple": "🍏", "Burning Bud": "🔥🌱", "Giant Pinecone": "🌲",
  "Elder Strawberry": "🍓✨", "Romanesco": "🥦", "Potato": "🥔",
  "Brussels Sprouts": "🥬", "Cocomango": "🥭🥥", "Broccoli": "🥦",
  // Eggs
  "Common Egg": "🥚", "Uncommon Egg": "🥚✨", "Rare Egg": "🥚💎",
  "Legendary Egg": "🥚🌟", "Mythical Egg": "🥚🔥", "Bug Egg": "🐛🥚",
  // Gear
  "Watering Can": "💧", "Trowel": "🔨", "Trading Ticket": "🎟️",
  "Recall Wrench": "🔧", "Basic Sprinkler": "🌊", "Advanced Sprinkler": "💦",
  "Firework": "🎆", "Medium Treat": "🍪", "Medium Toy": "🧸",
  "Night Staff": "🌙", "Star Caller": "⭐", "Garden Guide": "📖",
  "Godly Sprinkler": "🌪️", "Chocolate Sprinkler": "🍫", "Magnifying Glass": "🔍",
  "Nectar Staff": "🍯", "Pollen Radar": "📡", "Master Sprinkler": "🌟💦",
  "Cleaning Spray": "🧴", "Favorite Tool": "🛠️", "Harvest Tool": "🌾",
  "Friendship Pot": "🤝", "Honey Sprinkler": "🍯💦", "Pet Mutation Shard Tranquil": "🌀",
  "Pet Mutation Shard Corrupted": "☠️", "Silver Fertilizer": "⚪",
  "Level Up Lollipop": "🍭", "Grandmaster Sprinkler": "🌊🔥",
  "Rainbow Lollipop": "🌈🍭", "Lightning Rod": "⚡", "Tanning Mirror": "🪞",
  "Reclaimer": "♻️", "Small Toy": "🧸", "Pet Mutation Shard Giantbean": "🌱🟢",
  "Small Treat": "🍪", "MutationSprayVerdant": "🌿", "Spray mutation disco": "💃",
  "MutationSprayWet": "💧", "MutationSprayWindstuck": "🍃", "Mutation Spray Choc": "🍫",
  "Mutation Spray Pollinated": "🐝", "Mutation Spray Shocked": "⚡",
  "Mutationspraycloudtouched": "☁️", "Mutationsprayburnt": "🔥",
  "Mutationspraychilled": "❄️", "MutationSprayAmber": "🟠",
  "TranquilMutationSpray": "🌀", "CorruptMutationSpray": "☠️",
  "Mutation Spray HoneyGlazed": "🍯", "Mutation Spray Fried": "🍟",
  "CookedMutationSpray": "🍳", "Mutation Spray Bloom": "🌸",
  "Mutation Spray Glimmering": "✨", "Mutation Spray Luminous": "💡",
  // Cosmetics
  "Statue Crate": "🗿", "Classic Gnome Crate": "👨‍🌾", "Fun Crate": "🎪",
  "Common Gnome Crate": "🧙", "Sign Crate": "📜", "Red tractor": "🚜",
  "Green tractor": "🚜", "Brown Well": "🪣", "Blue Well": "🪣", "Red Well": "🪣",
  "Frog Fountain": "🐸", "Ring Walkway": "⭕", "Viney Ring Walkway": "🌿⭕",
  "Round Metal Arbour": "🛖", "Large Wood Arbour": "🏡", "Log Bench": "🪑",
  "White Bench": "🪑", "Brown Bench": "🪑", "Wood Fence": "🪵", "Small Stone Pad": "🪨",
  "Medium Stone Table": "🪨", "Stone Lantern": "🏮", "Axe Stump": "🪓", "Bookshelf": "📚",
  "Mini TV": "📺", "Hay Bale": "🌾", "Water Trough": "💧", "Shovel Grave": "⛏️",
  "Torch": "🔥", "Small Path Tile": "🟫", "Medium Path Tile": "🟫",
  "Large Path Tile": "🟫", "Orange Umbrella": "🟠☂️", "Yellow Umbrella": "🟡☂️",
  "Red Pottery": "🟥", "White Pottery": "⬜", "Brick Stack": "🧱",
  "Shovel": "⛏️", "Rock Pile": "🪨", "Rake": "🧹", "Compost Bin": "🗑️"
};

// Helper: assign emoji to item
function getEmoji(name) {
  return ITEM_EMOJI[name] || "❔";
}

// Helper: get next 5-minute aligned restock at :10s
function getNext5Min(date = null) {
  const now = date || new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  let minutes = now.getMinutes();
  let nextMinutes = Math.floor(minutes / 5) * 5 + 5;
  const next = new Date(now);

  if (nextMinutes >= 60) {
    next.setHours(now.getHours() + 1);
    next.setMinutes(0);
  } else {
    next.setMinutes(nextMinutes);
  }

  next.setSeconds(10); // always at :10s
  next.setMilliseconds(0);
  return next;
}

// Fetch stock data from API
function fetchStocks() {
  const options = {
    method: "GET",
    hostname: "growagarden.gg",
    path: "/api/stock",
    headers: {
      accept: "*/*",
      "content-type": "application/json",
      referer: "https://growagarden.gg/stocks"
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

// Format a section (gear, eggs, seeds, cosmetics)
function formatSectionText(items) {
  if (!items || items.length === 0) return "❌ Empty";
  return items.map(i => `• ${getEmoji(i.name)} ${i.name} (${i.quantity ?? i.value ?? "N/A"})`).join("\n");
}

// Send styled stock update
async function sendStock(threadID, api) {
  const data = await fetchStocks();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  const gearText = formatSectionText(data.gearStock);
  const eggText = formatSectionText(data.eggStock);
  const cosmeticsText = formatSectionText(data.cosmeticsStock);
  const seedText = formatSectionText(data.seedsStock);

  // Styled message template
  const stockMsg = `
╭─────────────────╮
🌱 𝗔𝘂𝘁𝗼-𝗦𝘁𝗼𝗰𝗸 𝗨𝗽𝗱𝗮𝘁𝗲 🌱
🕒 Current PH Time: ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
╰─────────────────╯

╭─🛠️ Gear───────────╮
${gearText}
╰──────────────────╯

╭─🥚 Eggs──────────╮
${eggText}
╰─────────────────╯

╭─💄 Cosmetics───────╮
${cosmeticsText}
╰──────────────────╯

╭─🌱 Seeds─────────╮
${seedText}
╰─────────────────╯`;

  api.sendMessage(stockMsg, threadID);

  // Special items alert
  const allItems = [...(data.gearStock || []), ...(data.eggStock || []), ...(data.cosmeticsStock || []), ...(data.seedsStock || [])];
  const foundSpecial = allItems.filter(i => SPECIAL_ITEMS.some(si => i.name.toLowerCase().includes(si.toLowerCase())));
  if (foundSpecial.length > 0) {
    const specialMsg = `
🚨 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗦𝘁𝗼𝗰𝗸 🚨
──────────────────────
🕒 Current PH Time: ${now.toLocaleTimeString("en-PH", { hour12: false })}
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
    sendStock(threadID, api);
    // repeat every 5 minutes
    autoStockTimers[threadID] = setInterval(() => sendStock(threadID, api), 5 * 60 * 1000);
  }, delay);
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();
  let gcData = (await getData(`stock/${threadID}`)) || { enabled: false };

  if (gcData.enabled && option && option !== "off" && option !== "check") {
    return api.sendMessage("⚠️ Auto-stock is already active.", threadID, messageID);
  }

  if (option === "on") {
    if (gcData.enabled) return api.sendMessage("⚠️ Auto-stock already enabled.", threadID, messageID);
    gcData.enabled = true;
    await setData(`stock/${threadID}`, gcData);
    startAutoStock(threadID, api);
    return api.sendMessage("✅ Auto-stock enabled. Updates every 5 minutes at :10s.", threadID, messageID);
  }

  if (option === "off") {
    gcData.enabled = false;
    await setData(`stock/${threadID}`, gcData);
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

  api.sendMessage("⚠️ Usage: /stock on|off|check", threadID, messageID);
};

// Auto-resume all enabled GCs on bot restart
module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("stock")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — Auto-stock resumed.", tid);
    }
  }
};
