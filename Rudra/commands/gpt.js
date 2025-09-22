const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getData } = require("../../database.js"); // adjust path if needed

module.exports.config = {
  name: "gpt",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "ChatGPT + DaikyuMisugi",
  description: "Ask GPT via Daikyu API",
  commandCategory: "AI",
  usages: "/gpt <question>",
  cooldowns: 3,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

  // --- Maintenance check ---
  try {
    const maintenance = await getData("/maintenance");
    if (maintenance?.enabled) {
      const mp4Path = path.join(__dirname, "cache", "AI data.mp4"); // relative path
      return api.sendMessage(
        {
          body: "🚧 Bot is currently under maintenance. GPT commands are temporarily disabled.",
          attachment: fs.createReadStream(mp4Path),
        },
        threadID,
        messageID
      );
    }
  } catch (err) {
    console.error("Maintenance check failed:", err);
  }

  if (!args.length) {
    return api.sendMessage("❌ Usage: /gpt <question>", threadID, messageID);
  }

  const question = args.join(" ");
  const API_URL = "https://daikyu-api.up.railway.app/api/openai-gpt-5";

  try {
    const res = await axios.get(API_URL, {
      params: { ask: question, uid: senderID },
      timeout: 20000,
    });

    const reply = res.data?.response || "⚠️ No response from GPT API.";
    return api.sendMessage(`🤖 ${reply}`, threadID, messageID);
  } catch (err) {
    console.error("GPT API error:", err.message);
    return api.sendMessage("❌ Error connecting to GPT API.", threadID, messageID);
  }
};
