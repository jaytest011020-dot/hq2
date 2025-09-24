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
  { name: "Hacker", min: 300, max: 500, rare: true }, { name: "CEO", min: 500, max: 1000, rare: true }
];

// Job emojis
const JOB_EMOJIS = {
  Farmer: "🌾", Miner: "⛏️", Teacher: "📚", Chef: "👨‍🍳", Driver: "🚗",
  Artist: "🎨", Musician: "🎵", Builder: "🏗️", Programmer: "💻", Doctor: "🩺",
  Nurse: "🩹", Engineer: "⚙️", Scientist: "🔬", Lawyer: "⚖️", Police: "👮",
  Firefighter: "🔥", Pilot: "✈️", Soldier: "🪖", Hacker: "💻", CEO: "💼"
};

// Fun phrases
const FUN_PHRASES = [
  "You worked hard today!", "Luck is on your side!", "Great job!", "Keep it up!",
  "You're unstoppable!", "That was amazing!", "You crushed it!", "The grind is paying off!"
];

// ✅ Cooldown
const GLOBAL_COOLDOWN = 20 * 60 * 1000; // 20 minutes

module.exports.config = {
  name: "job",
  version: "5.8.1",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Random job system with pet boost (max 30%), high-paying jobs, cooldown, emojis, and fun phrases",
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
  const bankData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };
  const pet = (await getData(`pets/${threadID}/${senderID}`)) || null;

  // 🔹 Check cooldown
  const lastTime = userData.lastTime || 0;
  const elapsed = now - lastTime;
  if (elapsed < GLOBAL_COOLDOWN) {
    const remaining = GLOBAL_COOLDOWN - elapsed;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return api.sendMessage(`⏳ You must wait ${mins}m ${secs}s before doing another job.`, threadID, messageID);
  }

  // 🔹 Random job selection
  let job = JOBS[Math.floor(Math.random() * JOBS.length)];
  if (!job.rare && Math.random() <= 0.10) { // 10% chance for rare job
    const rareJobs = JOBS.filter(j => j.rare);
    job = rareJobs[Math.floor(Math.random() * rareJobs.length)];
  }

  // 🔹 1% rejection chance
  if (Math.random() <= 0.01) {
    userData.lastTime = now;
    await setData(`job/${threadID}/${senderID}`, userData);
    return api.sendMessage(`❌ ${await getUserName(senderID, api)}, your job application for ${job.name} was rejected! No earnings this time.`, threadID, messageID);
  }

  // 🔹 Earnings & pet boost (max 30%)
  let earnedBase = randomInt(job.min, job.max);
  let petBonus = 0;
  let boostPercent = 0;
  if (pet && pet.skills?.jobBoost) {
    boostPercent = Math.min(pet.skills.jobBoost, 0.3); // cap at 30%
    petBonus = Math.floor(earnedBase * boostPercent);
  }
  const totalEarned = earnedBase + petBonus;

  // 🔹 Update bank & last job
  bankData.balance += totalEarned;
  userData.lastTime = now;
  await setData(`bank/${threadID}/${senderID}`, bankData);
  await setData(`job/${threadID}/${senderID}`, userData);

  // 🔹 Final message
  const userName = await getUserName(senderID, api);
  const emoji = JOB_EMOJIS[job.name] || "💼";
  const funText = FUN_PHRASES[Math.floor(Math.random() * FUN_PHRASES.length)];

  const msg =
`${emoji} ${userName} did the ${job.name} job!

💰 Base Earnings: ${earnedBase} coins
✨ Pet Bonus: +${petBonus} coins (${Math.floor(boostPercent * 100)}%)
🏦 Total Balance: ${bankData.balance.toLocaleString()} coins
⏳ Next job available in: ${Math.floor(GLOBAL_COOLDOWN/60000)}m

💬 ${funText}`;

  return api.sendMessage(msg, threadID, messageID);
};
