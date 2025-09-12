const axios = require("axios");

module.exports.config = {
  name: "gpt",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT + DaikyuMisugi",
  description: "Ask GPT-5 via Daikyu API",
  commandCategory: "AI",
  usages: "/gpt <question>",
  cooldowns: 3,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID } = event;

  if (args.length === 0) {
    return api.sendMessage("❌ Usage: /gpt <question>", threadID);
  }

  const question = args.join(" ");

  try {
    const res = await axios.get(
      `https://daikyu-api.up.railway.app/api/openai-gpt-5`,
      {
        params: {
          ask: question,
          uid: senderID,
        },
      }
    );

    if (res.data && res.data.response) {
      return api.sendMessage(`🤖 ${res.data.response}`, threadID);
    } else {
      return api.sendMessage("⚠️ No response from GPT API.", threadID);
    }
  } catch (e) {
    console.error(e);
    return api.sendMessage("❌ Error connecting to GPT API.", threadID);
  }
};
