const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { getData } = require("../../database.js"); // adjust path if needed

module.exports.config = {
  name: "activist",
  version: "1.0.4",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Generate activist image for mentioned user",
  usePrefix: true,
  commandCategory: "fun",
  usages: "/activist @mention <text>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // --- Maintenance check ---
  try {
    const maintenance = await getData("/maintenance");
    if (maintenance?.enabled) {
      const imgPath = path.join(__dirname, "cache", "maintenance.jpeg"); // bagong attachment
      return api.sendMessage(
        {
          body: "🚧 Bot is currently under maintenance. This command is temporarily disabled.",
          attachment: fs.existsSync(imgPath) ? fs.createReadStream(imgPath) : null,
        },
        threadID,
        messageID
      );
    }
  } catch (err) {
    console.error("Maintenance check failed:", err);
  }

  // --- Command logic ---
  try {
    if (!event.mentions || Object.keys(event.mentions).length === 0) {
      return api.sendMessage(
        "❌ Please mention someone.\nUsage: /activist @mention <text>",
        threadID,
        messageID
      );
    }

    const mentionId = Object.keys(event.mentions)[0];
    const mentionName = event.mentions[mentionId];
    const text = args.slice(1).join(" ") || "Test";

    const url = `https://betadash-api-swordslush-production.up.railway.app/activists?userid=${mentionId}&text=${encodeURIComponent(text)}`;

    const response = await axios.get(url, { responseType: "stream" });

    await api.sendMessage(
      {
        body: `🖼 Activist card for ${mentionName}\nText: ${text}`,
        attachment: response.data
      },
      threadID,
      messageID
    );
  } catch (e) {
    api.sendMessage("❌ Error: " + e.message, threadID, messageID);
  }
};
