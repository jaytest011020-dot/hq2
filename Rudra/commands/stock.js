const https = require("https");

const options = {
  method: "GET",
  hostname: "growagarden.gg",
  port: null,
  path: "/api/stock",
  headers: {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    priority: "u=1, i",
    referer: "https://growagarden.gg/stocks",
    "trpc-accept": "application/json",
    "x-trpc-source": "gag"
  }
};

function fetchStocks() {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));

      res.on("end", () => {
        try {
          const body = Buffer.concat(chunks);
          const parsedData = JSON.parse(body.toString());
          resolve(parsedData);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.end();
  });
}

function formatStockItems(items) {
  if (!Array.isArray(items) || items.length === 0) return ["❌ None"];
  return items.map(item => `📦 ${item?.name || "Unknown"} — ${item?.value ?? "N/A"}`);
}

function formatStocks(stocks) {
  return [
    "⚙️ Gear Stock:\n" + formatStockItems(stocks.gearStock).join("\n"),
    "🥚 Egg Stock:\n" + formatStockItems(stocks.eggStock).join("\n"),
    "🎨 Cosmetics Stock:\n" + formatStockItems(stocks.cosmeticsStock).join("\n"),
    "🌱 Seeds Stock:\n" + formatStockItems(stocks.seedsStock).join("\n")
  ].join("\n\n");
}

module.exports.config = {
  name: "stock",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "Converted by ChatGPT",
  description: "Check GrowAGarden stock items (Gear, Egg, Cosmetics, Seeds only)",
  commandCategory: "economy",
  usages: "/stock",
  cooldowns: 5,
};

module.exports.run = async ({ api, event }) => {
  const { threadID, messageID } = event;

  try {
    api.sendMessage("⏳ Fetching stock data...", threadID, messageID);

    const data = await fetchStocks();
    if (!data) {
      return api.sendMessage("❌ Failed to fetch stock data.", threadID, messageID);
    }

    const formatted = formatStocks(data);
    api.sendMessage(`📊 GrowAGarden Stock Data:\n\n${formatted}`, threadID, messageID);

  } catch (err) {
    console.error("Error fetching stock:", err);
    api.sendMessage("⚠️ Error fetching stock data.", threadID, messageID);
  }
};
