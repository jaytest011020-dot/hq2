const axios = require('axios');
const cheerio = require('cheerio');
const { setData, getData } = require('../../database.js');

module.exports.config = {
  name: "stockPvB",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Plants vs Brainrots auto-stock with latest seeds + emoji and styled boxes",
  usePrefix: true,
  commandCategory: "PvB tools",
  usages: "/stockpvb on|off|check",
  cooldowns: 10,
};

// Auto-stock timers per GC
const autoStockTimers = {};

// Emoji mapping for seeds
const ITEM_EMOJI = {
  "Sunflower": "🌻", "Pumpkin": "🎃", "Dragon Fruit": "🐉",
  "Watermelon": "🍉", "Tomato": "🍅", "Strawberry": "🍓",
  "Carrot": "🥕", "Apple": "🍎", "Mango": "🥭",
};

// Helper: assign emoji to item
function getEmoji(name) {
  return ITEM_EMOJI[name] || "❔";
}

// Helper: get next 5-minute aligned restock
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

// Scrape latest stock (seeds only) from PvB website
async function scrapePvBStock() {
  const url = "https://vsbrainrots.com/stock";  // Replace with actual link
  try {
    const { data } = await axios.get(url);  // Fetch the page content
    const $ = cheerio.load(data);  // Load the HTML into cheerio

    // Scraping logic: Modify according to the website structure
    const seeds = [];

    // Example scraping of latest seeds (Adjust the selectors based on actual structure)
    $(".stock__list .stock__item").each((index, element) => {
      const name = $(element).find(".stock__name").text().trim();
      const quantity = $(element).find(".stock__quantity").text().trim();
      if (name && quantity && name.toLowerCase().includes('seed')) {  // Filter for seeds only
        seeds.push({ name, quantity });
      }
    });

    return { seeds };
  } catch (error) {
    console.error("Error scraping stock data:", error);
    return null;
  }
}

// Format a section (seeds)
function formatSectionText(items) {
  if (!items || items.length === 0) return "❌ Empty";
  return items.map(i => `• ${getEmoji(i.name)} ${i.name} (${i.quantity ?? "N/A"})`).join("\n");
}

// Send styled stock update
async function sendPvBStock(threadID, api) {
  const data = await scrapePvBStock();  // Scrape the latest seeds data
  if (!data) return;

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min();

  // Format stock sections
  const seedText = formatSectionText(data.seeds);

  // Styled message template
  const stockMsg = `
╭─────────────────╮
🌱 𝗔𝘂𝘁𝗼-𝗦𝘁𝗼𝗰𝗸 𝗨𝗽𝗱𝗮𝘁𝗲 🌱
🕒 Current Time: ${now.toLocaleTimeString("en-PH", { hour12: false })}
🔄 Next Restock: ${next.toLocaleTimeString("en-PH", { hour12: false })}
╰─────────────────╯

╭─🌱 Seeds───────────╮
${seedText}
╰──────────────────╯`;

  api.sendMessage(stockMsg, threadID);
}

// Start auto-stock timer
async function startAutoStock(threadID, api) {
  if (autoStockTimers[threadID]) return;
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next = getNext5Min(now);
  const delay = next.getTime() - now.getTime();

  setTimeout(() => {
    sendPvBStock(threadID, api);
    autoStockTimers[threadID] = setInterval(() => sendPvBStock(threadID, api), 5 * 60 * 1000);
  }, delay);
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0]?.toLowerCase();
  let gcData = (await getData(`stockPvB/${threadID}`)) || { enabled: false };

  if (gcData.enabled && option && option !== "off" && option !== "check") {
    return api.sendMessage("⚠️ Auto-stock is already active.", threadID, messageID);
  }

  if (option === "on") {
    if (gcData.enabled) return api.sendMessage("⚠️ Auto-stock already enabled.", threadID, messageID);
    gcData.enabled = true;
    await setData(`stockPvB/${threadID}`, gcData);
    startAutoStock(threadID, api);
    return api.sendMessage("✅ Auto-stock enabled. Updates every 5 minutes.", threadID, messageID);
  }

  if (option === "off") {
    gcData.enabled = false;
    await setData(`stockPvB/${threadID}`, gcData);
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

  api.sendMessage("⚠️ Usage: /stockpvb on|off|check", threadID, messageID);
};

// Auto-resume all enabled GCs on bot restart
module.exports.onLoad = async function({ api }) {
  const allGCs = (await getData("stockPvB")) || {};
  for (const tid in allGCs) {
    if (allGCs[tid].enabled) {
      startAutoStock(tid, api);
      api.sendMessage("♻️ Bot restarted — Auto-stock resumed.", tid);
    }
  }
};
