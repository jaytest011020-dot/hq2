const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("scam.db");

// Create table if not exists
db.run("CREATE TABLE IF NOT EXISTS scammers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, fb TEXT)");

module.exports.config = {
  name: "addscam",
  version: "1.1.0",
  hasPermission: 2, // bot admin only
  credits: "ChatGPT",
  description: "Add scammer to SQL database",
  commandCategory: "system",
  usages: "/addscam <name> <fb_link>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  if (args.length < 2) {
    return api.sendMessage(
      "❌ Usage: /addscam <name> <fb_link>",
      event.threadID,
      event.messageID
    );
  }

  const name = args[0];
  const fb = args[1];

  // Insert scammer into SQL
  db.run("INSERT INTO scammers (name, fb) VALUES (?, ?)", [name, fb], function(err) {
    if (err) {
      console.error(err);
      return api.sendMessage("⚠️ Error adding scammer.", event.threadID, event.messageID);
    }
    api.sendMessage(`✅ Na-add si ${name} sa scammer list!`, event.threadID, event.messageID);
  });
};
