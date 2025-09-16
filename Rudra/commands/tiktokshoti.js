const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "tiktok",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Get random TikTok video from API",
  commandCategory: "fun",
  usages: "/tiktok",
  cooldowns: 5,
};

module.exports.run = async ({ api, event }) => {
  const { threadID, messageID } = event;
  const tmpPath = path.join(__dirname, "cache", `tiktok_${Date.now()}.mp4`);

  try {
    // 🔹 Fetch video data from API
    const res = await axios.get("https://kaiz-apis.gleeze.com/api/shoti?apikey=71ee3719-dd7d-4a98-8484-eb0bb3081e0f");
    const data = res.data;

    if (!data || data.status !== "success") {
      return api.sendMessage("⚠️ Failed to fetch TikTok video.", threadID, messageID);
    }

    const videoUrl = data.shoti.videoUrl;
    const title = data.shoti.title || "No title";
    const author = data.shoti.author || "Unknown";
    const username = data.shoti.username ? `@${data.shoti.username}` : "";
    const duration = data.shoti.duration ? `${data.shoti.duration}s` : "N/A";

    // 🔹 Download video
    const videoBuffer = (await axios.get(videoUrl, { responseType: "arraybuffer" })).data;
    fs.writeFileSync(tmpPath, Buffer.from(videoBuffer, "binary"));

    // 🔹 Send video with info
    api.sendMessage(
      {
        body: `🎥 𝗧𝗶𝗸𝗧𝗼𝗸 𝗩𝗶𝗱𝗲𝗼\n\n👤 Author: ${author}\n📛 Username: ${username}\n📝 Title: ${title}\n⏱ Duration: ${duration}`,
        attachment: fs.createReadStream(tmpPath),
      },
      threadID,
      () => fs.unlinkSync(tmpPath), // auto-delete after sending
      messageID
    );
  } catch (err) {
    console.error("❌ TikTok Command Error:", err);
    api.sendMessage("⚠️ Error fetching or sending TikTok video.", threadID, messageID);
  }
};
