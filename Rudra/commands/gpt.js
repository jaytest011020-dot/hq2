const axios = require("axios");

module.exports.config = {
  name: "gpt",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "ChatGPT + DaikyuMisugi",
  description: "Ask GPT via Daikyu API",
  commandCategory: "AI",
  usages: "/gpt <question>",
  cooldowns: 3,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;

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
