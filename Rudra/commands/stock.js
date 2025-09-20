const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "stock",
  version: "5.1.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Auto notify Grow a Garden stock aligned to 5-minute intervals with Firebase",
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

// 🔹 Fetch stock data
async function fetchGardenData() {
  try {
    const res = await axios.get("https://gagstock.gleeze.com/grow-a-garden");
    return res.data?.data || {};
  } catch {
    return null;
  }
}

// 🔹 Format sections
function formatSection(title, items) {
  if (!items || items.length === 0) return `❌ No ${title}`;
  return items.map(i => `• ${i.emoji || ""} ${i.name} (${i.quantity})`).join("\n");
}

// 🔹 Send stock message
async function sendStock(threadID, api) {
  const data = await fetchGardenData();
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));

  const eggs = formatSection("eggs", data.egg?.items);
  const seeds = formatSection("seeds", data.seed?.items);
  const gear = formatSection("gear", data.gear?.items);

  // 🔎 Special items notification
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
🕒 ${now.toLocaleTimeString("en-PH", { hour12: false })}
──────────────────────
${specialList}
──────────────────────
    `.trim();

    const allGCs = (await getData(`stock`)) || {};
    for (let tid in allGCs) {
      api.sendMessage(notif, tid);
    }
  }

  const msg = `
🌱 𝗚𝗿𝗼𝘄 𝗮 𝗚𝗮𝗿𝗱𝗲𝗻 𝗦𝘁𝗼𝗰𝗸 🌱
──────────────────────
🕒 ${now.toLocaleTimeString("en-PH", { hour12: false })}
──────────────────────

🥚 𝗘𝗴𝗴𝘀
${eggs}

🌾 𝗦𝗲𝗲𝗱𝘀
${seeds}

🛠️ 𝗚𝗲𝗮𝗿
${gear}
──────────────────────
  `.trim();

  // 🔹 Send to enabled GCs
  const allGCs = (await getData(`stock`)) || {};
  for (let tid in allGCs) {
    if (allGCs[tid]?.enabled) api.sendMessage(msg, tid);
  }
}

// 🔹 Command: toggle & check
module.exports.run = async function({ api, event, args }) {
  global.api = api;
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();

  let gcData = (await getData(`stock/${threadID}`)) || { enabled: false };

  if (gcData.enabled && option && option !== "off") {
    return api.sendMessage("⚠️ Auto-stock already enabled. Manual /stock is disabled.", threadID, messageID);
  }

  if (option === "on") {
    gcData.enabled = true;
    await setData(`stock/${threadID}`, gcData);

    api.sendMessage("✅ Auto-stock enabled. Stock will be sent aligned to 5-minute marks automatically.", threadID, messageID);

    // 🔹 Align first send to nearest 5-minute mark
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    let minutes = now.getMinutes();
    let nextMinutes = Math.ceil(minutes / 5) * 5;
    let firstSend = new Date(now);
    firstSend.setMinutes(nextMinutes);
    firstSend.setSeconds(0, 0);
    if (nextMinutes >= 60) {
      firstSend.setHours(now.getHours() + 1);
      firstSend.setMinutes(0);
    }

    const delay = firstSend - now;

    setTimeout(async function firstSendFunc() {
      if (gcData.enabled) await sendStock(threadID, api);
      setInterval(async () => {
        const gcDataNow = (await getData(`stock/${threadID}`)) || { enabled: false };
        if (gcDataNow.enabled) await sendStock(threadID, api);
      }, 5 * 60 * 1000);
    }, delay);

    return;
  }

  if (option === "off") {
    gcData.enabled = false;
    await setData(`stock/${threadID}`, gcData);
    return api.sendMessage("❌ Auto-stock disabled.", threadID, messageID);
  }

  if (option === "check") {
    const status = gcData.enabled ? "ON ✅" : "OFF ❌";
    return api.sendMessage(`📊 Auto-stock status for this GC: ${status}`, threadID, messageID);
  }

  // 🔹 Manual fetch (if auto-stock is off)
  const resData = await fetchGardenData();
  if (!resData) return api.sendMessage("⚠️ Failed to fetch data.", threadID, messageID);

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const eggs = formatSection("eggs", resData.egg?.items);
  const seeds = formatSection("seeds", resData.seed?.items);
  const gear = formatSection("gear", resData.gear?.items);

  const msg = `
🌱 𝗚𝗿𝗼𝘄 𝗮 𝗚𝗮𝗿𝗱𝗲𝗻 𝗦𝘁𝗼𝗰𝗸 🌱
──────────────────────
🕒 ${now.toLocaleTimeString("en-PH", { hour12: false })}
──────────────────────

🥚 𝗘𝗴𝗴𝘀
${eggs}

🌾 𝗦𝗲𝗲𝗱𝘀
${seeds}

🛠️ 𝗚𝗲𝗮𝗿
${gear}
──────────────────────
  `.trim();

  api.sendMessage(msg, threadID, messageID);
};
