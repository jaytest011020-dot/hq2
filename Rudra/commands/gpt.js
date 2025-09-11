const axios = require("axios");
const moment = require("moment-timezone");

module.exports.config = {
  name: "gpt",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Converted from Android code",
  description: "Command-style chatbot module using PaxSenix API",
  commandCategory: "ai",
  usePrefix: true,
  usages: "chatbot2 <your question>",
  cooldowns: 7
};

async function getUserName(api, senderID) {
  try {
    const userInfo = await api.getUserInfo(senderID);
    return userInfo[senderID].name;
  } catch {
    return "User";
  }
}

module.exports.run = async function({ api, event, args }) {
  const userMessage = args.join(" ").trim();
  if (!userMessage) {
    api.sendMessage("❌ Message cannot be empty!", event.threadID, event.messageID);
    return;
  }

  const senderID = event.senderID;
  const userName = await getUserName(api, senderID);
  const currentTime = moment().tz("Asia/Kolkata").format("MMM D, YYYY - hh:mm A");

  api.setMessageReaction("📄", event.messageID, () => {}, true);

  try {
    // Prepare payload similar to your Android HashMap structure
    const payload = {
      model: "gpt-3.5-turbo", // or your chosen model
      messages: [
        { role: "user", content: userMessage }
      ]
    };

    const response = await axios.post(
      "https://api.paxsenix.biz.id/v1/chat/completions",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    const content = response.data?.choices?.[0]?.message?.content || "⚠️ No response from API";

    api.setMessageReaction("✅", event.messageID, () => {}, true);

    api.sendMessage(
      `📝 ${userName} asked at ${currentTime}:\n\n${content}`,
      event.threadID,
      event.messageID
    );

  } catch (err) {
    console.error("Chatbot API Error:", err.message);
    api.sendMessage(
      "⚠️ Error: Could not reach the PaxSenix API. Try again later.",
      event.threadID,
      event.messageID
    );
  }
};
