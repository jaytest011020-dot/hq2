const axios = require("axios");

module.exports.config = {
  name: "breakingnews",
  version: "1.0.0",
  credits: "ChatGPT + Jaylord La Peña",
  description: "Send breaking news style image",
  usages: "/breakingnews @mention|channel|title|headline",
  commandCategory: "fun",
  cooldowns: 5,
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const mentions = event.mentions;

  // 🔹 Check if user mentioned
  if (!mentions || Object.keys(mentions).length === 0) {
    return api.sendMessage("❌ Please mention a user.\nUsage: /breakingnews @mention|channel|title|headline", threadID, messageID);
  }

  // 🔹 Get first mentioned user
  const targetUID = Object.keys(mentions)[0];
  const mentionName = mentions[targetUID];

  // 🔹 Split args by "|"
  const input = args.join(" ").split("|");
  if (input.length < 4) {
    return api.sendMessage("❌ Usage: /breakingnews @mention|channel|title|headline", threadID, messageID);
  }

  const channel = input[1]?.trim();
  const title = input[2]?.trim();
  const headline = input[3]?.trim();

  // 🔹 API URL
  const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/breaking-news?userid=${targetUID}&channel=${encodeURIComponent(channel)}&title=${encodeURIComponent(title)}&headline=${encodeURIComponent(headline)}`;

  try {
    // Fetch image
    const response = await axios.get(apiUrl, { responseType: "stream" });

    return api.sendMessage(
      {
        body: `📰 Flash News Report!\n\n👤 Reporter: ${mentionName}\n📺 Channel: ${channel}\n📝 ${title}\n\n${headline}`,
        attachment: response.data
      },
      threadID,
      messageID
    );
  } catch (err) {
    console.error("[FLASHNEWS] API Error:", err.message || err);
    return api.sendMessage("⚠️ Failed to fetch flash news image. Please try again later.", threadID, messageID);
  }
};
