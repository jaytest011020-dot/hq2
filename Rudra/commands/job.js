const { setData, getData } = require("../../database.js");

// ✅ Job definitions
const JOBS = [
  { name: "Farmer", min: 50, max: 100 },
  { name: "Miner", min: 80, max: 150 },
  { name: "Teacher", min: 70, max: 120 },
  { name: "Chef", min: 60, max: 110 },
  { name: "Driver", min: 50, max: 100 },
  { name: "Artist", min: 40, max: 90 },
  { name: "Musician", min: 50, max: 100 },
  { name: "Builder", min: 60, max: 120 },
  { name: "Programmer", min: 70, max: 130 },
  { name: "Doctor", min: 80, max: 150 },
  { name: "Nurse", min: 50, max: 100 },
  { name: "Engineer", min: 80, max: 150 },
  { name: "Scientist", min: 100, max: 200 },
  { name: "Lawyer", min: 90, max: 180 },
  { name: "Police", min: 60, max: 120 },
  { name: "Firefighter", min: 50, max: 110 },
  { name: "Pilot", min: 120, max: 250 },
  { name: "Soldier", min: 70, max: 140 },
  { name: "Hacker", min: 300, max: 500, rare: true },
  { name: "CEO", min: 500, max: 1000, rare: true },
];

// Job emojis
const JOB_EMOJIS = {
  Farmer: "🌾", Miner: "⛏️", Teacher: "📚", Chef: "👨‍🍳", Driver: "🚗",
  Artist: "🎨", Musician: "🎵", Builder: "🏗️", Programmer: "💻", Doctor: "🩺",
  Nurse: "🩹", Engineer: "⚙️", Scientist: "🔬", Lawyer: "⚖️", Police: "👮",
  Firefighter: "🔥", Pilot: "✈️", Soldier: "🪖", Hacker: "💻", CEO: "💼",
};

// Fun phrases
const FUN_PHRASES = [
  "You worked hard today!", "Luck is on your side!", "Great job!",
  "Keep it up!", "You're unstoppable!"
];

// Global cooldown (1 hour)
const GLOBAL_COOLDOWN = 60 * 60 * 1000;

module.exports.config = {
  name: "job",
  version: "5.3.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Random job system with GC admin toggle, 1-hour cooldown, buffs, rare jobs, critical bonus, emojis, and fun phrases",
  commandCategory: "economy",
  usages: "/job | /job on | /job off | /job status",
  cooldowns: 3
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 🔑 Get username via api.getUserInfo
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    return info[uid]?.name || `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

module.exports.run = async function({ api, event }) {
  const { senderID, threadID, messageID, args } = event;
  const now = Date.now();
  const command = args[0] ? args[0].toLowerCase() : "";

  // 🔹 Handle /job on/off/status (GC admin only for on/off)
  if (["on", "off", "status"].includes(command)) {
    try {
      if (command === "status") {
        const jobStatus = (await getData(`job/status/${threadID}`)) || { enabled: true };
        return api.sendMessage(
          `💼 Job system status: ${jobStatus.enabled ? "✅ ENABLED" : "❌ DISABLED"}`,
          threadID
        );
      }

      const threadInfo = await api.getThreadInfo(threadID);
      const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);
      if (!isAdmin) return api.sendMessage("❌ Only GC admins can toggle the job system.", threadID);

      const enabled = command === "on";
      await setData(`job/status/${threadID}`, { enabled });
      return api.sendMessage(
        `💼 Job system is now ${enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
        threadID
      );
    } catch (err) {
      console.error("[JOB] Toggle error:", err);
      return api.sendMessage("⚠️ Failed to toggle job system.", threadID);
    }
  }

  // 🔹 Check if job system is enabled
  const jobStatus = (await getData(`job/status/${threadID}`)) || { enabled: true };
  if (!jobStatus.enabled) {
    return api.sendMessage("❌ Job system is currently disabled by GC admin.", threadID);
  }

  // Load user data
  const userData = (await getData(`job/${threadID}/${senderID}`)) || {};
  const inventory = (await getData(`inventory/${threadID}/${senderID}`)) || { items: [] };
  const bankData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };

  // Check global cooldown
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

  // Random job selection
  let job = JOBS[Math.floor(Math.random() * JOBS.length)];
  let isRare = job.rare || false;

  // 10% chance for rare job if not rare
  if (!isRare && Math.random() <= 0.10) {
    const rareJobs = JOBS.filter(j => j.rare);
    job = rareJobs[Math.floor(Math.random() * rareJobs.length)];
    isRare = true;
  }

  // Buff: Lucky Charm
  let critChance = 0.05;
  const luckyCharm = inventory.items.find(i => i.name === "Lucky Charm");
  if (luckyCharm) {
    critChance += 0.05;
    usedItems.push("🍀 Lucky Charm (+5% Critical chance)");
  }

  // Random earnings
  let earned = randomInt(job.min, job.max);
  let critical = false;
  if (Math.random() <= critChance) {
    earned *= 2;
    critical = true;
  }

  // Update bank
  bankData.balance += earned;
  await setData(`bank/${threadID}/${senderID}`, bankData);

  // Update last job time
  userData.lastTime = now;
  await setData(`job/${threadID}/${senderID}`, userData);

  // Get username
  const userName = await getUserName(senderID, api);

  // Used items text
  const usedItemsText = usedItems.length > 0 ? usedItems.map(u => `🛠️ ${u}`).join("\n") + "\n" : "";

  // Emoji & fun phrase
  const emoji = JOB_EMOJIS[job.name] || "💼";
  const funText = FUN_PHRASES[Math.floor(Math.random() * FUN_PHRASES.length)];

  // Construct message
  const msg = `
=========================
${emoji} ${userName} did the ${job.name} job! ${isRare ? "✨" : ""}

${usedItemsText}💰 Earnings: ${earned} coins${critical ? " 💥 Critical!" : ""}
🏦 Balance: ${bankData.balance.toLocaleString()} coins
⏳ Next job available in: ${Math.floor(cooldown/60000)}m ${Math.floor((cooldown%60000)/1000)}s

💬 ${funText}
=========================
`;

  api.sendMessage(msg, threadID, messageID);
};
