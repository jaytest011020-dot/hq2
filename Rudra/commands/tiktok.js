const axios = require("axios");

module.exports.config = {
  name: "tiktok",
  version: "1.0.2",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord",
  description: "Stalk TikTok profile by username",
  commandCategory: "Tools",
  usages: "/tiktok <username>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (!args[0]) {
    return api.sendMessage(
      "❌ Usage: /tiktok <username>\n\nExample: /tiktok jaylordlapena or /tiktok @jaylordlapena",
      threadID,
      { messageID }
    );
  }

  // ✅ Gamitin mismo yung input, huwag galawin
  let username = args[0];

  try {
    const res = await axios.get(
      `https://betadash-api-swordslush-production.up.railway.app/tikstalk`,
      { params: { username }, timeout: 20000 }
    );

    const data = res.data;
    if (!data || !data.username) {
      return api.sendMessage(
        `⚠️ No TikTok profile found for "${username}".`,
        threadID,
        { messageID }
      );
    }

    let msg = `📱 TikTok Stalk 📱\n\n` +
              `👤 Name: ${data.username}\n` +
              `🔖 Nickname: ${data.nickname}\n` +
              `🆔 ID: ${data.id}\n` +
              `📌 Bio: ${data.signature || "N/A"}\n\n` +
              `📹 Videos: ${data.videoCount}\n` +
              `👥 Following: ${data.followingCount}\n` +
              `👤 Followers: ${data.followerCount}\n` +
              `❤️ Likes: ${data.heartCount}\n` +
              `👍 Diggs: ${data.diggCount}\n\n` +
              `🔗 Profile: https://www.tiktok.com/${username}`;

    return api.sendMessage(
      {
        body: msg,
        attachment: await global.utils.getStreamFromURL(data.avatarLarger),
      },
      threadID,
      { messageID }
    );

  } catch (err) {
    console.error("TikTok Stalk error:", err.message);
    return api.sendMessage(
      "❌ Error fetching TikTok profile. Try again later.",
      threadID,
      { messageID }
    );
  }
};
