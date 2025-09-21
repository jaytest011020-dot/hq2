const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const VALUE_LIST_URL = "https://growagarden.gg/value-list";
const CACHE_FILE = path.join(__dirname, "growagarden_values.json");
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

async function fetchValues() {
  try {
    const { data } = await axios.get(VALUE_LIST_URL);
    const $ = cheerio.load(data);

    let items = [];

    // parsing sa bawat card (katulad sa screenshot mo)
    $(".card").each((i, el) => {
      const name = $(el).find("div:contains('Value')").prev().text().trim() || 
                   $(el).find(".card-title, h5").text().trim();

      const value = $(el).find("div:contains('Value')").text()
        .replace("Value:", "")
        .trim();

      if (name && value) {
        items.push({ name, value });
      }
    });

    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ timestamp: Date.now(), items }, null, 2)
    );

    return items;
  } catch (err) {
    console.error("❌ Error fetching value list:", err);
    return [];
  }
}

async function getValues() {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE);
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL) {
      return parsed.items;
    }
  }
  return await fetchValues();
}

module.exports.config = {
  name: "value",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord",
  hasPermission: 0,
  description: "Shows GrowAGarden item values",
  usages: "/values [all | <item name>]",
  commandCategory: "economy",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const items = await getValues();
  if (!items || items.length === 0) {
    return api.sendMessage("❌ Hindi ko nakuha yung value list ngayon.", event.threadID, event.messageID);
  }

  if (args.length > 0 && args[0].toLowerCase() !== "all") {
    const searchName = args.join(" ").toLowerCase();
    const found = items.find(i => i.name.toLowerCase() === searchName);
    if (found) {
      return api.sendMessage(`📦 ${found.name}\n💰 Value: ${found.value}`, event.threadID, event.messageID);
    } else {
      return api.sendMessage("❌ Item not found sa value list.", event.threadID, event.messageID);
    }
  } else {
    let msg = "📋 GrowAGarden Value List:\n\n";
    items.forEach(i => {
      msg += `- ${i.name}: ${i.value}\n`;
    });

    // Kung masyado mahaba, hatiin sa chunks
    const chunkSize = 1900;
    for (let i = 0; i < msg.length; i += chunkSize) {
      api.sendMessage(msg.slice(i, i + chunkSize), event.threadID, event.messageID);
    }
  }
};
