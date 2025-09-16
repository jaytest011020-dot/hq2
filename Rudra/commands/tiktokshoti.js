const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

let cooldowns = {}; // 🔹 cooldown storage (per user)

module.exports.config = {
  name: "tiktokshoti",
  version: "1.1.1",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Get random TikTok video from API",
  commandCategory: "fun",
  usages: "/tiktokshoti",
  cooldowns: 0, // handled manually
};

module.exports.run = async ({ api, event }) => {
  const { threadID, messageID, senderID } = event;
  const tmpPath = path.join(__dirname, "cache", `tiktok_${Date.now()}.mp4`);
  const cooldownTime = 20 * 1000; // 20 seconds

  // 🔹 Check cooldown
  if (cooldowns[senderID] && Date.now() - cooldowns[senderID] < cooldownTime) {
    const remaining = Math.ceil((cooldowns[senderID] + cooldownTime - Date.now()) / 1000);
    return api.sendMessage(
      `⏳ Please wait ${remaining}s before using this command again.`,
      threadID,
      messageID
    );
  }

  cooldowns[senderID] = Date.now(); // set cooldown

  try {
    // 🔹 Fetch video data from API
    const res = await axios.get("https://kaiz-apis.gleeze.com/api/shoti?apikey=71ee3719-dd7d-4a98-8484-eb0bb3081e0f");
    const data = res.data;

    if (!data || data.status !== "success") {
      return api.sendMessage("⚠️ Failed to fetch TikTok video.", threadID, messageID);
    }

    const videoUrl = data.shoti.videoUrl;
    const title = data.shoti.title || "No title";
    const username = data.shoti.username ? `@${data.shoti.username}` : "";
    const duration = data.shoti.duration ? `${data.shoti.duration}s` : "N/A";

    // 🔹 Download video
    const videoBuffer = (await axios.get(videoUrl, { responseType: "arraybuffer" })).data;
    fs.writeFileSync(tmpPath, Buffer.from(videoBuffer, "binary"));

    // 🔹 Send video with info (removed Author)
    api.sendMessage(
      {
        body: `🎥 𝗧𝗶𝗸𝗧𝗼𝗸 𝗩𝗶𝗱𝗲𝗼\n\n📛 Username: ${username}\n📝 Title: ${title}\n⏱ Duration: ${duration}`,
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
