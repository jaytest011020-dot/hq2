const { getData, setData } = require("../../database.js");

// ✅ 100 Rank Names
const ranks = [
  "Newbie", "Rookie", "Apprentice", "Novice", "Scout",
  "Learner", "Adventurer", "Explorer", "Wanderer", "Seeker",
  "Warrior", "Soldier", "Guardian", "Mercenary", "Berserker",
  "Gladiator", "Samurai", "Ronin", "Vanguard", "Knight",
  "Crusader", "Paladin", "Templar", "Sentinel", "Marksman",
  "Sharpshooter", "Assassin", "Shadowblade", "Duelist", "Slayer",
  "Champion", "Warlord", "Destroyer", "Executioner", "Reaper",
  "Phantom", "Specter", "Ranger", "Hunter", "Tracker",
  "Battle Master", "Sword Saint", "Blade Dancer", "Arcane Mage", "Warlock",
  "Necromancer", "Invoker", "Elementalist", "Pyromancer", "Cryomancer",
  "Storm Bringer", "Thunderlord", "Earthshaker", "Flamecaller", "Frost Warden",
  "Beastmaster", "Dragon Slayer", "Wyvern Rider", "Griffin Knight", "Phoenix Guard",
  "Titan", "Colossus", "Leviathan", "Kraken", "Hydra",
  "Minotaur", "Gorgon", "Chimera", "Basilisk", "Cerberus",
  "Demigod", "Deity", "Celestial", "Oracle", "Prophet",
  "High Priest", "Archangel", "Seraph", "Virtue", "Dominion",
  "Overlord", "Dark Lord", "Blood Emperor", "Soul Reaver", "Void Bringer",
  "Abyss Walker", "Chaos Wielder", "Shadow King", "Demon Lord", "Fallen Angel",
  "Immortal", "Eternal", "Transcendent", "Cosmic Ruler", "Galaxy Emperor",
  "Starforged", "Dimension Breaker", "Time Weaver", "Infinity", "Godslayer"
];

// 📌 Linear formula: required XP = 100 * level
function getRequiredXP(level) {
  return 100 * level;
}

module.exports.config = {
  name: "rank",
  version: "3.3.0",
  hasPermission: 0,
  credits: "ChatGPT + NN",
  description: "Rank system with XP, level up auto announce, and leaderboard",
  commandCategory: "fun",
  usages: "/rank | /rank @mention | /rank all",
  cooldowns: 0
};

// 📌 Handle XP gain + auto announce level up
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID } = event;
  if (!threadID || !senderID) return;

  // Fetch name
  const info = await api.getUserInfo(senderID);
  const senderName = info[senderID]?.name || "Facebook User";

  let data = (await getData(`rank/${threadID}`)) || {};

  if (!data[senderID]) {
    data[senderID] = { name: senderName, xp: 0, level: 1 };
  }

  data[senderID].name = senderName;

  // Add XP (1–3 random)
  const xpGain = Math.floor(Math.random() * 3) + 1;
  data[senderID].xp += xpGain;

  // Level up loop
  let leveledUp = false;
  while (data[senderID].xp >= getRequiredXP(data[senderID].level)) {
    data[senderID].xp -= getRequiredXP(data[senderID].level);
    data[senderID].level++;
    leveledUp = true;
  }

  // Auto announce if level up
  if (leveledUp) {
    const rankName = ranks[data[senderID].level - 1] || "Infinity";

    const imgUrl =
      `https://betadash-api-swordslush-production.up.railway.app/rankcard2` +
      `?name=${encodeURIComponent(senderName)}` +
      `&userid=${senderID}` +
      `&currentLvl=${data[senderID].level}` +
      `&currentRank=${rankName}` +
      `&currentXP=${data[senderID].xp}` +
      `&requiredXP=${getRequiredXP(data[senderID].level)}`;

    api.sendMessage(
      {
        body:
          `🎉 Congrats ${senderName}!\n` +
          `You reached **Level ${data[senderID].level}** 🎖️\n` +
          `Your new rank: ${rankName}`,
        attachment: await global.utils.getStreamFromURL(imgUrl)
      },
      threadID
    );
  }

  await setData(`rank/${threadID}`, data);
};

// 📌 Commands: /rank, /rank @mention, /rank all
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, mentions } = event;
  let data = (await getData(`rank/${threadID}`)) || {};

  // --- /rank (self)
  if (args.length === 0) {
    if (!data[senderID]) {
      return api.sendMessage("⚠️ Wala ka pang XP data.", threadID, messageID);
    }

    const user = data[senderID];
    const rankName = ranks[user.level - 1] || "Infinity";

    const imgUrl =
      `https://betadash-api-swordslush-production.up.railway.app/rankcard2` +
      `?name=${encodeURIComponent(user.name)}` +
      `&userid=${senderID}` +
      `&currentLvl=${user.level}` +
      `&currentRank=${rankName}` +
      `&currentXP=${user.xp}` +
      `&requiredXP=${getRequiredXP(user.level)}`;

    return api.sendMessage(
      {
        body:
          `📊 Rank Info for ${user.name}\n\n` +
          `🏅 Level: ${user.level}\n` +
          `⭐ XP: ${user.xp}/${getRequiredXP(user.level)}\n` +
          `🎖️ Rank: ${rankName}`,
        attachment: await global.utils.getStreamFromURL(imgUrl)
      },
      threadID,
      messageID
    );
  }

  // --- /rank all (leaderboard)
  if (args[0].toLowerCase() === "all") {
    if (Object.keys(data).length === 0) {
      return api.sendMessage("⚠️ Walang rank data sa GC na ito.", threadID, messageID);
    }

    let leaderboard = Object.values(data)
      .sort((a, b) => (b.level * 10000 + b.xp) - (a.level * 10000 + a.xp))
      .map((u, i) => `${i + 1}. ${u.name} — Level ${u.level} (${u.xp}/${getRequiredXP(u.level)} XP)`);

    return api.sendMessage(
      `🏆 RANK LEADERBOARD 🏆\n\n${leaderboard.join("\n")}`,
      threadID,
      messageID
    );
  }

  // --- /rank @mention
  const mentionID = Object.keys(mentions)[0];
  if (mentionID) {
    if (!data[mentionID]) {
      return api.sendMessage("⚠️ Walang data yung user na yan.", threadID, messageID);
    }

    const user = data[mentionID];
    const rankName = ranks[user.level - 1] || "Infinity";

    const imgUrl =
      `https://betadash-api-swordslush-production.up.railway.app/rankcard2` +
      `?name=${encodeURIComponent(user.name)}` +
      `&userid=${mentionID}` +
      `&currentLvl=${user.level}` +
      `&currentRank=${rankName}` +
      `&currentXP=${user.xp}` +
      `&requiredXP=${getRequiredXP(user.level)}`;

    return api.sendMessage(
      {
        body:
          `📊 Rank Info for ${user.name}\n\n` +
          `🏅 Level: ${user.level}\n` +
          `⭐ XP: ${user.xp}/${getRequiredXP(user.level)}\n` +
          `🎖️ Rank: ${rankName}`,
        attachment: await global.utils.getStreamFromURL(imgUrl)
      },
      threadID,
      messageID
    );
  }

  return api.sendMessage("⚠️ Usage: /rank | /rank @mention | /rank all", threadID, messageID);
};
