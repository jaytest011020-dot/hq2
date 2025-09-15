const axios = require("axios");

module.exports.config = {
  name: "bot",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Talk to the bot",
  commandCategory: "AI",
  usages: "Just mention bot"
};

module.exports.handleEvent = async function ({ api, event }) {
  try {
    const body = (event.body || "").trim();
    if (!body) return;

    const sender = String(event.senderID);
    const threadID = event.threadID;

    // ignore commands (/ or !)
    if (/^\s*[\/!]/.test(body)) return;

    // detect bot's own ID safely
    let botID;
    try {
      botID = typeof api.getCurrentUserID === "function"
        ? String(api.getCurrentUserID())
        : String(api.getCurrentUserID || "");
    } catch {
      botID = "";
    }
    if (sender === botID) return;

    // trigger word "bot"
    if (!/\bbot\b/i.test(body)) return;

    // remove the word "bot" from message
    let cleaned = body.replace(/\bbot\b/gi, "").trim();
    if (!cleaned) cleaned = "hello";

    // call external API
    const API_URL = "https://daikyu-api.up.railway.app/api/sim-simi";
    let reply;
    try {
      const res = await axios.get(API_URL, {
        params: { talk: cleaned },
        timeout: 20_000
      });
      reply = res.data?.response || null;
    } catch (err) {
      console.error("⚠️ Bot API error:", err?.message || err);
    }

    // fallback message if API fails
    if (!reply) {
      reply = "🤖 Hindi ako makareply ngayon, try ulit mamaya.";
    }

    // ✅ reply directly to user’s message
    return api.sendMessage(
      reply,
      threadID,
      event.messageID
    );
  } catch (e) {
    console.error("❌ Bot Fatal Error:", e);
  }
};
