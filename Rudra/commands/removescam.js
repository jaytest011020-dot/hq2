const { db } = require("./db");

module.exports.config = {
  name: "removescam",
  version: "1.2.0",
  hasPermssion: 2, // admin only
  credits: "ChatGPT",
  description: "Remove scammer from list (by ID or Name)",
  commandCategory: "system",
  usages: "/removescam <id|name>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args.length < 1) {
    return api.sendMessage(
      "❌ Usage: /removescam <id|name>",
      threadID,
      messageID
    );
  }

  const query = args.join(" ");

  // Remove by ID if numeric
  if (!isNaN(query)) {
    db.run(
      "DELETE FROM scammers WHERE id = ?",
      [query],
      function(err) {
        if (err)
          return api.sendMessage(
            "❌ Error removing scammer.",
            threadID,
            messageID
          );
        if (this.changes === 0)
          return api.sendMessage(
            `❌ Walang scammer na may ID ${query}.`,
            threadID,
            messageID
          );
        api.sendMessage(
          `✅ Tinanggal ang scammer na may ID ${query}.`,
          threadID,
          messageID
        );
      }
    );
  } else {
    // Remove by name (case-insensitive)
    db.run(
      "DELETE FROM scammers WHERE LOWER(name) = LOWER(?)",
      [query],
      function(err) {
        if (err)
          return api.sendMessage(
            "❌ Error removing scammer.",
            threadID,
            messageID
          );
        if (this.changes === 0)
          return api.sendMessage(
            `❌ Walang nakitang scammer na "${query}".`,
            threadID,
            messageID
          );
        api.sendMessage(
          `✅ Tinanggal si ${query} sa scammer list.`,
          threadID,
          messageID
        );
      }
    );
  }
};
