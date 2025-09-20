const axios = require("axios");
const { setData, getData } = require("../../database.js"); // ✅ Firebase
const path = require("path");

module.exports.config = {
  name: "stock",
  version: "5.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Check Grow a Garden stock & auto notify when restocked (with Firebase storage)",
  usePrefix: true,
  commandCategory: "gag tools",
  usages: "/stock on|off|check",
  cooldowns: 10,
};

// 🔹 Special items na idi-detect (case-insensitive)
const SPECIAL_ITEMS = [
  "Grandmaster Sprinkler",
  "Master Sprinkler",
  "Level-up Lollipop",
  "Levelup Lollipop",
  "Medium Treat",
  "Medium Toy"
];

// 🔹 Next restock calculation (PH time, aligned to 5 minutes)
function getNextRestockPH(interval = 5) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  let minutes = now.getMinutes();
  let nextMinutes = Math.ceil(minutes / interval) * interval;
  let next = new Date(now);
  next.setMinutes(nextMinutes);
  next.setSeconds(0, 0);
  if (nextMinutes >= 60) {
    next.setHours(now.getHours() + 1);
    next.setMinutes(0);
  }
  return { current: now, next };
}

// 🔹 Fetch stock data
async function fetchGardenData() {
  try {
    const response = await axios.get("https://gagstock.gleeze.com/grow-a-garden");
    return response.data?.data || {};
  } catch (e) {
    return null;
  }
}

// 🔹 Format sections
function formatSection(title, items) {
  if (!items || items.length === 0) return `❌ No ${title}`;
  return items.map((i) => `• ${i.emoji || ""} ${i.name} (${i.quantity})`).join("\n");
}

// 🔹 Command: Toggle & Manual Check
module.exports.run = async function ({ api, event, args }) {
  global.api = api; // 🟢 save api globally para magamit ng scanner
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();

  let gcData = (await getData(`stock/${threadID}`)) || { enabled: false };

  if (option === "on") {
    gcData.enabled = true;
    await setData(`stock/${threadID}`, gcData);
    return api.sendMessage("✅ Auto-stock enabled for this GC.", threadID, messageID);
  }
  if (option === "off") {
    gcData.enabled = false;
    await setData(`stock/${threadID}`, gcData);
    return api.sendMessage("❌ Auto-stock disabled for this GC.", threadID, messageID);
  }
  if (option === "check") {
    const status = gcData.enabled ? "ON ✅" : "OFF ❌";
    return api.sendMessage(`📊 Auto-stock status for this GC: ${status}`, threadID, messageID);
  }

  // 🔹 Manual fetch
  const resData = await fetchGardenData();
  if (!resData) return api.sendMessage("⚠️ Failed to fetch data.", threadID);

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const { next } = getNextRestockPH();

  const eggs = formatSection("eggs", resData.egg?.items);
  const seeds = formatSection("seeds", resData.seed?.items);
  const gear = formatSection("gear", resData.gear?.items);

  const message = `
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

  api.sendMessage(message, threadID, messageID);
};

// 🔹 Function: Scan and send notifications
async function scanAndNotify(api) {
  const data = await fetchGardenData();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const { next } = getNextRestockPH();

  const eggs = formatSection("eggs", data.egg?.items);
  const seeds = formatSection("seeds", data.seed?.items);
  const gear = formatSection("gear", data.gear?.items);

  // 🔎 Check for special items (send to ALL GCs kahit naka-off)
  const allItems = [
    ...(data.egg?.items || []),
    ...(data.seed?.items || []),
    ...(data.gear?.items || [])
  ];

  const foundSpecial = allItems.filter(item =>
    SPECIAL_ITEMS.some(si => item.name.toLowerCase().includes(si.toLowerCase()))
  );

  if (foundSpecial.length > 0) {
    const specialList = foundSpecial.map(i => `✨ ${i.name} (${i.quantity})`).join("\n");

    const notif = `
🚨 𝗡𝗲𝘄 𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗦𝘁𝗼𝗰𝗸 𝗗𝗲𝘁𝗲𝗰𝘁𝗲𝗱 🚨
──────────────────────
🕒 Current PH Time: ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
──────────────────────
${specialList}
──────────────────────
    `.trim();

    let allGCs = (await getData(`stock`)) || {};
    for (let tid in allGCs) {
      api.sendMessage(notif, tid);
    }
  }

  // 🔹 Normal auto-stock (enabled GCs only)
  const autoMessage = `
🌱 𝗔𝘂𝘁𝗼 𝗥𝗲𝘀𝘁𝗼𝗰𝗸 𝗔𝗹𝗲𝗿𝘁 🌱
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

  let allGCs = (await getData(`stock`)) || {};
  for (let tid in allGCs) {
    if (allGCs[tid].enabled) {
      api.sendMessage(autoMessage, tid);
    }
  }
}

// 🚀 Start global auto scanner (every 5 minutes)
setInterval(() => {
  if (global.api) {
    scanAndNotify(global.api);
  }
}, 5 * 60 * 1000);
