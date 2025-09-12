const fs = require("fs");
const path = require("path");

// Paths
const dataFile = path.join(__dirname, "check.json");
const backupDir = path.join(__dirname, "check_backups");

// Ensure files/folders exist
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({}), "utf8");
}
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Load data
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch (e) {
    return {};
  }
}

// Save data
function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

// Add message count
function addMessage(threadID, userID) {
  const data = loadData();
  if (!data[threadID]) data[threadID] = {};
  if (!data[threadID][userID]) data[threadID][userID] = 0;
  data[threadID][userID]++;
  saveData(data);
}

// Get all message counts for a thread
function getThreadData(threadID) {
  const data = loadData();
  if (!data[threadID]) return [];
  return Object.entries(data[threadID]).map(([userID, count]) => ({
    userID,
    count,
  }));
}

// 🔹 Auto-backup every 5 minutes
setInterval(() => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `check_backup_${timestamp}.json`);
  try {
    fs.copyFileSync(dataFile, backupFile);
    console.log(`[Backup] Saved to ${backupFile}`);
  } catch (e) {
    console.error("[Backup Error]", e);
  }
}, 5 * 60 * 1000); // 5 minutes

// === Command Config ===
module.exports.config = {
  name: "check",
  version: "2.0.3",
  hasPermssion: 0,
  credits: "ChatGPT + Priyansh Rajput",
  description: "Interactive message check (JSON version with auto-backup)",
  commandCategory: "Utilities",
  usages: "check / check all / check rank",
  cooldowns: 5,
};

const getRankName = (count) => {
  return count > 50000 ? "War Generals"
    : count > 9000 ? "Master"
    : count > 8000 ? "Elite V"
    : count > 6100 ? "Elite IV"
    : count > 5900 ? "Elite III"
    : count > 5700 ? "Elite II"
    : count > 5200 ? "Elite I"
    : count > 5000 ? "Diamond V"
    : count > 4800 ? "Diamond IV"
    : count > 4500 ? "Diamond III"
    : count > 4000 ? "Diamond II"
    : count > 3800 ? "Diamond I"
    : count > 3500 ? "Platinum IV"
    : count > 3200 ? "Platinum III"
    : count > 3000 ? "Platinum II"
    : count > 2900 ? "Platinum I"
    : count > 2500 ? "Gold IV"
    : count > 2300 ? "Gold III"
    : count > 2000 ? "Gold II"
    : count > 1500 ? "Gold I"
    : count > 1200 ? "Silver III"
    : count > 1000 ? "Silver II"
    : count > 900 ? "Silver I"
    : count > 500 ? "Copper III"
    : count > 100 ? "Copper II"
    : "Copper I";
};

// 🔹 Auto add message for each event
module.exports.handleEvent = function ({ event }) {
  const { threadID, senderID } = event;
  if (!threadID || !senderID) return;
  addMessage(threadID, senderID);
};

// 🔹 Run check command
module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID, mentions } = event;
  const query = args[0] ? args[0].toLowerCase() : "";

  let rows = getThreadData(threadID);
  let msg = "";
  let storage = [];

  for (const row of rows) {
    const name = await Users.getNameUser(row.userID);
    storage.push({ id: row.userID, name, count: row.count });
  }

  storage.sort((a, b) => {
    if (a.count > b.count) return -1;
    if (a.count < b.count) return 1;
    return a.name.localeCompare(b.name);
  });

  if (query === "all") {
    msg = "=== CHECK ===";
    let rank = 1;
    for (const user of storage) {
      msg += `\n${rank++}. ${user.name} - ${user.count}`;
    }
  } else if (query === "rank") {
    msg = "Copper 1 (10 msgs)\nCopper 2 (100 msgs)\nCopper 3 (500 msgs)\nSilver 1 (900 msgs)\nSilver 2 (1000 msgs)\nSilver 3 (1200 msgs)\nGold 1 (1500 msgs)\nGold 2 (2000 msgs)\nGold 3 (2300 msgs)\nGold 4 (2500 msgs)\nPlatinum 1 (2900 msgs)\nPlatinum 2 (3000 msgs)\nPlatinum 3 (3200 msgs)\nPlatinum 4 (3500 msgs)\nDiamond 1 (3800 msgs)\nDiamond 2 (4000 msgs)\nDiamond 3 (4500 msgs)\nDiamond 4 (4800 msgs)\nDiamond 5 (5000 msgs)\nElite 1 (5200 msgs)\nElite 2 (5700 msgs)\nElite 3 (5900 msgs)\nElite 4 (6100 msgs)\nElite 5 (8000 msgs)\nMaster (9000 msgs)\nWar Generals (50000 msgs)";
  } else {
    let userID = senderID;
    if (Object.keys(mentions).length > 0) {
      userID = Object.keys(mentions)[0];
    }
    const rankUser = storage.findIndex((e) => e.id == userID);
    if (rankUser === -1) {
      msg = "❌ No data for this user.";
    } else {
      msg = `${userID == senderID ? "💠Friend" : storage[rankUser].name} ranked ${rankUser + 1}\n💌Number of messages: ${storage[rankUser].count}\n🔰Rank ${getRankName(storage[rankUser].count)}`;
    }
  }

  api.sendMessage(msg, threadID);
};
