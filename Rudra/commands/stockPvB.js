const puppeteer = require("puppeteer");

module.exports.config = {
  name: "stockpvb",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Scrape Plants vs Brainrots stock page",
  usePrefix: true,
  commandCategory: "pvb tools",
  usages: "/stockpvb",
  cooldowns: 10,
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  try {
    api.sendMessage("⏳ Fetching latest stock data...", threadID, messageID);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://plantsvsbrainrots.com/stock", {
      waitUntil: "networkidle2",
    });

    await page.waitForSelector("body");

    // Kunin lahat ng text at hatiin sa lines
    const lines = await page.evaluate(() => {
      const text = document.body.innerText;
      return text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    });

    await browser.close();

    // Gawin text block para malinaw
    const result = lines.join("\n");

    return api.sendMessage(
      `🌱 𝗣𝗹𝗮𝗻𝘁𝘀 𝘃𝘀 𝗕𝗿𝗮𝗶𝗻𝗿𝗼𝘁𝘀 - 𝗦𝘁𝗼𝗰𝗸\n\n${result}`,
      threadID,
      messageID
    );
  } catch (err) {
    console.error(err);
    return api.sendMessage(
      "❌ Failed to fetch stock data.",
      threadID,
      messageID
    );
  }
};
