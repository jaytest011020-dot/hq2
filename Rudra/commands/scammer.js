const { db } = require("./db");

function buildScammerList(list) {
  if (list.length === 0) return "✅ Walang laman ang scammer list.";
  let msg = `⚠️ Scammer List (Total: ${list.length}) ⚠️\n\n`;
  list.forEach((item, i) => {
    msg += `${i + 1}. ${item.name}\n🔗 ${item.fb_link}\n\n`;
  });
  return msg.trim();
}

module.exports.config = {
  name: "scam",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Show scammer list (auto-trigger + /scam)",
  commandCategory: "system",
  usages: "/scam",
  cooldowns: 0
};

// 🔹 Auto-trigger kahit walang prefix
module.exports.handleEvent = function({ api, event }) {
  if (!event.body) return;

  const text = event.body.toLowerCase();
  if (text.includes("scam")) {
    db.all("SELECT * FROM scammers", (err, rows) => {
      if (err) return console.error(err);
      api.sendMessage(buildScammerList(rows), event.threadID, event.messageID);
    });
  }
};

// 🔹 Manual /scam command
module.exports.run = async function({ api, event }) {
  db.all("SELECT * FROM scammers", (err, rows) => {
    if (err) return console.error(err);
    api.sendMessage(buildScammerList(rows), event.threadID, event.messageID);
  });
};
