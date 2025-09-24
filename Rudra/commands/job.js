const { setData, getData } = require("../../database.js");
const fs = require("fs");
const path = require("path");

// ✅ Job definitions
const JOBS = [
  { name: "Farmer", min: 50, max: 100 }, { name: "Miner", min: 80, max: 150 },
  { name: "Teacher", min: 70, max: 120 }, { name: "Chef", min: 60, max: 110 },
  { name: "Driver", min: 50, max: 100 }, { name: "Artist", min: 40, max: 90 },
  { name: "Musician", min: 50, max: 100 }, { name: "Builder", min: 60, max: 120 },
  { name: "Programmer", min: 70, max: 130 }, { name: "Doctor", min: 80, max: 150 },
  { name: "Nurse", min: 50, max: 100 }, { name: "Engineer", min: 80, max: 150 },
  { name: "Scientist", min: 100, max: 200 }, { name: "Lawyer", min: 90, max: 180 },
  { name: "Police", min: 60, max: 120 }, { name: "Firefighter", min: 50, max: 110 },
  { name: "Pilot", min: 120, max: 250 }, { name: "Soldier", min: 70, max: 140 },
  { name: "Hacker", min: 300, max: 500, rare: true }, { name: "CEO", min: 500, max: 1000, rare: true },
  { name: "Fisherman", min: 40, max: 100 }, { name: "Barber", min: 60, max: 120 },
  { name: "Mechanic", min: 80, max: 160 }, { name: "Janitor", min: 30, max: 70 },
  { name: "Delivery Rider", min: 50, max: 120 }, { name: "Waiter", min: 40, max: 90 },
  { name: "Dancer", min: 60, max: 110 }, { name: "Actor", min: 100, max: 200 },
  { name: "Streamer", min: 80, max: 180 }, { name: "Athlete", min: 90, max: 200 },
  { name: "Astronaut", min: 300, max: 600, rare: true }, { name: "President", min: 700, max: 1200, rare: true },

  // High-paying jobs (500–1000)
  { name: "Entrepreneur", min: 500, max: 1000, rare: true },
  { name: "Investor", min: 500, max: 1000, rare: true },
  { name: "Software Architect", min: 500, max: 1000, rare: true },
  { name: "Celebrity", min: 500, max: 1000, rare: true },
  { name: "Tech Founder", min: 500, max: 1000, rare: true },
  { name: "Stock Trader", min: 500, max: 1000, rare: true },
  { name: "Real Estate Agent", min: 500, max: 1000, rare: true },
  { name: "Film Director", min: 500, max: 1000, rare: true },
  { name: "Fashion Designer", min: 500, max: 1000, rare: true },
  { name: "Pro Gamer", min: 500, max: 1000, rare: true },
  { name: "Youtuber", min: 500, max: 1000, rare: true },
  { name: "Crypto Trader", min: 500, max: 1000, rare: true },
  { name: "E-sports Coach", min: 500, max: 1000, rare: true },
  { name: "Music Producer", min: 500, max: 1000, rare: true },
  { name: "App Developer", min: 500, max: 1000, rare: true },
  { name: "Film Actor", min: 500, max: 1000, rare: true },
  { name: "Startup Founder", min: 500, max: 1000, rare: true },
  { name: "Athletic Coach", min: 500, max: 1000, rare: true },
  { name: "Motivational Speaker", min: 500, max: 1000, rare: true },
  { name: "Professional Dancer", min: 500, max: 1000, rare: true },

  // Ultra high-paying jobs (2000–5000)
  { name: "Fortune 500 CEO", min: 2000, max: 5000, rare: true },
  { name: "Oil Tycoon", min: 2000, max: 5000, rare: true },
  { name: "Casino Owner", min: 2000, max: 5000, rare: true },
  { name: "Tech Mogul", min: 2000, max: 5000, rare: true },
  { name: "Space Pioneer", min: 2000, max: 5000, rare: true },
  { name: "Royalty", min: 2000, max: 5000, rare: true },
  { name: "Global Influencer", min: 2000, max: 5000, rare: true },
  { name: "Pharmaceutical Tycoon", min: 2000, max: 5000, rare: true },
  { name: "Luxury Brand Owner", min: 2000, max: 5000, rare: true },
  { name: "Sports Team Owner", min: 2000, max: 5000, rare: true }
];

