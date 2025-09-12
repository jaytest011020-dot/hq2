module.exports.config = {
  name: "autoreact",
  version: "2.2.0",
  hasPermission: 0,
  credits: "ChatGPT + Priyansh Rajput",
  description: "Bot reacts to every message with a random fruit or vegetable emoji",
  commandCategory: "No Prefix",
  usages: "[]",
  cooldowns: 0,
};

module.exports.handleEvent = function ({ api, event }) {
  const { messageID } = event;

  // 🍎 Fruits + 🥦 Vegetables
  const emojis = [
    "🍎","🍌","🍊","🍇","🥭","🍉","🍓","🍍","🍋","🍑","🍒","🥥", // fruits
    "🥦","🥬","🥒","🥕","🌽","🍆","🍅","🥔","🧄","🧅","🍄"      // vegetables
  ];

  // Pick random emoji
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  // React
  api.setMessageReaction(emoji, messageID, () => {}, true);
};

module.exports.run = function () {
  // no command, only autoreact
};
