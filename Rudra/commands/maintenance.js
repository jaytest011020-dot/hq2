const fs = require("fs");
const path = require("path");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "maintenance",
  version: "3.1.1",
  hasPermssion: 2,
  credits: "Jaylord + ChatGPT",
  description: "Toggle bot maintenance mode with image broadcast",
  commandCategory: "system",
  usages: "/maintenance on | off | status",
  cooldowns: 5
};

// Helper broadcast
async function broadcast(api, body, attachmentPath = null) {
  try {
    const threads = await api.getThreadList(100, null, ["INBOX"]);
    for (const t of threads) {
      if (t.isGroup) {
        const msg = attachmentPath
          ? { body, attachment: fs.createReadStream(attachmentPath) }
          : { body };
        api.sendMessage(msg, t.threadID);
      }
    }
  } catch (e) {
    console.error("Broadcast error:", e);
  }
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const ownerID = "61559999326713"; // owner UID

  if (senderID !== ownerID) {
    return api.sendMessage("❌ Only the bot owner can use this command.", threadID, messageID);
  }

  const sub = args[0]?.toLowerCase();
  if (!sub) {
    return api.sendMessage("⚙️ Usage: /maintenance on | off | status", threadID, messageID);
  }

  // absolute path to your maintenance image
  const imgPath = path.join(__dirname, "cache", "maintenance.jpeg");

  if (sub === "on") {
    await setData("/maintenance", { enabled: true });
    await broadcast(api, "🚧 Bot is now under MAINTENANCE. Some features are disabled.", imgPath);
    return api.sendMessage("✅ Maintenance mode ON. Broadcast sent.", threadID, messageID);
  }

  if (sub === "off") {
    await setData("/maintenance", { enabled: false });
    await broadcast(api, "✅ Bot is now BACK ONLINE! All features restored.");
    return api.sendMessage("✅ Maintenance mode OFF. Broadcast sent.", threadID, messageID);
  }

  if (sub === "status") {
    const status = await getData("/maintenance");
    return api.sendMessage(
      `📊 Maintenance status: ${status?.enabled ? "🚧 ON" : "✅ OFF"}`,
      threadID,
      messageID
    );
  }
};
