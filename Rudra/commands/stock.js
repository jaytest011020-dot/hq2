const axios = require("axios");
const https = require("https");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stock",
  version: "6.6.2",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "GrowAGarden auto-stock with full seeds, eggs, gear, cosmetics + emoji",
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

// Emoji mapping
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

// Get emoji helper
function getEmoji(name) {
  return ITEM_EMOJI[name] || "❔";
}

// Get next 5-min aligned restock
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

// Fetch stock from API
function fetchStocks() {
  const options = {
    method: "GET",
    hostname: "growagarden.gg",
    path: "/api/stock",
    headers: { accept: "*/*", "content-type": "application/json", referer: "https://growagarden.gg/stocks" }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (err) { reject(err); }
      });
    });
    req.on("error", e => reject(e));
    req.end();
  });
} 
// Format a section (gear, eggs, seeds, cosmetics)
async function formatSection(title, items) {
  if (!items || items.length === 0) return [`❌ No ${title}`];
  const lines = items.map(i => `• ${getEmoji(i.name)} ${i.name} (${i.quantity ?? i.value ?? "N/A"})`);
  
  // Split into chunks if too long
  const CHUNK_SIZE = 20;
  const chunks = [];
  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    chunks.push(lines.slice(i, i + CHUNK_SIZE).join("\n"));
  }
  return chunks;
}

// Send stock update to thread
async function sendStock(threadID, api) {
  const data = await fetchStocks();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  const gearChunks = await formatSection("Gear", data.gearStock);
  const eggChunks = await formatSection("Eggs", data.eggStock);
  const cosmeticsChunks = await formatSection("Cosmetics", data.cosmeticsStock);
  const seedChunks = await formatSection("Seeds", data.seedsStock);

  const sections = [
    { title: "🛠️ Gear", chunks: gearChunks },
    { title: "🥚 Eggs", chunks: eggChunks },
    { title: "💄 Cosmetics", chunks: cosmeticsChunks },
    { title: "🌱 Seeds", chunks: seedChunks }
  ];

  for (const section of sections) {
    for (const msg of section.chunks) {
      api.sendMessage(`${section.title}\n${msg}`, threadID);
    }
  }

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
──────────────────────
    `.trim();
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
    return api.sendMessage("✅ Auto-stock enabled. Updates every 5 minutes.", threadID, messageID);
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
