const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("data.db");

// Create table kung wala pa
db.run(`CREATE TABLE IF NOT EXISTS checktt (
  threadID TEXT,
  userID TEXT,
  count INTEGER,
  PRIMARY KEY (threadID, userID)
)`);

function addMessage(threadID, userID) {
  db.run(
    "INSERT INTO checktt (threadID, userID, count) VALUES (?, ?, 1) ON CONFLICT(threadID, userID) DO UPDATE SET count = count + 1",
    [threadID, userID]
  );
}

function getThreadData(threadID, callback) {
  db.all("SELECT * FROM checktt WHERE threadID = ?", [threadID], (err, rows) => {
    if (err) return callback([]);
    callback(rows);
  });
}

module.exports.config = {
  name: "checktt",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "ChatGPT + Priyansh Rajput",
  description: "Interactive check (SQL version)",
  commandCategory: "Utilities",
  usages: "checktt / checktt all / checktt rank",
  cooldowns: 5
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

// 🔹 Every message add count
module.exports.handleEvent = function ({ event }) {
  const { threadID, senderID } = event;
  if (!threadID || !senderID) return;
  addMessage(threadID, senderID);
};

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, senderID, mentions } = event;
  const query = args[0] ? args[0].toLowerCase() : "";

  getThreadData(threadID, async (rows) => {
    let msg = "";
    let storage = [];

    for (const row of rows) {
      const name = await Users.getNameUser(row.userID);
      storage.push({ id: row.userID, name, count: row.count });
    }

    storage.sort((a, b) => {
      if (a.count > b.count) return -1;
      else if (a.count < b.count) return 1;
      else return a.name.localeCompare(b.name);
    });

    if (query === "all") {
      msg = "=== CHECKTT ===";
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
  });
};
