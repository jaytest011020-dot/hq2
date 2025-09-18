const { getData, setData, getAllData } = require("../../database.js");
const axios = require("axios");

module.exports.config = {
  name: "rank",
  version: "3.0.0",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord",
  description: "Rank system with XP, Levels, Rank names",
  commandCategory: "system",
  usages: "/rank, /rank @mention, /rank all",
  cooldowns: 5
};

// Rank names 1–100 (sample, palitan mo gusto mo)
const rankNames = Array.from({ length: 100 }, (_, i) => `Warrior ${i+1}`);

// XP requirement formula (linear)
function getRequiredXP(level) {
  return 100 + (level - 1) * 100;
}

// Get rank name from level
function getRankName(level) {
  if (level <= rankNames.length) return rankNames[level - 1];
  return `Legend ${level}`;
}

// Generate rank card API
function getRankCardUrl(name, userID, level, rank, xp, requiredXP) {
  return `https://betadash-api-swordslush-production.up.railway.app/rankcard?name=${encodeURIComponent(name)}&userid=${userID}&currentLvl=${level}&currentRank=${encodeURIComponent(rank)}&currentXP=${xp}&requiredXP=${requiredXP}`;
}

module.exports.handleEvent = async function ({ event, api, Users }) {
  const senderID = event.senderID;
  if (!senderID) return;

  let userData = await getData(senderID) || { xp: 0, level: 1 };
  userData.xp += 1;

  let requiredXP = getRequiredXP(userData.level);

  // Check level up
  if (userData.xp >= requiredXP) {
    userData.level += 1;
    userData.xp = 0;
    await setData(senderID, userData);

    const rankName = getRankName(userData.level);
    const userName = await Users.getNameUser(senderID);
    const nextXP = getRequiredXP(userData.level);

    const imageUrl = getRankCardUrl(userName, senderID, userData.level, rankName, userData.xp, nextXP);

    api.sendMessage({
      body: `🎉 Congrats ${userName}!\nUmangat ka sa 🥇 Level ${userData.level}!\n🎖️ Rank: ${rankName}`,
      attachment: await global.utils.getStreamFromURL(imageUrl)
    }, event.threadID);
  }

  await setData(senderID, userData);
};

module.exports.run = async function ({ event, api, args, Users }) {
  const mention = Object.keys(event.mentions || {});
  const allData = await getAllData();

  // /rank all → leaderboard
  if (args[0] && args[0].toLowerCase() === "all") {
    const leaderboard = Object.entries(allData)
      .map(([id, data]) => ({
        id,
        level: data.level || 1,
        xp: data.xp || 0,
        name: data.name || id
      }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);

    let msg = "🏆 Leaderboard 🏆\n";
    leaderboard.forEach((u, i) => {
      msg += `${i+1}. ${u.name} — Level ${u.level} (${u.xp} XP)\n`;
    });

    return api.sendMessage(msg, event.threadID, event.messageID);
  }

  // /rank @mention → ibang tao
  let targetID = mention[0] || event.senderID;
  let targetName = mention[0]
    ? Object.values(event.mentions)[0]
    : await Users.getNameUser(event.senderID);

  let targetData = await getData(targetID) || { xp: 0, level: 1 };
  let requiredXP = getRequiredXP(targetData.level);
  let rankName = getRankName(targetData.level);

  const imageUrl = getRankCardUrl(
    targetName,
    targetID,
    targetData.level,
    rankName,
    targetData.xp,
    requiredXP
  );

  return api.sendMessage({
    body: `📊 Rank Info for ${targetName}\n\n🥇 Level: ${targetData.level}\n⭐ XP: ${targetData.xp}/${requiredXP}\n🎖️ Rank: ${rankName}`,
    attachment: await global.utils.getStreamFromURL(imageUrl)
  }, event.threadID, event.messageID);
};
