const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("scam.db");

// Ensure table exists
db.run("CREATE TABLE IF NOT EXISTS scammers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, fb TEXT)");

module.exports.config = {
  name: "removescam",
  version: "1.1.0",
  hasPermssion: 2, // admin lang pwede
  credits: "ChatGPT",
  description: "Remove scammer from list (by ID or Name)",
  commandCategory: "system",
  usages: "/removescam <id|name>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  if (args.length < 1) {
    return api.sendMessage("❌ Usage: /removescam <id|name>", event.threadID, event.messageID);
  }

  const query = args.join(" ");

  // Try to remove by ID first
  if (!isNaN(query)) {
    db.run("DELETE FROM scammers WHERE id = ?", [query], function(err) {
      if (err) return api.sendMessage("❌ Error removing scammer.", event.threadID, event.messageID);
      if (this.changes === 0) {
        return api.sendMessage(`❌ Walang scammer na may ID ${query}.`, event.threadID, event.messageID);
      }
      api.sendMessage(`✅ Tinanggal ang scammer na may ID ${query}.`, event.threadID, event.messageID);
    });
  } else {
    // Remove by name
    db.run("DELETE FROM scammers WHERE LOWER(name) = LOWER(?)", [query], function(err) {
      if (err) return api.sendMessage("❌ Error removing scammer.", event.threadID, event.messageID);
      if (this.changes === 0) {
        return api.sendMessage(`❌ Walang nakitang scammer na "${query}".`, event.threadID, event.messageID);
      }
      api.sendMessage(`✅ Tinanggal si ${query} sa scammer list.`, event.threadID, event.messageID);
    });
  }
};