// Job emojis
const JOB_EMOJIS = {
  Farmer: "🌾", Miner: "⛏️", Teacher: "📚", Chef: "👨‍🍳", Driver: "🚗",
  Artist: "🎨", Musician: "🎵", Builder: "🏗️", Programmer: "💻", Doctor: "🩺",
  Nurse: "🩹", Engineer: "⚙️", Scientist: "🔬", Lawyer: "⚖️", Police: "👮",
  Firefighter: "🔥", Pilot: "✈️", Soldier: "🪖", Hacker: "💻", CEO: "💼",
  Fisherman: "🎣", Barber: "💈", Mechanic: "🔧", Janitor: "🧹",
  "Delivery Rider": "📦", Waiter: "🍽️", Dancer: "💃", Actor: "🎭",
  Streamer: "🎥", Athlete: "🏅", Astronaut: "🚀", President: "🏛️",
  Entrepreneur: "💡", Investor: "📈", "Software Architect": "🖥️", Celebrity: "🎬", "Tech Founder": "🚀",
  "Stock Trader": "💹", "Real Estate Agent": "🏘️", "Film Director": "🎥", "Fashion Designer": "👗",
  "Pro Gamer": "🎮", Youtuber: "▶️", "Crypto Trader": "🪙", "E-sports Coach": "🎮", "Music Producer": "🎶",
  "App Developer": "📱", "Film Actor": "🎬", "Startup Founder": "🚀", "Athletic Coach": "🏋️", "Motivational Speaker": "🎤",
  "Professional Dancer": "🩰", "Fortune 500 CEO": "🏢", "Oil Tycoon": "🛢️", "Casino Owner": "🎰",
  "Tech Mogul": "💻", "Space Pioneer": "🪐", Royalty: "👑", "Global Influencer": "🌍",
  "Pharmaceutical Tycoon": "💊", "Luxury Brand Owner": "👝", "Sports Team Owner": "⚽"
};

// Fun phrases
const FUN_PHRASES = [
  "You worked hard today!", "Luck is on your side!", "Great job!", "Keep it up!",
  "You're unstoppable!", "That was amazing!", "You crushed it!", "The grind is paying off!"
];

// ✅ Cooldown
const GLOBAL_COOLDOWN = 20 * 60 * 1000; // 5 minutes

module.exports.config = {
  name: "job",
  version: "5.7.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Random job system with high-paying jobs, 5m cooldown, buffs, rare jobs, critical bonus, emojis, fun phrases, and 1% rejection chance",
  commandCategory: "economy",
  usages: "/job | /job on | /job off | /job status",
  cooldowns: 3
};

// Helper functions
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    return info[uid]?.name || `FB-User(${uid})`;
  } catch { return `FB-User(${uid})`; }
   }

