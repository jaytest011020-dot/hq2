module.exports.config = {
  name: "autoreact",
  version: "3.0.0",
  hasPermission: 0,
  credits: "ChatGPT + Priyansh Rajput",
  description: "Bot reacts to every message with a random emoji (faces, fruits, animals, etc.)",
  commandCategory: "No Prefix",
  usages: "[]",
  cooldowns: 0,
};

module.exports.handleEvent = function ({ api, event }) {
  const { messageID } = event;

  // 🎭 Big emoji set: faces, hearts, animals, fruits, symbols
  const emojis = [
    // 😀 Faces
    "😀","😁","😂","🤣","😅","😊","😍","😘","😎","🤩","😡","😢","😭","😱","🤔","😴","😇","🤯","🥶","🤮",
    // ❤️ Hearts & symbols
    "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💖","💗","💘","💝",
    // 👍 Gestures
    "👍","👎","👏","🙌","🤝","🙏","👌","✌️","🤟","🤘","👊","✊",
    // 🔥 Random symbols
    "🔥","✨","💯","⚡","⭐","🌟","🌈","☀️","🌙","☁️","❄️","🌊","🍀",
    // 🐶 Animals
    "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐧","🐦","🐤","🦆","🦉",
    // 🍎 Fruits & veggies
    "🍎","🍌","🍊","🍇","🥭","🍉","🍓","🍍","🍋","🍑","🍒","🥥",
    "🥦","🥬","🥒","🥕","🌽","🍆","🍅","🥔","🧄","🧅","🍄"
  ];

  // Pick random emoji
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  // React
  api.setMessageReaction(emoji, messageID, () => {}, true);
};

module.exports.run = function () {
  // no command, only autoreact
};
