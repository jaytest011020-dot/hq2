const { getCoins, setCoins, addBet } = require("./db");

module.exports.config = {
  name: "bet",
  version: "2.0.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Bet coins (40% win / 60% lose)",
  usePrefix: true,
  commandCategory: "economy",
  usages: "/bet <amount>",
  cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  const amount = parseInt(args[0]);
  if (isNaN(amount) || amount <= 0) {
    return api.sendMessage("❌ Invalid amount. Example: /bet 100", threadID, messageID);
  }

  getCoins(senderID, (coins) => {
    if (coins < amount) {
      return api.sendMessage("⚠️ You don’t have enough coins.", threadID, messageID);
    }

    const win = Math.random() < 0.4; // 40% chance to win
    if (win) {
      const newCoins = coins + amount;
      setCoins(senderID, newCoins, () => {
        addBet(senderID, amount, "WIN");
        api.sendMessage(`🎉 You WON! Now you have ${newCoins} coins.`, threadID, messageID);
      });
    } else {
      const newCoins = coins - amount;
      setCoins(senderID, newCoins, () => {
        addBet(senderID, amount, "LOSE");
        api.sendMessage(`😢 You LOST! Now you have ${newCoins} coins.`, threadID, messageID);
      });
    }
  });
};