module.exports.run = async function({ api, event, args }) {
  const { senderID, threadID, messageID } = event;

  // --- Maintenance check ---
  try {
    const maintenance = await getData("/maintenance");
    if (maintenance?.enabled) {
      const mp4Path = path.join(__dirname, "cache", "AI data.mp4");
      return api.sendMessage(
        { body: "🚧 Bot is under maintenance. /job command disabled.", attachment: fs.createReadStream(mp4Path) },
        threadID,
        messageID
      );
    }
  } catch (err) { console.error("Maintenance check failed:", err); }

  const now = Date.now();
  const command = args[0] ? args[0].toLowerCase() : "";

  // 🔹 Handle /job on/off/status
  if (["on", "off", "status"].includes(command)) {
    try {
      if (command === "status") {
        const jobStatus = (await getData(`job/status/${threadID}`)) || { enabled: true };
        return api.sendMessage(`💼 Job system status: ${jobStatus.enabled ? "✅ ENABLED" : "❌ DISABLED"}`, threadID, messageID);
      }

      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);
      if (!isAdmin) return api.sendMessage("❌ Only GC admins can toggle the job system.", threadID, messageID);

      const enabled = command === "on";
      await setData(`job/status/${threadID}`, { enabled });
      return api.sendMessage(`💼 Job system is now ${enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`, threadID, messageID);
    } catch (err) {
      console.error("[JOB] Toggle error:", err);
      return api.sendMessage("⚠️ Failed to toggle job system.", threadID, messageID);
    }
  }

  // 🔹 Check if job system is enabled
  const jobStatus = (await getData(`job/status/${threadID}`)) || { enabled: true };
  if (!jobStatus.enabled) return api.sendMessage("❌ Job system is disabled by GC admin.", threadID, messageID);

  // 🔹 Load user data
  const userData = (await getData(`job/${threadID}/${senderID}`)) || {};
  const inventory = (await getData(`inventory/${threadID}/${senderID}`)) || { items: [] };
  const bankData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };

  // 🔹 Check cooldown
  const lastTime = userData.lastTime || 0;
  const elapsed = now - lastTime;
  let cooldown = GLOBAL_COOLDOWN;
  let usedItems = [];

  // Buff: Energy Drink halves cooldown
  const energyDrink = inventory.items.find(i => i.name === "Energy Drink" && i.quantity > 0);
  if (energyDrink) {
    cooldown = Math.floor(cooldown / 2);
    energyDrink.quantity -= 1;
    usedItems.push("🧃 Energy Drink (halved cooldown)");
    if (energyDrink.quantity <= 0) inventory.items = inventory.items.filter(i => i !== energyDrink);
    await setData(`inventory/${threadID}/${senderID}`, inventory);
  }

  if (elapsed < cooldown) {
    const remaining = cooldown - elapsed;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return api.sendMessage(`⏳ You must wait ${mins}m ${secs}s before doing another job.`, threadID, messageID);
  }

  // 🔹 Random job selection
  let job = JOBS[Math.floor(Math.random() * JOBS.length)];
  let isRare = job.rare || false;
  if (!isRare && Math.random() <= 0.10) { // 10% chance for rare job
    const rareJobs = JOBS.filter(j => j.rare);
    job = rareJobs[Math.floor(Math.random() * rareJobs.length)];
    isRare = true;
  }

  // 🔹 1% rejection chance
  if (Math.random() <= 0.01) {
    userData.lastTime = now;
    await setData(`job/${threadID}/${senderID}`, userData);
    return api.sendMessage(`❌ ${await getUserName(senderID, api)}, your job application for ${job.name} was rejected! No earnings this time.`, threadID, messageID);
  }

  // 🔹 Buff: Lucky Charm (5% extra crit)
  let critChance = 0.05;
  const luckyCharm = inventory.items.find(i => i.name === "Lucky Charm");
  if (luckyCharm) {
    critChance += 0.05;
    usedItems.push("🍀 Lucky Charm (+5% Critical chance)");
  }

  // 🔹 Earnings & critical
  let earned = randomInt(job.min, job.max);
  let critical = false;
  if (Math.random() <= critChance) { earned *= 2; critical = true; }

  // 🔹 Update bank & last job
  bankData.balance += earned;
  await setData(`bank/${threadID}/${senderID}`, bankData);
  userData.lastTime = now;
  await setData(`job/${threadID}/${senderID}`, userData);

  // 🔹 Final message
  const userName = await getUserName(senderID, api);
  const usedItemsText = usedItems.length > 0 ? usedItems.map(u => `🛠️ ${u}`).join("\n") + "\n" : "";
  const emoji = JOB_EMOJIS[job.name] || "💼";
  const funText = FUN_PHRASES[Math.floor(Math.random() * FUN_PHRASES.length)];

  const msg =
`${emoji} ${userName} did the ${job.name} job! ${isRare ? "✨" : ""}

${usedItemsText}💰 Earnings: ${earned} coins${critical ? " 💥 Critical!" : ""}
🏦 Balance: ${bankData.balance.toLocaleString()} coins
⏳ Next job available in: ${Math.floor(cooldown/60000)}m

💬 ${funText}`;

  return api.sendMessage(msg, threadID, messageID);
};
