const { setData, getData } = require("../../database.js");

// ✅ Job definitions
const JOBS = [
  { name: "Farmer", min: 50, max: 100, cooldown: 10 * 60 * 1000 },
  { name: "Miner", min: 80, max: 150, cooldown: 15 * 60 * 1000 },
  { name: "Teacher", min: 70, max: 120, cooldown: 20 * 60 * 1000 },
  { name: "Chef", min: 60, max: 110, cooldown: 15 * 60 * 1000 },
  { name: "Driver", min: 50, max: 100, cooldown: 10 * 60 * 1000 },
  { name: "Artist", min: 40, max: 90, cooldown: 10 * 60 * 1000 },
  { name: "Musician", min: 50, max: 100, cooldown: 10 * 60 * 1000 },
  { name: "Builder", min: 60, max: 120, cooldown: 15 * 60 * 1000 },
  { name: "Programmer", min: 70, max: 130, cooldown: 15 * 60 * 1000 },
  { name: "Doctor", min: 80, max: 150, cooldown: 20 * 60 * 1000 },
  { name: "Nurse", min: 50, max: 100, cooldown: 10 * 60 * 1000 },
  { name: "Engineer", min: 80, max: 150, cooldown: 20 * 60 * 1000 },
  { name: "Scientist", min: 100, max: 200, cooldown: 30 * 60 * 1000 },
  { name: "Lawyer", min: 90, max: 180, cooldown: 25 * 60 * 1000 },
  { name: "Police", min: 60, max: 120, cooldown: 15 * 60 * 1000 },
  { name: "Firefighter", min: 50, max: 110, cooldown: 15 * 60 * 1000 },
  { name: "Pilot", min: 120, max: 250, cooldown: 40 * 60 * 1000 },
  { name: "Soldier", min: 70, max: 140, cooldown: 20 * 60 * 1000 },
  { name: "Hacker", min: 300, max: 500, cooldown: 60 * 60 * 1000, rare: true },
  { name: "CEO", min: 500, max: 1000, cooldown: 2 * 60 * 60 * 1000, rare: true },
];

// Job-specific emojis
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
  version: "3.1.0",
  hasPermission: 0,
  credits: "ChatGPT + NN",
  description: "Random job system per GC with rare jobs, critical bonus, emojis, and fun phrases",
  commandCategory: "economy",
  usages: "/job",
  cooldowns: 3
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports.run = async function({ api, event, Users }) {
  const { senderID, threadID, messageID } = event;
  const now = Date.now();

  // Load user's job data per thread
  const userJobData = (await getData(`job/${threadID}/${senderID}`)) || {};

  // Random job selection
  let job = JOBS[Math.floor(Math.random() * JOBS.length)];
  let isRare = job.rare || false;

  // 10% chance to force a rare job if not already rare
  if (!isRare && Math.random() <= 0.10) {
    const rareJobs = JOBS.filter(j => j.rare);
    job = rareJobs[Math.floor(Math.random() * rareJobs.length)];
    isRare = true;
  }

  // Check cooldown
  const lastTime = userJobData[job.name] || 0;
  if (now - lastTime < job.cooldown) {
    const remaining = job.cooldown - (now - lastTime);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return api.sendMessage(
      `⏳ You must wait ${mins}m ${secs}s before doing the ${job.name} job again.`,
      threadID,
      messageID
    );
  }

  // Random earnings
  let earned = randomInt(job.min, job.max);

  // Critical bonus 5%
  let critical = false;
  if (Math.random() <= 0.05) {
    earned *= 2;
    critical = true;
  }

  // Update bank per thread
  let bankData = (await getData(`bank/${threadID}/${senderID}`)) || {
    uid: senderID,
    name: `FB-User(${senderID})`,
    balance: 0
  };
  bankData.balance += earned;

  // Get user name with fallback
  let userName;
  try {
    const info = await api.getUser(senderID);
    userName = info.name || bankData.name;
  } catch {
    try {
      const info2 = await Users.getInfo(senderID);
      userName = info2[senderID]?.name || bankData.name;
    } catch {
      userName = bankData.name;
    }
  }
  bankData.name = userName;
  await setData(`bank/${threadID}/${senderID}`, bankData);

  // Update job cooldown
  userJobData[job.name] = now;
  await setData(`job/${threadID}/${senderID}`, userJobData);

  // Construct message
  let emoji = JOB_EMOJIS[job.name] || "💼";
  let funText = FUN_PHRASES[Math.floor(Math.random() * FUN_PHRASES.length)];
  let msg = `${isRare ? "✨ " : ""}${emoji} ${userName} did the ${job.name} job!\n` +
            `💰 Earned: ${earned} coins${critical ? " 💥 Critical!" : ""}\n` +
            `🏦 New balance: ${bankData.balance.toLocaleString()} coins\n\n${funText}`;

  // Bot replies to user's message
  api.sendMessage(msg, threadID, messageID);
};
