const axios = require("axios");

module.exports.config = {
  name: "bot",
  version: "2.2.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Auto Simsimi reply when 'bot' or 'jandel' is mentioned, or when replied to Simsimi's message",
  commandCategory: "AI",
  usages: "Just type 'bot' or 'jandel', or reply to Simsimi",
  cooldowns: 0,
};

module.exports.handleEvent = async function ({ api, event }) {
  try {
    const body = (event.body || "").trim();
    if (!body) return;

    const sender = String(event.senderID);
    const threadID = event.threadID;
    const botID = String(api.getCurrentUserID());

    // Ignore sariling message ng bot
    if (sender === botID) return;

    let trigger = false;

    // ✅ Trigger if contains "bot" or "jandel"
    if (/\b(bot|jandel)\b/i.test(body)) trigger = true;

    // ✅ Trigger if reply to Simsimi’s own message (not other modules)
    if (
      event.type === "message_reply" &&
      event.messageReply?.senderID === botID &&
      /🤖|Simsimi|Daikyu/i.test(event.messageReply?.body || "")
    ) {
      trigger = true;
    }

    if (!trigger) return;

    // 🧹 Clean text
    let cleaned = body.replace(/\b(bot|jandel)\b/gi, "").trim();
    if (!cleaned) cleaned = "hello";

    // Call Simsimi API
    const API_URL = "https://daikyu-api.up.railway.app/api/sim-simi";
    let reply;
    try {
      const res = await axios.get(API_URL, {
        params: { talk: cleaned },
        timeout: 20_000,
      });
      reply = res.data?.response || null;
    } catch (err) {
      console.error("Sim API error:", err.message);
    }

    if (!reply) reply = "🤖 Hindi ako makareply ngayon, try ulit mamaya.";

    // ✅ Reply directly
    return api.sendMessage({ body: reply }, threadID, event.messageID);
  } catch (e) {
    console.error("bot.js fatal:", e);
  }
};

module.exports.run = async function () {
  // Walang manual command, auto-reply lang sya
};
