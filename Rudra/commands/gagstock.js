const https = require("https");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "gagstock",
  version: "6.8.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "GrowAGarden auto-stock (seeds, eggs, gear only) restricted to GC admins & Jaylord",
  usePrefix: true,
  commandCategory: "gag tools",
  usages: "/stock on|off|check",
  cooldowns: 10,
};

const autoStockTimers = {};

const OWNER_ID = "100094012127960"; // Replace this with your actual Facebook UID

const SPECIAL_ITEMS = [
  "Grandmaster Sprinkler",
  "Master Sprinkler",
  "Level-up Lollipop",
  "Medium Treat",
  "Medium Toy"
];

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
  "Medium Treat": "🍪", "Medium Toy": "🧸", "Night Staff": "🌙",
  "Star Caller": "⭐", "Garden Guide": "📖", "Godly Sprinkler": "🌪️",
  "Chocolate Sprinkler": "🍫", "Magnifying Glass": "🔍",
  "Master Sprinkler": "🌟💦", "Grandmaster Sprinkler": "🌊🔥",
  "Honey Sprinkler": "🍯💦", "Favorite Tool": "🛠️",
  "Silver Fertilizer": "⚪", "Level Up Lollipop": "🍭"
};

function getEmoji(name) {
  return ITEM_EMOJI[name] || "❔";
}

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

function formatSectionText(items) {
  if (!items || items.length === 0) return "❌ Empty";
  return items.map(i => `• ${getEmoji(i.name)} ${i.name} (${i.quantity ?? i.value ?? "N/A"})`).join("\n");
}

async function sendStock(threadID, api) {
  const data = await fetchStocks();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  const gearText = formatSectionText(data.gearStock);
  const eggText = formatSectionText(data.eggStock);
  const seedText = formatSectionText(data.seedsStock);

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

╭─🌱 Seeds─────────╮
${seedText}
╰─────────────────╯`;

  api.sendMessage(stockMsg, threadID);

  const allItems = [...(data.gearStock || []), ...(data.eggStock || []), ...(data.seedsStock || [])];
  const foundSpecial = allItems.filter(i => SPECIAL_ITEMS.some(si => i.name.toLowerCase().includes(si.toLowerCase())));
  if (foundSpecial.length > 0) {
    const specialMsg = `
🚨 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗦𝘁𝗼𝗰𝗸 🚨
──────────────────────
🕒 ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 ${next.toLocaleTimeString("en-PH", { hour12: false })}
──────────────────────
${foundSpecial.map(i => `✨ ${i.name} (${i.quantity ?? i.value ?? "N/A"})`).join("\n")}
──────────────────────`;
    api.sendMessage(specialMsg, threadID);
  }
}

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
  const { threadID, messageID, senderID } = event;
  const option = args[0]?.toLowerCase();
  let gcData = (await getData(`stock/${threadID}`)) || { enabled: false };

  // ✅ Allow only Jaylord or GC admins
  const info = await api.getThreadInfo(threadID);
  const adminIDs = info.adminIDs.map(a => a.id);
  if (!adminIDs.includes(senderID) && senderID !== OWNER_ID) {
    return api.sendMessage("❌ Only group admins or Jaylord can use this command.", threadID, messageID);
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

module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("stock")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — Auto-stock resumed.", tid);
    }
  }
};
