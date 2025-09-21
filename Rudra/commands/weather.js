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
      referer: "https://growagarden.gg/weather",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    },
  };
}

function fetchWeatherStats(path) {
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

module.exports.config = {
  name: "weather",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Get only active weather events from Grow A Garden",
  commandCategory: "garden",
  usages: "/weather",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event }) {
  try {
    const stats = await fetchWeatherStats("/api/weather/stats");
    
    let activeEvents = [];
    if (Array.isArray(stats.events)) {
      activeEvents = stats.events.filter(ev => ev.active === true);
    }

    let msg = "🌦 Grow A Garden Active Weather Events 🌱\n\n";
    if (activeEvents.length > 0) {
      activeEvents.forEach((ev, idx) => {
        msg += `• ${ev.name || "Unknown"}\n`;
      });
    } else {
      msg += "❌ No active events right now.";
    }

    api.sendMessage(msg, event.threadID, event.messageID);
  } catch (err) {
    api.sendMessage(
      "❌ Failed to fetch weather stats: " + err.message,
      event.threadID,
      event.messageID
    );
  }
};
