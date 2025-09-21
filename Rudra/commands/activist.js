const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "activist",
  version: "1.0.0",
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

    // Fetch image as arraybuffer
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");

    // Temporary file
    const tempPath = path.join(__dirname, `activist_${mentionId}.png`);
    fs.writeFileSync(tempPath, buffer);

    // Send image
    api.sendMessage(
      { attachment: fs.createReadStream(tempPath) },
      event.threadID,
      event.messageID,
      () => fs.unlinkSync(tempPath) // delete temp file after sending
    );
  } catch (e) {
    api.sendMessage("❌ Error: " + e.message, event.threadID, event.messageID);
  }
};
