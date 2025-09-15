const fs = require("fs");

module.exports.config = {
  name: "fyoutoo",
  version: "1.0.2",
  hasPermission: 0,
  credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭", 
  description: "Auto reply when someone says bad words",
  commandCategory: "no prefix",
  usages: "fuck",
  cooldowns: 5,
};

module.exports.handleEvent = function({ api, event }) {
  const { threadID, messageID, body } = event;
  if (!body) return;

  const triggers = [
    "fuck", "Fuck", "fuck you", "Fuck you",
    "pakyu", "Pakyu", "pak you", "Pak you",
    "pak u", "Pak u", "pak yu", "Pak yu"
  ];

  if (triggers.includes(body.trim())) {
    const msg = {
      body: "F you too",
      attachment: fs.createReadStream(__dirname + "/noprefix/fuck.gif"),
    };

    // ✅ FIX: add callback param before messageID
    api.sendMessage(msg, threadID, () => {}, messageID);
  }
};

module.exports.run = function() {
  // no command, only event trigger
};
