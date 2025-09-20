const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stock",
  version: "6.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Grow a Garden auto-stock with correct 5-min alignment",
  usePrefix: true,
  commandCategory: "gag tools",
  usages: "/stock on|off|check",
  cooldowns: 10,
};

// Special items
const SPECIAL_ITEMS = [
  "Grandmaster Sprinkler",
  "Master Sprinkler",
  "Level-up Lollipop",
  "Levelup Lollipop",
  "Medium Treat",
  "Medium Toy"
];

// Fetch stock
async function fetchGardenData() {
  try {
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

// 🔹 Get next 5-minute mark after current time
function getNext5Min(date = null) {
  const now = date || new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  let minutes = now.getMinutes();
  let nextMinutes = minutes - (minutes % 5) + 5; // next multiple of 5 strictly after now

  const next = new Date(now);
  next.setMinutes(nextMinutes);
  next.setSeconds(0, 0);

  if (nextMinutes >= 60) {
    next.setHours(now.getHours() + 1);
    next.setMinutes(0);
  }

  return next;
}

// 🔹 Send stock to a GC
async function sendStock(threadID, api) {
  const data = await fetchGardenData();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  const eggs = formatSection("eggs", data.egg?.items);
  const seeds = formatSection("seeds", data.seed?.items);
  const gear = formatSection("gear", data.gear?.items);

  const msg = `
🌱 𝗚𝗿𝗼𝘄 𝗮 𝗚𝗮𝗿𝗱𝗲𝗻 𝗦𝘁𝗼𝗰𝗸 🌱
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

  api.sendMessage(msg, threadID);
}

// 🔹 Scan for auto-stock
async function scanAndNotify(api) {
  const allGCs = (await getData("stock")) || {};
  for (const tid in allGCs) {
    if (!allGCs[tid].enabled) continue;

    const data = await fetchGardenData();
    if (!data) continue;

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const next = getNext5Min();

    const eggs = formatSection("eggs", data.egg?.items);
    const seeds = formatSection("seeds", data.seed?.items);
    const gear = formatSection("gear", data.gear?.items);

    // Special items alert
    const allItems = [...(data.egg?.items || []), ...(data.seed?.items || []), ...(data.gear?.items || [])];
    const foundSpecial = allItems.filter(i => SPECIAL_ITEMS.some(si => i.name.toLowerCase().includes(si.toLowerCase())));
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

      api.sendMessage(specialMsg, tid);
    }

    // Normal stock
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

    api.sendMessage(stockMsg, tid);
  }
}

// 🔹 Command: toggle
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();

  let gcData = (await getData(`stock/${threadID}`)) || { enabled: false };

  if (option === "on") {
    if (gcData.enabled) return api.sendMessage("⚠️ Auto-stock already enabled. Automatic notifications active.", threadID, messageID);
    gcData.enabled = true;
    await setData(`stock/${threadID}`, gcData);
    api.sendMessage("✅ Auto-stock enabled. Automatic updates every 5 minutes aligned to next restock.", threadID, messageID);
    return;
  }

  if (option === "off") {
    gcData.enabled = false;
    await setData(`stock/${threadID}`, gcData);
    return api.sendMessage("❌ Auto-stock disabled.", threadID, messageID);
  }

  if (option === "check") {
    const status = gcData.enabled ? "ON ✅" : "OFF ❌";
    return api.sendMessage(`📊 Auto-stock status: ${status}`, threadID, messageID);
  }

  api.sendMessage("⚠️ Use: /stock on|off|check", threadID, messageID);
};

// 🚀 Start auto-scan aligned to next 5-min mark
async function startAutoScan(api) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min(now);
  const delay = next.getTime() - now.getTime();

  setTimeout(() => {
    scanAndNotify(api); // first send
    setInterval(() => scanAndNotify(api), 5 * 60 * 1000); // then every 5 minutes
  }, delay);
}

// Initialize on bot load
setTimeout(() => {
  if (global.api) startAutoScan(global.api);
}, 5000);
