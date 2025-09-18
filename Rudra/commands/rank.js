const axios = require("axios");
const { setData, getData } = require("../../database.js");

module.exports.config = {
  name: "rank",
  version: "1.0.0",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord",
  description: "Rank and leveling system",
  commandCategory: "fun",
  usages: "/rank, /rank @mention, /rank all",
  cooldowns: 0
};

// Rank names (long list)
const ranks = [
  "Novice", "Apprentice", "Explorer", "Adventurer", "Warrior",
  "Knight", "Crusader", "Champion", "Hero", "Guardian",
  "Warlord", "Commander", "General", "Master", "Grandmaster",
  "Legend", "Mythic", "Immortal", "Eternal", "Celestial",
  "Supreme", "Overlord", "Dragon Slayer", "Shadow Hunter", "Paladin",
  "Archmage", "Battlelord", "High Priest", "Storm Bringer", "Phoenix",
  "Titan", "Demi-God", "Godlike", "Universal Protector", "Cosmic Ruler",
  "Aetherial Sage", "Infinite Voyager", "Ascendant", "Eternal Flame", "Omega",
  "Supra Being", "Celestial Emperor", "Primordial", "Transcendent", "Apex",
  "True God", "Omniscient", "Timeless One", "Infinity", "Absolute"
];

// 🟢 Get user rank data
async function getUserRank(threadID, uid, name) {
  let data = await getData(`rank/${threadID}/${uid}`);
  if (!data) {
    data = { name, xp: 0, level: 1 };
    await setData(`rank/${threadID}/${uid}`, data);
  }
  return data;
}

// 🟢 Save user rank data
async function saveUserRank(threadID, uid, data) {
  await setData(`rank/${threadID}/${uid}`, data);
}

// 🟢 XP handler (auto gain)
module.exports.handleEvent = async function({ api, event }) {
  if (!event.isGroup) return;
  if (!event.body) return;

  const threadID = event.threadID;
  const uid = event.senderID;
  const name = event.senderID == api.getCurrentUserID() ? "Bot" : event.senderID;

  let user = await getUserRank(threadID, uid, name);

  // Random XP (1–3)
  const gained = Math.floor(Math.random() * 3) + 1;
  user.xp += gained;

  // Required XP for next level
  const requiredXP = user.level * 100;

  // Level up check
  if (user.xp >= requiredXP) {
    user.level++;
    user.xp -= requiredXP;

    const rankName = ranks[user.level - 1] || "Infinity";

    // Save first para hindi mawala
    await saveUserRank(threadID, uid, user);

    // Announcement
    const apiURL = `https://betadash-api-swordslush-production.up.railway.app/rankcard2?name=${encodeURIComponent(user.name)}&userid=${uid}&currentLvl=${user.level}&currentRank=${encodeURIComponent(rankName)}&currentXP=${user.xp}&requiredXP=${requiredXP}`;
    
    api.sendMessage({
      body: `🎉 Congratulations ${user.name}!\nYou leveled up to **Level ${user.level}** (${rankName}) 🚀`,
      attachment: await global.utils.getStreamFromURL(apiURL)
    }, threadID);
  }

  await saveUserRank(threadID, uid, user);
};

// 🟢 Commands
module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const mentions = Object.keys(event.mentions);

  if (!args[0]) {
    // /rank → show self
    const uid = event.senderID;
    const name = event.senderID == api.getCurrentUserID() ? "Bot" : event.participantIDs.includes(uid) ? event.mentions[uid] || "User" : "User";
    const user = await getUserRank(threadID, uid, name);

    const requiredXP = user.level * 100;
    const rankName = ranks[user.level - 1] || "Infinity";

    const apiURL = `https://betadash-api-swordslush-production.up.railway.app/rankcard2?name=${encodeURIComponent(user.name)}&userid=${uid}&currentLvl=${user.level}&currentRank=${encodeURIComponent(rankName)}&currentXP=${user.xp}&requiredXP=${requiredXP}`;

    return api.sendMessage({
      body: `📊 Rank for ${user.name}\nLevel: ${user.level}\nRank: ${rankName}\nXP: ${user.xp}/${requiredXP}`,
      attachment: await global.utils.getStreamFromURL(apiURL)
    }, threadID);
  }

  if (args[0] === "all" || args[0] === "list") {
    // /rank all → show leaderboard
    const data = await getData(`rank/${threadID}`);
    if (!data) return api.sendMessage("📂 No rank data found.", threadID);

    const list = Object.values(data)
      .sort((a, b) => (b.level * 100 + b.xp) - (a.level * 100 + a.xp))
      .map((u, i) => `${i + 1}. ${u.name} — Level ${u.level} (${ranks[u.level - 1] || "Infinity"}) — XP: ${u.xp}`)
      .join("\n");

    return api.sendMessage(`📜 Rank Leaderboard\n\n${list}`, threadID);
  }

  if (mentions.length > 0) {
    // /rank @mention
    const uid = mentions[0];
    const name = event.mentions[uid];
    const user = await getUserRank(threadID, uid, name);

    const requiredXP = user.level * 100;
    const rankName = ranks[user.level - 1] || "Infinity";

    const apiURL = `https://betadash-api-swordslush-production.up.railway.app/rankcard2?name=${encodeURIComponent(user.name)}&userid=${uid}&currentLvl=${user.level}&currentRank=${encodeURIComponent(rankName)}&currentXP=${user.xp}&requiredXP=${requiredXP}`;

    return api.sendMessage({
      body: `📊 Rank for ${user.name}\nLevel: ${user.level}\nRank: ${rankName}\nXP: ${user.xp}/${requiredXP}`,
      attachment: await global.utils.getStreamFromURL(apiURL)
    }, threadID);
  }
};
