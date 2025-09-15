// === modules/commands/lyrics.js ===
const axios = require("axios");

module.exports.config = {
  name: "lyrics",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Search and display song lyrics",
  commandCategory: "music",
  usages: "/lyrics <song title>",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  if (!args[0]) {
    return api.sendMessage("❗ Usage: /lyrics <song title>", threadID, messageID);
  }

  const query = args.join(" ");
  const API_URL = `https://betadash-api-swordslush-production.up.railway.app/lyrics-finder?title=${encodeURIComponent(query)}`;

  try {
    const res = await axios.get(API_URL, { timeout: 20000 });
    const data = res.data;

    if (!data || data.status !== 200) {
      return api.sendMessage("⚠️ No lyrics found for that song.", threadID, messageID);
    }

    let msg = `🎵 ${data.Title}\n👤 Author: ${data.author}\n\n${data.response}`;

    // Split kung masyadong mahaba (Messenger limit ~2000 chars)
    const chunks = msg.match(/[\s\S]{1,1800}/g);
    for (const chunk of chunks) {
      await api.sendMessage(chunk, threadID, messageID);
    }
  } catch (err) {
    console.error("Lyrics API error:", err.message);
    return api.sendMessage("❌ Failed to fetch lyrics. Try again later.", threadID, messageID);
  }
};
