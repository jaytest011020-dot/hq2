const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stock",
  version: "6.4.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Grow a Garden auto-stock with correct 5-min alignment and unique emojis",
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

const DEFAULT_EMOJIS = {
  seed: "🌱",
  egg: "🥚",
  gear: "🛠️",
  cosmetics: "💄"
};

const ITEM_EMOJIS = {
  "Carrot Seed": "🥕",
  "Tomato Seed": "🍅",
  "Lettuce Seed": "🥬",
  "Chicken Egg": "🐔",
  "Duck Egg": "🦆",
  "Watering Can": "💧",
  "Grandmaster Sprinkler": "💦",
  "Cosmetic Hat": "🎩",
  "Cosmetic Bag": "👜"
};

function guessEmoji(name, category) {
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
    treat: "🍪"
  };
  for (let key in keywords) if (lower.includes(key)) return keywords[key];
  return DEFAULT_EMOJIS[category] || "❔";
}

async function fetchGardenData() {
  try {
    const res = await axios.get("https://gagstock.gleeze.com/grow-a-garden");
    return res.data?.data || {};
  } catch {
    return null;
  }
}

async function saveNewItem(item, category) {
  const path = `stock/items/${category}/${item.name}`;
  const existing = await getData(path);
  if (!existing) {
    const emoji = ITEM_EMOJIS[item.name] || guessEmoji(item.name, category);
    await setData(path, { name: item.name, emoji });
    console.log(`🆕 New item added: ${emoji} ${item.name} (${category})`);
    return emoji;
  }
  return existing.emoji;
}

async function formatSection(title, items, category) {
  if (!items || items.length === 0) return `❌ No ${title}`;
  const lines = [];
  for (let i of items) {
    const emoji = await saveNewItem(i, category);
    lines.push(`• ${emoji} ${i.name} (${i.quantity})`);
  }
  return lines.join("\n");
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
  const data = await fetchGardenData();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  const eggs = await formatSection("eggs", data.egg?.items, "egg");
  const seeds = await formatSection("seeds", data.seed?.items, "seed");
  const gear = await formatSection("gear", data.gear?.items, "gear");
  const cosmetics = await formatSection("cosmetics", data.cosmetics?.items, "cosmetics");

  const stockMsg = `
🌱 𝗔𝘂𝘁𝗼 𝗥𝗲𝘀𝘁𝗼𝗰𝗸 🌱
──────────────────────
🕒 Current PH Time: ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
──────────────────────

🥚 𝗘𝗴𝗴𝘀
${eggs}

🌾 𝗦𝗲𝗲𝗱𝘀
${seeds}

🛠️ 𝗚𝗲𝗮𝗿
${gear}

💄 𝗖𝗼𝘀𝗺𝗲𝘁𝗶𝗰𝘀
${cosmetics}
──────────────────────
  `.trim();

  api.sendMessage(stockMsg, threadID);

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
🚨 𝗡𝗲𝘄 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗦𝘁𝗼𝗰𝗸 🚨
──────────────────────
🕒 Current PH Time: ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
──────────────────────
${foundSpecial.map(i => `✨ ${i.name} (${i.quantity})`).join("\n")}
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
    return api.sendMessage("⚠️ Auto-stock is already active. No need to use /stock manually.", threadID, messageID);
  }

  if (option === "on") {
    if (gcData.enabled) return api.sendMessage("⚠️ Auto-stock already enabled.", threadID, messageID);
    gcData.enabled = true;
    await setData(`stock/${threadID}`, gcData);
    startAutoStock(threadID, api);
    return api.sendMessage("✅ Auto-stock enabled. Updates every 5 minutes aligned to the next restock.", threadID, messageID);
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
