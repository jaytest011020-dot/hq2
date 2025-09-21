const https = require("https");

module.exports.config = {
  name: "value",
  version: "1.0.0",
  credits: "ChatGPT + NN",
  hasPermission: 0,
  description: "Fetch Grow a Garden Value List",
  usages: "/values [all | <item name>]",
  commandCategory: "games",
  cooldowns: 5
};

function fetchValues() {
  const options = {
    method: "GET",
    hostname: "growagarden.gg",
    path: "/api/values", // <-- ito kailangan natin i-confirm exact path
    headers: {
      accept: "*/*",
      "content-type": "application/json",
      referer: "https://growagarden.gg/value-list"
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        try {
          const body = Buffer.concat(chunks);
          resolve(JSON.parse(body.toString()));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", (err) => reject(err));
    req.end();
  });
}

function formatValuesMessage(values, search) {
  if (!values) return "❌ Failed to fetch value list.";
  let msg = "";

  if (search) {
    const found = values.find(v => v.name.toLowerCase() === search.toLowerCase());
    if (found) {
      msg = `📦 ${found.name}\n💰 Value: ${found.value}\n📈 Demand: ${found.demand || "N/A"}\n📊 Trend: ${found.trend || "N/A"}`;
    } else {
      msg = "❌ Item not found.";
    }
  } else {
    msg = "📋 **Grow a Garden Value List** 📋\n\n";
    values.forEach(v => {
      msg += `- ${v.name}: 💰 ${v.value}\n`;
    });
  }

  return msg;
}

module.exports.run = async function({ api, event, args }) {
  try {
    const values = await fetchValues();
    const search = args.length > 0 && args[0].toLowerCase() !== "all" ? args.join(" ") : null;
    const msg = formatValuesMessage(values, search);
    api.sendMessage(msg, event.threadID, event.messageID);
  } catch (err) {
    console.error("[VALUES] Error:", err);
    api.sendMessage("❌ Failed to fetch Grow a Garden values.", event.threadID, event.messageID);
  }
};
