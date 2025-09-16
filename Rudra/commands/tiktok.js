const axios = require("axios");

module.exports.config = {
  name: "tiktokstalk",
  version: "1.0.3",
  hasPermssion: 0, // ✅ tama spelling
  credits: "ChatGPT",
  description: "Fetch TikTok profile info",
  commandCategory: "tools", // safe category name
  usages: "/tiktokstalk <username>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args.length < 1) {
    return api.sendMessage("❗ Usage: /tiktok <username>", threadID, messageID);
  }

  const username = args[0].trim();
  const API_URL = `https://betadash-api-swordslush-production.up.railway.app/tikstalk?username=${encodeURIComponent(username)}`;

  try {
    const res = await axios.get(API_URL, { timeout: 20000 });

    if (!res.data || !res.data.username) {
      return api.sendMessage("⚠️ TikTok profile not found.", threadID, messageID);
    }

    const info = res.data;
    const msg =
`📱 TikTok Profile
━━━━━━━━━━━━━━━
👤 Nickname: ${info.nickname}
🔗 Username: ${info.username}
🆔 ID: ${info.id}
📝 Bio: ${info.signature || "N/A"}

📊 Stats:
🎥 Videos: ${info.videoCount}
👥 Following: ${info.followingCount}
👤 Followers: ${info.followerCount}
❤️ Hearts: ${info.heartCount}
👍 Likes: ${info.diggCount}`;

    return api.sendMessage(msg, threadID, messageID);

  } catch (err) {
    console.error("TikTok error:", err.message);
    return api.sendMessage("❌ Error fetching TikTok profile. Try again later.", threadID, messageID);
  }
};
