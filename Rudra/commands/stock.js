const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// 🔹 JSON file path para sa persistent GC list
const gcFilePath = path.join(__dirname, "activeGCs.json");

// 🔹 Load saved GC list
let autoStockStatus = {}; // per GC: true/false
if (fs.existsSync(gcFilePath)) {
  try {
    const saved = fs.readJsonSync(gcFilePath);
    if (typeof saved === "object" && saved !== null) autoStockStatus = saved;
  } catch (err) {
    console.error("Failed to load saved GC list:", err);
  }
}

// 🔹 Function to save GC list to file
function saveGCs() {
  fs.writeJsonSync(gcFilePath, autoStockStatus);
}

module.exports.config = {
  name: "stock",
  version: "3.1.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Check Grow a Garden stock & auto notify when restocked (per GC toggle)",
  usePrefix: true,
  commandCategory: "gag tools",
  usages: "/stock on|off|check",
  cooldowns: 10,
};

// 🔹 Next restock calculation (PH time, rounded to nearest 5 minutes)
function getNextRestockPH(interval = 5) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  let minutes = now.getMinutes();
  let nextMinutes = Math.ceil((minutes + 0.001) / interval) * interval;
  let next = new Date(now);
  next.setMinutes(nextMinutes);
  next.setSeconds(0, 0);
  if (nextMinutes >= 60) {
    next.setHours(now.getHours() + 1);
    next.setMinutes(0);
  }
  return {
    current: now.toLocaleTimeString("en-PH", { hour12: false }),
    next: next.toLocaleTimeString("en-PH", { hour12: false })
  };
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

let started = false;

module.exports.run = async function ({ api, event, args }) {
  try {
    const threadID = event.threadID;
    const option = args[0]?.toLowerCase();

    // 🔹 Toggle per GC
    if (option === "on") {
      autoStockStatus[threadID] = true;
      saveGCs();
      return api.sendMessage("✅ Auto-stock enabled for this GC.", threadID, event.messageID);
    }
    if (option === "off") {
      autoStockStatus[threadID] = false;
      saveGCs();
      return api.sendMessage("❌ Auto-stock disabled for this GC.", threadID, event.messageID);
    }
    if (option === "check") {
      const status = autoStockStatus[threadID] ? "ON ✅" : "OFF ❌";
      return api.sendMessage(`📊 Auto-stock status for this GC: ${status}`, threadID, event.messageID);
    }

    // 🔹 Manual stock fetch
    const resData = await fetchGardenData();
    if (!resData) return api.sendMessage("⚠️ Failed to fetch data.", threadID);

    const { current, next } = getNextRestockPH();

    const eggs = formatSection("eggs", resData.egg?.items);
    const seeds = formatSection("seeds", resData.seed?.items);
    const gear = formatSection("gear", resData.gear?.items);

    const message = `
🌱 𝗚𝗿𝗼𝘄 𝗮 𝗚𝗮𝗿𝗱𝗲𝗻 𝗦𝘁𝗼𝗰𝗸 🌱
──────────────────────
🕒 Current PH Time: ${current}
🔄 Next Restock: ${next}
──────────────────────

🥚 𝗘𝗴𝗴𝘀
${eggs}

🌾 𝗦𝗲𝗲𝗱𝘀
${seeds}

🛠️ 𝗚𝗲𝗮𝗿
${gear}
──────────────────────
    `;

    api.sendMessage(message.trim(), threadID, event.messageID);

    // ✅ Start auto notifier only once
    if (!started) {
      started = true;
      setInterval(async () => {
        const data = await fetchGardenData();
        if (!data) return;

        const { current, next } = getNextRestockPH();
        const eggs = formatSection("eggs", data.egg?.items);
        const seeds = formatSection("seeds", data.seed?.items);
        const gear = formatSection("gear", data.gear?.items);

        const autoMessage = `
🌱 𝗔𝘂𝘁𝗼 𝗥𝗲𝘀𝘁𝗼𝗰𝗸 𝗔𝗹𝗲𝗿𝘁 🌱
──────────────────────
🕒 Current PH Time: ${current}
🔄 Next Restock: ${next}
──────────────────────

🥚 𝗘𝗴𝗴𝘀
${eggs}

🌾 𝗦𝗲𝗲𝗱𝘀
${seeds}

🛠️ 𝗚𝗲𝗮𝗿
${gear}
──────────────────────
        `;

        // 🔹 Send only to GCs with auto-stock ON
        Object.keys(autoStockStatus).forEach((tid) => {
          if (autoStockStatus[tid]) api.sendMessage(autoMessage.trim(), tid);
        });
      }, 5 * 60 * 1000); // every 5 minutes
    }
  } catch (err) {
    console.error(err);
    api.sendMessage("⚠️ Error fetching Grow a Garden stock.", event.threadID);
  }
};
