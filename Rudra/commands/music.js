module.exports.config = {
  name: "music",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Play or download music via API",
  commandCategory: "media",
  usages: "/music <song name>",
  cooldowns: 3
};

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  if (!args[0]) {
    return api.sendMessage("❌ Please provide a song name.\n\nExample: /music Ikaw by Yeng", threadID, messageID);
  }

  const query = encodeURIComponent(args.join(" "));
  const url = `https://betadash-api-swordslush-production.up.railway.app/sc?search=${query}`;

  const filePath = path.join(__dirname, "cache", `music_${Date.now()}.mp3`);

  try {
    api.sendMessage(`🔎 Searching for: "${args.join(" ")}"...\n⏳ Please wait...`, threadID, messageID);

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      api.sendMessage({
        body: `🎶 Here's your music:\n${args.join(" ")}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, () => fs.unlinkSync(filePath));
    });

    writer.on("error", () => {
      api.sendMessage("⚠️ Failed to download the music. Please try again.", threadID, messageID);
    });

  } catch (err) {
    console.error(err);
    return api.sendMessage("❌ Error fetching the music. Try another keyword.", threadID, messageID);
  }
};
