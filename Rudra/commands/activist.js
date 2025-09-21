const axios = require("axios");

module.exports.config = {
  name: "activist",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Generate activist image for mentioned user",
  usePrefix: true,
  commandCategory: "fun",
  usages: "/activist @mention <text>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  try {
    // Check for mentions
    if (!event.mentions || Object.keys(event.mentions).length === 0) {
      return api.sendMessage(
        "❌ Please mention someone.\nUsage: /activist @mention <text>",
        event.threadID,
        event.messageID
      );
    }

    const mentionId = Object.keys(event.mentions)[0];
    const mentionName = event.mentions[mentionId];
    const text = args.slice(1).join(" ") || "Test";

    const url = `https://betadash-api-swordslush-production.up.railway.app/activists?userid=${mentionId}&text=${encodeURIComponent(text)}`;

    // Fetch image as stream (no need to save file)
    const response = await axios.get(url, { responseType: "stream" });

    await api.sendMessage(
      {
        body: `🖼 Activist card for ${mentionName}\nText: ${text}`,
        attachment: response.data
      },
      event.threadID,
      event.messageID
    );
  } catch (e) {
    api.sendMessage("❌ Error: " + e.message, event.threadID, event.messageID);
  }
};
