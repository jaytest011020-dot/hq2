const axios = require("axios");

module.exports.config = {
  name: "activist",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Generate activist image",
  commandCategory: "fun",
  usages: "/activist @mention <text>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  try {
    // Check kung may mention
    if (!event.mentions || Object.keys(event.mentions).length === 0) {
      return api.sendMessage("❌ Please mention someone.\nUsage: /activist @mention <text>", event.threadID, event.messageID);
    }

    // Kunin yung unang na-mention
    const mentionId = Object.keys(event.mentions)[0];
    const mentionName = event.mentions[mentionId];

    // Kunin text pagkatapos ng mention
    const text = args.slice(1).join(" ") || "Test";

    // Tawag sa API
    const url = `https://betadash-api-swordslush-production.up.railway.app/activists?userid=${mentionId}&text=${encodeURIComponent(text)}`;

    // Send image only
    api.sendMessage(
      {
        attachment: await global.utils.getStreamFromURL(url),
      },
      event.threadID,
      event.messageID
    );
  } catch (e) {
    api.sendMessage("❌ Error: " + e.message, event.threadID, event.messageID);
  }
};
