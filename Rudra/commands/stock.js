const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stock",
  version: "6.2.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Grow a Garden auto-stock with correct 5-min alignment & Firebase",
  usePrefix: true,
  commandCategory: "gag tools",
  usages: "/stock on|off|check",
  cooldowns: 10,
};

// Special items to alert
const SPECIAL_ITEMS = [
  "Grandmaster Sprinkler",
  "Master Sprinkler",
  "Level-up Lollipop",
  "Levelup Lollipop",
  "Medium Treat",
  "Medium Toy"
];

// Auto-stock timers per GC
const autoStockTimers = {};
let autoStockQueue = []; // Queue to stagger multiple GCs

// Always 10-second delay before every API request
async function fetchGardenData() {
  try {
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
    const res = await axios.get("https://gagstock.gleeze.com/grow-a-garden");
    return res.data?.data || {};
  } catch {
    return null;
  }
}

// Format items
function formatSection(title, items) {
  if (!items || items.length === 0) return `❌ No ${title}`;
  return items.map(i => `• ${i.emoji || ""} ${i.name} (${i.quantity})`).join("\n");
}

// Get next 5-minute mark strictly after now
function getNext5Min(date = null) {
  const now = date || new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  let minutes = now.getMinutes();
  let nextMinutes = minutes - (minutes % 5) + 5;

  const next = new Date(now);
  next.setMinutes(nextMinutes);
  next.setSeconds(0, 0);
  if (nextMinutes >= 60) {
    next.setHours(now.getHours() + 1);
    next.setMinutes(0);
  }
  return next;
}

// Send stock to a GC
async function sendStock(threadID, api) {
  const data = await fetchGardenData();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  const eggs = formatSection("eggs", data.egg?.items);
  const seeds = formatSection("seeds", data.seed?.items);
  const gear = formatSection("gear", data.gear?.items);

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
──────────────────────
  `.trim();

  // Send main stock message immediately
  api.sendMessage(stockMsg, threadID);

  // Special items alert (with 10-second delay)
  const allItems = [...(data.egg?.items || []), ...(data.seed?.items || []), ...(data.gear?.items || [])];
  const foundSpecial = allItems.filter(i =>
    SPECIAL_ITEMS.some(si => i.name.toLowerCase().includes(si.toLowerCase()))
  );

  if (foundSpecial.length > 0) {
    setTimeout(() => {
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
    }, 10000); // 10s delay
  }
}

// Start auto-stock for a GC
async function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;

  // Add GC to queue if not already
  if (!autoStockQueue.includes(threadID)) autoStockQueue.push(threadID);

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min(now);
  const baseDelay = next.getTime() - now.getTime();

  // Stagger delay: 10s × queue position
  const position = autoStockQueue.indexOf(threadID);
  const totalDelay = baseDelay + position * 10000;

  setTimeout(() => {
    sendStock(threadID, api); // first send
    autoStockTimers[threadID] = setInterval(() => sendStock(threadID, api), 5 * 60 * 1000);
    autoStockQueue = autoStockQueue.filter(tid => tid !== threadID); // remove from queue
  }, totalDelay);
}

// Command: /stock
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
