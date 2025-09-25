const https = require("https");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stock",
  version: "6.7.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "GrowAGarden auto-stock with dynamic emojis and live alerts",
  usePrefix: true,
  commandCategory: "gag tools",
  usages: "/stock on|off|check",
  cooldowns: 10,
};

const SPECIAL_ITEMS = [
  "Grandmaster Sprinkler",
  "Master Sprinkler",
  "Level-up Lollipop",
  "Levelup Lollipop",
  "Medium Treat",
  "Medium Toy"
];

const autoStockTimers = {};

function guessEmojiFromName(name, category) {
  const lower = name.toLowerCase();
  const keywords = {
    carrot: "🥕",
    tomato: "🍅",
    lettuce: "🥬",
    egg: "🥚",
    chicken: "🐔",
    duck: "🦆",
    watering: "💧",
    sprinkler: "💦",
    hat: "🎩",
    bag: "👜",
    lollipop: "🍭",
    toy: "🧸",
    treat: "🍪",
    flower: "🌸",
    fruit: "🍓",
    seed: "🌱",
    candy: "🍬",
    chocolate: "🍫",
    potion: "🧪",
    box: "📦"
  };

  for (const key in keywords) if (lower.includes(key)) return keywords[key];

  const DEFAULT_EMOJIS = { seed: "🌱", egg: "🥚", gear: "🛠️", cosmetics: "💄" };
  return DEFAULT_EMOJIS[category] || "❔";
}

async function saveNewItem(item, category) {
  const path = `stock/items/${category}/${item.name}`;
  const existing = await getData(path);
  if (!existing) {
    const emoji = guessEmojiFromName(item.name, category);
    await setData(path, { name: item.name, emoji });
    console.log(`🆕 New item added: ${emoji} ${item.name} (${category})`);
    return emoji;
  }
  return existing.emoji;
}

async function formatSection(title, items, category) {
  if (!items || items.length === 0) return [`❌ No ${title}`];
  const lines = [];
  for (let i of items) {
    const emoji = await saveNewItem(i, category);
    lines.push(`• ${emoji} ${i.name} (${i.value ?? i.quantity ?? "N/A"})`);
  }

  // Split into multiple messages if too many items
  const CHUNK_SIZE = 20;
  const chunks = [];
  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    chunks.push(lines.slice(i, i + CHUNK_SIZE).join("\n"));
  }
  return chunks;
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

async function sendStock(threadID, api) {
  const data = await fetchStocks();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  const gearChunks = await formatSection("Gear", data.gearStock, "gear");
  const eggChunks = await formatSection("Eggs", data.eggStock, "egg");
  const cosmeticsChunks = await formatSection("Cosmetics", data.cosmeticsStock, "cosmetics");
  const seedChunks = await formatSection("Seeds", data.seedsStock, "seed");

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

  // Special items
  const allItems = [
    ...(data.gearStock || []),
    ...(data.eggStock || []),
    ...(data.cosmeticsStock || []),
    ...(data.seedsStock || [])
  ];

  const foundSpecial = allItems.filter(i =>
    SPECIAL_ITEMS.some(si => i.name.toLowerCase().includes(si.toLowerCase()))
  );

  if (foundSpecial.length > 0) {
    const specialMsg = `
🚨 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗦𝘁𝗼𝗰𝗸 🚨
──────────────────────
🕒 Current PH Time: ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
──────────────────────
${foundSpecial.map(i => `✨ ${i.name} (${i.value ?? i.quantity ?? "N/A"})`).join("\n")}
──────────────────────
    `.trim();
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

module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("stock")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — Auto-stock resumed.", tid);
    }
  }
};
