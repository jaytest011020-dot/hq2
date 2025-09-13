const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const cacheFile = path.join(__dirname, "stlCache.json");

if (!fs.existsSync(cacheFile)) {
  fs.writeFileSync(cacheFile, JSON.stringify({ lastPost: "" }, null, 2));
}

function loadCache() {
  return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
}
function saveCache(data) {
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "stlcagayan",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Fetch latest STL Cagayan results from FB page",
  commandCategory: "lotto",
  usages: "/stlcagayan",
  cooldowns: 10
};

// manual trigger
module.exports.run = async function ({ api, event }) {
  const result = await fetchSTLCagayan();
  if (result) {
    api.sendMessage("📢 Latest STL Cagayan Result:\n\n" + result, event.threadID);
  } else {
    api.sendMessage("⚠️ Could not fetch STL Cagayan result right now.", event.threadID);
  }
};

// auto-check every 5 minutes
let started = false;
module.exports.handleEvent = async function ({ api }) {
  if (started) return;
  started = true;

  setInterval(async () => {
    const result = await fetchSTLCagayan();
    if (!result) return;

    const cache = loadCache();
    if (result !== cache.lastPost) {
      cache.lastPost = result;
      saveCache(cache);

      // auto-post to all GCs where bot is active
      const threads = await api.getThreadList(50, null, ["INBOX"]);
      const groupThreads = threads.filter(t => t.isGroup);

      for (const t of groupThreads) {
        api.sendMessage("📢 [AUTO] STL Cagayan Result Update:\n\n" + result, t.threadID);
        await new Promise(res => setTimeout(res, 1000)); // avoid spam
      }
    }
  }, 5 * 60 * 1000);
};

// scraper function
async function fetchSTLCagayan() {
  try {
    const url = "https://www.facebook.com/share/1D2AUnufZZ/"; // STL Cagayan FB link
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const posts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("div[role='article']"))
        .map(el => el.innerText)
        .filter(Boolean);
    });

    await browser.close();

    const resultPost = posts.find(p => /STL\s+Cagayan/i.test(p));
    return resultPost || null;
  } catch (err) {
    console.error("❌ STL Scraper Error:", err.message);
    return null;
  }
}
