const https = require("https");

module.exports.config = {
  name: "getitems",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Fetch items from Grow A Garden API",
  commandCategory: "system",
  usages: "/getitems",
  cooldowns: 5,
};

function createOptions(path) {
  return {
    method: "GET",
    hostname: "growagarden.gg",
    path: path,
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      priority: "u=1, i",
      referer: "https://growagarden.gg/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
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
          reject(new Error("Failed to parse JSON: " + err.message));
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.end();
  });
}

module.exports.run = async function ({ api, event }) {
  const path = "/api/items"; // endpoint ng items
  try {
    const items = await fetchItems(path);

    // Example output: item names only
    const itemList = items
      .map((item) => `🍎 ${item.name}`)
      .join("\n");

    api.sendMessage(`Here are the items:\n\n${itemList}`, event.threadID);
  } catch (err) {
    api.sendMessage(
      "❌ Failed to fetch items: " + (err.message || "Unknown error"),
      event.threadID
    );
  }
};
