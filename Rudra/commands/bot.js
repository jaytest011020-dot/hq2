const axios = require("axios");
const { getData, setData } = require("../../database.js"); // ✅ same as sa ibang module mo

module.exports.config = {
  name: "bot",
  version: "3.0.1",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Auto Simsimi reply when 'bot' or 'jandel' is mentioned, with on/off toggle",
  commandCategory: "AI",
  usages: "/bot on | /bot off | /bot status",
  cooldowns: 0,
};

async function getBotStatus(threadID) {
  let data = (await getData(`botStatus/${threadID}`)) || {};
  if (typeof data.enabled === "undefined") return true; // ✅ default ON
  return data.enabled;
}

async function setBotStatus(threadID, status) {
  let data = (await getData(`botStatus/${threadID}`)) || {};
  data.enabled = status;
  await setData(`botStatus/${threadID}`, data);
}

module.exports.handleEvent = async function ({ api, event }) {
  try {
    const body = (event.body || "").trim();
    if (!body) return;

    const sender = String(event.senderID);
    const threadID = event.threadID;
    const botID = String(api.getCurrentUserID());

    // ❌ Ignore sariling message ng bot
    if (sender === botID) return;

    // 🔎 Check kung naka-ON
    const isOn = await getBotStatus(threadID);
    if (!isOn) return;

    let trigger = false;

    // ✅ Trigger kung may "bot" o "jandel"
    if (/\b(bot|jandel)\b/i.test(body)) trigger = true;

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
    const API_URL = "https://urangkapolka.vercel.app/api/simsimi";
    let reply;
    try {
      const res = await axios.get(API_URL, {
        params: { query: cleaned },
        timeout: 20000,
      });
      reply = res.data?.result?.reply || null;
    } catch (err) {
      console.error("SimSimi API error:", err.message);
    }

    if (!reply) reply = "Hindi ako makareply ngayon, try ulit mamaya.";

    return api.sendMessage(`${reply} 🤖`, threadID, event.messageID);

  } catch (e) {
    console.error("bot.js fatal:", e);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const threadID = event.threadID;

  if (!args[0]) {
    return api.sendMessage("Gamitin: /bot on | /bot off | /bot status", threadID, event.messageID);
  }

  const choice = args[0].toLowerCase();
  if (choice === "on") {
    await setBotStatus(threadID, true);
    return api.sendMessage("✅ Bot replies are now ON in this thread.", threadID, event.messageID);
  } else if (choice === "off") {
    await setBotStatus(threadID, false);
    return api.sendMessage("⛔ Bot replies are now OFF in this thread.", threadID, event.messageID);
  } else if (choice === "status") {
    const isOn = await getBotStatus(threadID);
    return api.sendMessage(
      `📊 Bot status in this thread: ${isOn ? "✅ ON" : "⛔ OFF"}`,
      threadID,
      event.messageID
    );
  } else {
    return api.sendMessage("Gamitin: /bot on | /bot off | /bot status", threadID, event.messageID);
  }
};
