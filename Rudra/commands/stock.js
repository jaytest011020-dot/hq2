const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stock",
  version: "6.5.0",
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

// Emoji mapping for seeds, eggs, gear, cosmetics
const ITEM_EMOJI = {
  // Seeds
  "Carrot": "🥕",
  "Strawberry": "🍓",
  "Blueberry": "🫐",
  "Orange Tulip": "🌷",
  "Tomato": "🍅",
  "Corn": "🌽",
  "Daffodil": "🌼",
  "Watermelon": "🍉",
  "Pumpkin": "🎃",
  "Apple": "🍎",
  "Bamboo": "🎍",
  "Coconut": "🥥",
  "Cactus": "🌵",
  "Dragon Fruit": "🐉",
  "Mango": "🥭",
  "Grape": "🍇",
  "Mushroom": "🍄",
  "Pepper": "🌶️",
  "Beanstalk": "🪴",
  "Ember Lily": "🔥🌸",
  "Sugar Apple": "🍏",
  "Burning Bud": "🔥🌱",
  "Giant Pinecone": "🌲",
  "Elder Strawberry": "🍓✨",
  "Romanesco": "🥦",
  "Potato": "🥔",
  "Brussels Sprouts": "🥬",
  "Cocomango": "🥭🥥",
  "Broccoli": "🥦",
  // Eggs
  "Common Egg": "🥚",
  "Uncommon Egg": "🥚✨",
  "Rare Egg": "🥚💎",
  "Legendary Egg": "🥚🌟",
  "Mythical Egg": "🥚🔥",
  "Bug Egg": "🐛🥚",
  // Gear
  "Watering Can": "💧",
  "Trowel": "🔨",
  "Trading Ticket": "🎟️",
  "Recall Wrench": "🔧",
  "Basic Sprinkler": "🌊",
  "Advanced Sprinkler": "💦",
  "Firework": "🎆",
  "Medium Treat": "🍪",
  "Medium Toy": "🧸",
  "Night Staff": "🌙",
  "Star Caller": "⭐",
  "Garden Guide": "📖",
  "Godly Sprinkler": "🌪️",
  "Chocolate Sprinkler": "🍫",
  "Magnifying Glass": "🔍",
  "Nectar Staff": "🍯",
  "Pollen Radar": "📡",
  "Master Sprinkler": "🌟💦",
  "Cleaning Spray": "🧴",
  "Favorite Tool": "🛠️",
  "Harvest Tool": "🌾",
  "Friendship Pot": "🤝",
  "Honey Sprinkler": "🍯💦",
  "Pet Mutation Shard Tranquil": "🌀",
  "Pet Mutation Shard Corrupted": "☠️",
  "Silver Fertilizer": "⚪",
  "Level Up Lollipop": "🍭",
  "Grandmaster Sprinkler": "🌊🔥",
  "Rainbow Lollipop": "🌈🍭",
  "Lightning Rod": "⚡",
  "Tanning Mirror": "🪞",
  "Reclaimer": "♻️",
  "Small Toy": "🧸",
  "Pet Mutation Shard Giantbean": "🌱🟢",
  "Small Treat": "🍪",
  "MutationSprayVerdant": "🌿",
  "Spray mutation disco": "💃",
  "MutationSprayWet": "💧",
  "MutationSprayWindstuck": "🍃",
  "Mutation Spray Choc": "🍫",
  "Mutation Spray Pollinated": "🐝",
  "Mutation Spray Shocked": "⚡",
  "Mutationspraycloudtouched": "☁️",
  "Mutationsprayburnt": "🔥",
  "Mutationspraychilled": "❄️",
  "MutationSprayAmber": "🟠",
  "TranquilMutationSpray": "🌀",
  "CorruptMutationSpray": "☠️",
  "Mutation Spray HoneyGlazed": "🍯",
  "Mutation Spray Fried": "🍟",
  "CookedMutationSpray": "🍳",
  "Mutation Spray Bloom": "🌸",
  "Mutation Spray Glimmering": "✨",
  "Mutation Spray Luminous": "💡",
  // Cosmetics (examples, full list can be expanded)
  "Statue Crate": "🗿",
  "Classic Gnome Crate": "👨‍🌾",
  "Fun Crate": "🎪",
  "Common Gnome Crate": "🧙",
  "Sign Crate": "📜",
  "Red tractor": "🚜",
  "Green tractor": "🚜",
  "Brown Well": "🪣",
  "Blue Well": "🪣",
  "Red Well": "🪣",
  "Frog Fountain": "🐸",
  "Ring Walkway": "⭕",
  "Viney Ring Walkway": "🌿⭕",
  "Round Metal Arbour": "🛖",
  "Large Wood Arbour": "🏡",
  "Log Bench": "🪑",
  "White Bench": "🪑",
  "Brown Bench": "🪑",
  "Wood Fence": "🪵",
  "Small Stone Pad": "🪨",
  "Medium Stone Table": "🪨",
  "Stone Lantern": "🏮",
  "Axe Stump": "🪓",
  "Bookshelf": "📚",
  "Mini TV": "📺",
  "Hay Bale": "🌾",
  "Water Trough": "💧",
  "Shovel Grave": "⛏️",
  "Torch": "🔥",
  "Small Path Tile": "🟫",
  "Medium Path Tile": "🟫",
  "Large Path Tile": "🟫",
  "Orange Umbrella": "🟠☂️",
  "Yellow Umbrella": "🟡☂️",
  "Red Pottery": "🟥",
  "White Pottery": "⬜",
  "Brick Stack": "🧱",
  "Shovel": "⛏️",
  "Rock Pile": "🪨",
  "Rake": "🧹",
  "Compost Bin": "🗑️",
  "Torch": "🔥"
}; 
// Convert text to bold Unicode letters
function toBoldUnicode(str) {
  const boldOffset = 0x1D400 - 65;
  return str.split("").map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(code + boldOffset);
    if (code >= 97 && code <= 122) return String.fromCodePoint(code + boldOffset + 32);
    return c;
  }).join("");
}

