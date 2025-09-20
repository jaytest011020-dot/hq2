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

module.exports.config = {
  name: "job",
  version: "5.1.0",
  hasPermission: 0,
  credits: "ChatGPT + NN",
  description: "Random job system with 1-hour cooldown, buffs, rare jobs, critical bonus, and effects",
  commandCategory: "economy",
  usages: "/job",
  cooldowns: 3
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 🔑 Get username via API
async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    return info[uid]?.name || `FB-User(${uid})`;
  } catch {
    return `FB-User(${uid})`;
  }
}

module.exports.run = async function({ api, event }) {
  const { senderID, threadID, messageID } = event;
  const now = Date.now();

  // Load user data
  const userJobData = (await getData(`job/${threadID}/${senderID}`)) || {};
  const inventory = (await getData(`inventory/${threadID}/${senderID}`)) || { items: [] };
  const bankData = (await getData(`bank/${threadID}/${senderID}`)) || { balance: 0 };

  // Universal cooldown: 1 hour
  const COOLDOWN = 60 * 60 * 1000;
  const lastTime = userJobData.last || 0;
  const elapsed = now - lastTime;

  // Buff: Energy Drink halves cooldown
  let jobCooldown = COOLDOWN;
  let usedItems = [];
  const energyDrink = inventory.items.find(i => i.name === "Energy Drink" && i.quantity > 0);
  if (energyDrink) {
    jobCooldown = Math.floor(COOLDOWN / 2);
    energyDrink.quantity -= 1;
    usedItems.push("🧃 Energy Drink (halved cooldown)");
    if (energyDrink.quantity <= 0) inventory.items = inventory.items.filter(i => i !== energyDrink);
    await setData(`inventory/${threadID}/${senderID}`, inventory);
  }

  if (elapsed < jobCooldown) {
    const remaining = jobCooldown - elapsed;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return api.sendMessage(
      `⏳ Please wait ${mins}m ${secs}s before doing the next job.`,
      threadID, messageID
    );
  }

  // Random job
  let job = JOBS[Math.floor(Math.random() * JOBS.length)];
  let isRare = job.rare || false;
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

  // Earnings
  let earned = randomInt(job.min, job.max);
  let critical = false;
  if (Math.random() <= critChance) {
    earned *= 2;
    critical = true;
  }
  bankData.balance += earned;
  await setData(`bank/${threadID}/${senderID}`, bankData);

  // Update last job time
  userJobData.last = now;
  await setData(`job/${threadID}/${senderID}`, userJobData);

  const userName = await getUserName(senderID, api);

  // Construct message
  const usedItemsText = usedItems.length > 0 ? usedItems.map(u => `✅ Used ${u}`).join("\n") + "\n" : "";
  const emoji = JOB_EMOJIS[job.name] || "💼";
  const funText = FUN_PHRASES[Math.floor(Math.random() * FUN_PHRASES.length)];

  api.sendMessage(
    `${isRare ? "✨ " : ""}${emoji} ${userName} did the ${job.name} job!\n` +
    `${usedItemsText}` +
    `💰 Earned: ${earned} coins${critical ? " 💥 Critical!" : ""}\n` +
    `🏦 New balance: ${bankData.balance.toLocaleString()} coins\n` +
    `⏳ Cooldown: ${Math.floor(jobCooldown/60000)}m ${Math.floor((jobCooldown%60000)/1000)}s\n\n` +
    `${funText}`,
    threadID,
    messageID
  );
};
