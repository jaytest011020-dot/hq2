const { db } = require("./db");

module.exports.config = {
  name: "addscam",
  version: "1.3.0",
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

  const fb_link = args[args.length - 1];
  const name = args.slice(0, -1).join(" ");

  if (!fb_link.startsWith("http")) {
    return api.sendMessage("❌ Invalid Facebook link.", threadID, messageID);
  }

  db.run(
    "INSERT INTO scammers (name, fb_link) VALUES (?, ?)",
    [name, fb_link],
    function(err) {
      if (err) {
        console.error(err);
        return api.sendMessage(
          "⚠️ Error adding scammer (maybe already exists?).",
          threadID,
          messageID
        );
      }
      api.sendMessage(
        `✅ Na-add si ${name} sa scammer list!\n🔗 ${fb_link}`,
        threadID,
        messageID
      );
    }
  );
};