// Fetch stock data from API
async function fetchGardenData() {
  try {
    const res = await axios.get("https://gagstock.gleeze.com/grow-a-garden");
    return res.data?.data || {};
  } catch (e) {
    return null;
  }
}

// Format items with emoji and bold name
function formatSection(title, items) {
  if (!items || items.length === 0) return "❌ None";
  return items.map(i => {
    const emoji = ITEM_EMOJI[i.name] || "";
    return `• ${emoji} ${toBoldUnicode(i.name)} (${i.quantity})`;
  }).join("\n");
}

// Get next 5-minute aligned restock
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

// Send stock update to GC
async function sendStock(threadID, api) {
  const data = await fetchGardenData();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  const eggs = formatSection("Eggs", data.egg?.items);
  const seeds = formatSection("Seeds", data.seed?.items);
  const gear = formatSection("Gear", data.gear?.items);
  const cosmetics = formatSection("Cosmetics", data.cosmetics?.items);

  const stockMsg = `
╭────────────────────────────╮
🌱 𝗔𝘂𝘁𝗼-𝗦𝘁𝗼𝗰𝗸 𝗨𝗽𝗱𝗮𝘁𝗲 🌱
🕒 ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
💠 Auto-stock active
╰────────────────────────────╯

╭─🛠️ 𝗚𝗲𝗮𝗿────────────────────╮
${gear}
╰────────────────────────────╯

╭─🥚 𝗘𝗴𝗴𝘀─────────────────────╮
${eggs}
╰────────────────────────────╯

╭─💄 𝗖𝗼𝘀𝗺𝗲𝘁𝗶𝗰𝘀────────────────╮
${cosmetics}
╰────────────────────────────╯

╭─🌱 𝗦𝗲𝗲𝗱𝘀────────────────────╮
${seeds}
╰────────────────────────────╯
`.trim();

  api.sendMessage(stockMsg, threadID);

  // Special items alert
  const allItems = [
    ...(data.egg?.items || []),
    ...(data.seed?.items || []),
    ...(data.gear?.items || []),
    ...(data.cosmetics?.items || [])
  ];

  const foundSpecial = allItems.filter(i =>
    SPECIAL_ITEMS.some(si => i.name.toLowerCase().includes(si.toLowerCase()))
  );

  if (foundSpecial.length > 0) {
    const specialMsg = `
╭────────────────────────────╮
🚨 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗜𝘁𝗲𝗺 𝗔𝗹𝗲𝗿𝘁 🚨
🕒 ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
╰────────────────────────────╯
${foundSpecial.map(i => `• ✨ ${toBoldUnicode(i.name)} (${i.quantity})`).join("\n")}
╰────────────────────────────╯
    `.trim();
    api.sendMessage(specialMsg, threadID);
  }
} 
// Start auto-stock for a GC
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

// Command handler
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();
  let gcData = (await getData(`stock/${threadID}`)) || { enabled: false };

  if (option === "on") {
    if (gcData.enabled) return api.sendMessage("⚠️ Auto-stock already enabled.", threadID, messageID);

    gcData.enabled = true;
    await setData(`stock/${threadID}`, gcData);
    startAutoStock(threadID, api);
    return api.sendMessage("✅ Auto-stock enabled. Updates every 5 minutes aligned to next restock.", threadID, messageID);
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
