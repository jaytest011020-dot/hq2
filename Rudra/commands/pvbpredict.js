const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbpredict",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Predict next Godly & Secret seeds in PVBR",
  usePrefix: true,
  commandCategory: "pvb tools",
  usages: "/pvbpredict",
  cooldowns: 10,
};

// Godly & Secret seeds tracking
const RARE_SEEDS = ["Cocotank", "Carnivorous Plant", "Mr Carrot", "Tomatrio", "Shroombino"];

// Helper to capitalize first letter
function capitalizeFirst(str) {
  if (!str) return "Unknown";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Simple chance calculation (time based)
function predictNext(lastTime) {
  const now = new Date();
  let nextDate = new Date(lastTime.getTime());
  nextDate.setMinutes(nextDate.getMinutes() + 5); // approximate 5 min restock
  const diff = (nextDate - now) / 1000; // in seconds
  let chance = 0;

  if (diff <= 0) {
    chance = 80 + Math.floor(Math.random() * 20); // high chance if overdue
  } else {
    chance = Math.max(10, 50 - diff * 2); // lower chance if far away
  }

  return { time: nextDate, chance };
}

// Command handler
module.exports.run = async function({ api, event }) {
  const { threadID } = event;
  const stockLog = (await getData("pvbpredict/log")) || {};

  let msg = `🔮 𝗣𝗩𝗕𝗥 𝗚𝗼𝗱𝗹𝘆 & 𝗦𝗲𝗰𝗿𝗲𝘁 𝗦𝗲𝗲𝗱 𝗣𝗿𝗲𝗱𝗶𝗰𝘁𝗶𝗼𝗻 🔮\n\n`;

  for (let seed of RARE_SEEDS) {
    const lastTime = stockLog[seed] ? new Date(stockLog[seed]) : new Date(Date.now() - 60000); // fallback 1 min ago
    const prediction = predictNext(lastTime);
    msg += `• ${capitalizeFirst(seed)}\n   Next: ${prediction.time.toLocaleTimeString("en-PH", { hour12: true })}\n   Chance: ${prediction.chance}%\n\n`;
  }

  msg += `⚡ Tip: Join the private server to catch them faster:\nhttps://www.roblox.com/share?code=5a9bf02c4952464eaf9c0ae66eb456bf&type=Server`;

  api.sendMessage(msg, threadID);
};

// Optional: function to update last seen rare seeds in logs
module.exports.updateLog = async function(seedName) {
  const stockLog = (await getData("pvbpredict/log")) || {};
  stockLog[seedName] = new Date().toISOString();
  await setData("pvbpredict/log", stockLog);
};
