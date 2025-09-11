const { db } = require("./db");

module.exports.config = {
  name: "addscam",
  version: "1.2.0",
  hasPermssion: 2, // bot admin only
  credits: "ChatGPT",
  description: "Add scammer to SQL database",
  commandCategory: "system",
  usages: "/addscam <name> <fb_link>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  if (args.length < 2) {
    return api.sendMessage(
      "❌ Usage: /addscam <name> <fb_link>",
      threadID,
      messageID
    );
  }

  const name = args[0];
  const fb_link = args[1];

  // Insert scammer into shared SQL
  db.run(
    "INSERT INTO scammers (name, fb_link) VALUES (?, ?)",
    [name, fb_link],
    function(err) {
      if (err) {
        console.error(err);
        return api.sendMessage(
          "⚠️ Error adding scammer.",
          threadID,
          messageID
        );
      }
      api.sendMessage(
        `✅ Na-add si ${name} sa scammer list!`,
        threadID,
        messageID
      );
    }
  );
};
