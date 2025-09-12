const axios = require("axios");

module.exports.config = {
  name: "simsimi",
  version: "2.3.0",
  hasPermssion: 0,
  credits: "ChatGPT + DaikyuMisugi",
  description: "Chat with Simsimi AI (via Daikyu API)",
  commandCategory: "AI",
  usePrefix: true,
  usages: "/simsimi <message>",
  cooldowns: 5,
};

// 🔹 Command with prefix
module.exports.run = async function ({ api, event, args }) {
  let userMessage = args.join(" ").trim();
  if (!userMessage) {
    return api.sendMessage("❌ Please type a message.", event.threadID, event.messageID);
  }
  return simsimiReply(api, event, userMessage);
};

// 🔹 Auto-detect messages
module.exports.handleEvent = async function ({ api, event }) {
  const rawMessage = event.body?.trim();
  if (!rawMessage) return;

  // Case 1: message contains "bot"
  if (/\bbot\b/i.test(rawMessage)) {
    let cleaned = rawMessage.replace(/\bbot\b/gi, "").trim();
    if (!cleaned) cleaned = "hello there";
    return simsimiReply(api, event, cleaned);
  }

  // Case 2: replying directly to bot's message
  if (event.type === "message_reply" && event.messageReply) {
    const botID = api.getCurrentUserID();
    if (event.messageReply.senderID == botID) {
      return simsimiReply(api, event, rawMessage);
    }
  }
};

// 🔹 Simsimi handler (Daikyu API)
async function simsimiReply(api, event, userMessage) {
  api.setMessageReaction("🤖", event.messageID, () => {}, true);

  let reply;
  try {
    let res = await axios.get("https://daikyu-api.up.railway.app/api/sim-simi", {
      params: { talk: userMessage },
      timeout: 8000
    });

    reply = res.data?.response;
  } catch (e) {
    console.error("❌ Simsimi API Error:", e.message);
  }

  // 🔹 Fallback replies
  if (!reply || reply.length < 1) {
    const fallbacks = [
      "😅 Hindi ako makakonek kay Simsimi ngayon.",
      "🤖 Pasensya, down yung Simsimi server.",
      "😕 Hindi ko gets, pwede mo ulitin?",
      "⚠️ Error sa Simsimi, pero nandito pa rin ako."
    ];
    reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  api.setMessageReaction("✅", event.messageID, () => {}, true);
  return api.sendMessage(reply, event.threadID, event.messageID);
      }
