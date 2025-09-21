const https = require("https");

function createOptions(path) {
  return {
    method: "GET",
    hostname: "growagarden.gg",
    path: path,
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      priority: "u=1, i",
      referer: "https://growagarden.gg/values",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0",
      "Content-Length": "0", // ✅ importante
    },
  };
}

function fetchItems(path) {
  return new Promise((resolve, reject) => {
    const options = createOptions(path);
    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(new Error("Failed to parse JSON: " + err.message + "\n" + data.slice(0,200)));
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.end();
  });
}

module.exports.config = {
  name: "getitems",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Get Grow A Garden item info",
  commandCategory: "garden",
  usages: "/getitems <name>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  try {
    const itemName = args.join(" ").toLowerCase();
    if (!itemName) {
      return api.sendMessage("❌ Please provide an item name.", event.threadID, event.messageID);
    }

    const stats = await fetchItems("/api/v1/items/Gag/all?page=1&limit=1000000&sortBy=position");

    if (!stats.items) {
      return api.sendMessage("❌ No items data found.", event.threadID, event.messageID);
    }

    const found = stats.items.filter(
      (item) => item.name.toLowerCase().includes(itemName)
    );

    if (!found.length) {
      return api.sendMessage("❌ Item not found.", event.threadID, event.messageID);
    }

    let msg = `🍎 Item Info (${found.length} result${found.length>1?"s":""})\n\n`;
    found.forEach((f) => {
      msg += `• Name: ${f.name}\n`;
      msg += `  Category: ${f.category}\n`;
      msg += `  Rarity: ${f.rarity}\n`;
      msg += `  Mutation: ${f.mutation || "None"}\n\n`;
    });

    api.sendMessage(msg.trim(), event.threadID, event.messageID);
  } catch (err) {
    api.sendMessage("❌ Failed to fetch items: " + err.message, event.threadID, event.messageID);
  }
};
