const axios = require("axios");

module.exports.config = {
  name: "bot",
  version: "2.3.2",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Auto Simsimi reply when 'bot' or 'jandel' is mentioned, or when replying to Simsimi's message",
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

    // ❌ Ignore sariling message ng bot
    if (sender === botID) return;

    let trigger = false;

    // ✅ Trigger kung may "bot" o "jandel"
    if (/\b(bot|jandel)\b/i.test(body)) {
      trigger = true;
    }

    // ✅ Trigger kung nag-reply sa Simsimi reply (may 🤖 marker sa dulo)
    if (
      event.type === "message_reply" &&
      event.messageReply &&
      String(event.messageReply.senderID) === botID &&
      event.messageReply.body?.trim().endsWith("🤖")
    ) {
      trigger = true;
    }

    if (!trigger) return;

    // 🧹 Linisin text (tanggalin "bot"/"jandel")
    let cleaned = body.replace(/\b(bot|jandel)\b/gi, "").trim();
    if (!cleaned) cleaned = "hello";

    // 🔗 Call Simsimi API
    const API_URL = "https://daikyu-api.up.railway.app/api/sim-simi";
    let reply;
    try {
      const res = await axios.get(API_URL, {
        params: { talk: cleaned },
        timeout: 20000,
      });
      reply = res.data?.response || null;
    } catch (err) {
      console.error("SimSimi API error:", err.message);
    }

    if (!reply) reply = "Hindi ako makareply ngayon, try ulit mamaya.";

    // ✅ Lagyan ng marker sa dulo para alam na Simsimi reply ito
    return api.sendMessage(`${reply} 🤖`, threadID, event.messageID);
  } catch (e) {
    console.error("bot.js fatal:", e);
  }
};

module.exports.run = async function () {
  // Walang manual command, auto-reply lang siya
};
