const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "pvbpredict",
  version: "1.5.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Predict Godly & Secret seeds in PVBR using log-based average interval",
  usePrefix: true,
  commandCategory: "pvb tools",
  usages: "/pvbpredict",
  cooldowns: 10,
};

const RARE_SEEDS = ["Cocotank", "Carnivorous Plant", "Mr Carrot", "Tomatrio", "Shroombino"];

function capitalizeFirst(str) {
  if (!str) return "Unknown";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Compute average interval between logs
function computeAverageInterval(logs) {
  if (logs.length < 2) return 5 * 60 * 1000; // default 5 min if kulang data

  let intervals = [];
  for (let i = 1; i < logs.length; i++) {
    const prev = new Date(logs[i - 1]).getTime();
    const curr = new Date(logs[i]).getTime();
    intervals.push(curr - prev);
  }

  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return avg; // in ms
}

// Predict multiple future times
function predictNextTimes(lastTime, avgInterval, count = 5) {
  const now = new Date();
  let predictions = [];

  for (let i = 1; i <= count; i++) {
    let nextDate = new Date(lastTime.getTime() + avgInterval * i);
    const diff = (nextDate - now) / 1000; // seconds
    let chance = 0;

    if (diff <= 0) {
      chance = 80 + Math.floor(Math.random() * 20);
    } else {
      chance = Math.max(10, 70 - diff / 5); // mas malayo, mas mababa chance
    }

    predictions.push({
      time: nextDate,
      chance: Math.round(chance)
    });
  }

  return predictions;
}

module.exports.run = async function({ api, event }) {
  const { threadID } = event;
  const stockLog = (await getData("pvbpredict/log")) || {};

  let msg = `🔮 𝗣𝗩𝗕𝗥 𝗚𝗼𝗱𝗹𝘆 & 𝗦𝗲𝗰𝗿𝗲𝘁 𝗦𝗲𝗲𝗱 𝗣𝗿𝗲𝗱𝗶𝗰𝘁𝗶𝗼𝗻 🔮\n\n`;

  for (let seed of RARE_SEEDS) {
    const logs = stockLog[seed] || [];

    msg += `🌱 ${capitalizeFirst(seed)}\n`;

    if (logs.length === 0) {
      msg += `   No logs yet.\n\n`;
      continue;
    }

    // Show logs history
    msg += `   📜 Stock History:\n`;
    logs.forEach((t, i) => {
      msg += `     [${i + 1}] ${new Date(t).toLocaleTimeString("en-PH", { hour12: true })}\n`;
    });

    // Compute average interval
    const avgInterval = computeAverageInterval(logs);
    const lastTime = new Date(logs[logs.length - 1]);

    msg += `   ⏱️ Avg Interval: ${(avgInterval / 60000).toFixed(1)} min\n`;

    // Show multiple predictions
    msg += `   🔮 Predictions:\n`;
    const predictions = predictNextTimes(lastTime, avgInterval, 5);
    predictions.forEach((p, i) => {
      msg += `     → ${p.time.toLocaleTimeString("en-PH", { hour12: true })} (${p.chance}%)\n`;
    });

    msg += `\n`;
  }

  msg += `⚡ Tip: Join the private server to catch them faster:\nhttps://www.roblox.com/share?code=5a9bf02c4952464eaf9c0ae66eb456bf&type=Server`;

  api.sendMessage(msg, threadID);
};

// Update log (append history)
module.exports.updateLog = async function(seedName) {
  const stockLog = (await getData("pvbpredict/log")) || {};
  if (!stockLog[seedName]) stockLog[seedName] = [];
  stockLog[seedName].push(new Date().toISOString());
  await setData("pvbpredict/log", stockLog);
};
