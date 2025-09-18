const request = require("request");
const { getData, setData } = require("../../database.js");

const ranks = [
  "Beginner", "Novice", "Apprentice", "Explorer", "Warrior",
  "Knight", "Elite", "Champion", "Master", "Grandmaster",
  "Legend", "Mythic", "Immortal", "Eternal", "Supreme",
  "Celestial", "Divine", "Godlike", "Infinity"
];

module.exports.config = {
  name: "rank",
  version: "1.2.0",
  hasPermission: 0,
  credits: "ChatGPT + NN",
  description: "Rank system with leveling and XP",
  commandCategory: "fun",
  usages: "/rank | /rank @mention | /rank all",
  cooldowns: 0
};

// Handle messages for XP gain
module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, senderID } = event;
  if (!threadID || !senderID) return;

  let data = await getData(`/rank/${threadID}`) || {};
  if (!data[senderID]) {
    const senderName = await Users.getNameUser(senderID);
    data[senderID] = { name: senderName, xp: 0, level: 1 };
  }

  // Always update latest name
  data[senderID].name = await Users.getNameUser(senderID);

  // Random XP gain (1–3)
  const xpGain = Math.floor(Math.random() * 3) + 1;
  data[senderID].xp += xpGain;

  // Required XP (level * 100)
  const requiredXP = data[senderID].level * 100;

  // Level up check
  if (data[senderID].xp >= requiredXP) {
    data[senderID].xp -= requiredXP;
    data[senderID].level++;

    const rankName = ranks[data[senderID].level - 1] || "Infinity";
    api.sendMessage(
      `🎉 Congrats ${data[senderID].name}!\n` +
      `Level Up → **Level ${data[senderID].level}** 🎖️\n` +
      `New Rank: ${rankName}`,
      threadID,
      () => {
        api.sendMessage(
          {
            attachment: request(
              `https://betadash-api-swordslush-production.up.railway.app/rankcard2?` +
              `name=${encodeURIComponent(data[senderID].name)}&userid=${senderID}` +
              `&currentLvl=${data[senderID].level}&currentRank=${rankName}` +
              `&currentXP=${data[senderID].xp}&requiredXP=${data[senderID].level * 100}`
            )
          },
          threadID
        );
      }
    );
  }

  await setData(`/rank/${threadID}`, data);
};

// Command handler
module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID, mentions } = event;
  let data = await getData(`/rank/${threadID}`) || {};

  // 🟡 Self rank
  if (args.length === 0) {
    if (!data[senderID]) {
      const senderName = await Users.getNameUser(senderID);
      data[senderID] = { name: senderName, xp: 0, level: 1 };
      await setData(`/rank/${threadID}`, data);
    }

    const user = data[senderID];
    const rankName = ranks[user.level - 1] || "Infinity";

    return api.sendMessage(
      `📊 Rank Info for ${user.name}\n` +
      `🏅 Level: ${user.level}\n` +
      `⭐ XP: ${user.xp}/${user.level * 100}\n` +
      `🎖️ Rank: ${rankName}`,
      threadID,
      () => {
        api.sendMessage(
          {
            attachment: request(
              `https://betadash-api-swordslush-production.up.railway.app/rankcard2?` +
              `name=${encodeURIComponent(user.name)}&userid=${senderID}` +
              `&currentLvl=${user.level}&currentRank=${rankName}` +
              `&currentXP=${user.xp}&requiredXP=${user.level * 100}`
            )
          },
          threadID,
          messageID
        );
      }
    );
  }

  // 🟡 Rank All
  if (args[0].toLowerCase() === "all") {
    if (Object.keys(data).length === 0) {
      return api.sendMessage("⚠️ Walang rank data sa GC na ito.", threadID, messageID);
    }

    let leaderboard = Object.values(data)
      .sort((a, b) => (b.level * 100 + b.xp) - (a.level * 100 + a.xp))
      .map((u, i) => `${i + 1}. ${u.name} — Level ${u.level} (${u.xp}/${u.level * 100} XP)`);

    return api.sendMessage(
      `🏆 RANK LEADERBOARD 🏆\n\n${leaderboard.join("\n")}`,
      threadID,
      messageID
    );
  }

  // 🟡 Mention rank
  const mentionID = Object.keys(mentions)[0];
  if (mentionID) {
    if (!data[mentionID]) {
      const mentionName = await Users.getNameUser(mentionID);
      data[mentionID] = { name: mentionName, xp: 0, level: 1 };
      await setData(`/rank/${threadID}`, data);
    }

    const user = data[mentionID];
    const rankName = ranks[user.level - 1] || "Infinity";

    return api.sendMessage(
      `📊 Rank Info for ${user.name}\n` +
      `🏅 Level: ${user.level}\n` +
      `⭐ XP: ${user.xp}/${user.level * 100}\n` +
      `🎖️ Rank: ${rankName}`,
      threadID,
      () => {
        api.sendMessage(
          {
            attachment: request(
              `https://betadash-api-swordslush-production.up.railway.app/rankcard2?` +
              `name=${encodeURIComponent(user.name)}&userid=${mentionID}` +
              `&currentLvl=${user.level}&currentRank=${rankName}` +
              `&currentXP=${user.xp}&requiredXP=${user.level * 100}`
            )
          },
          threadID,
          messageID
        );
      }
    );
  }

  return api.sendMessage("⚠️ Usage: /rank | /rank @mention | /rank all", threadID, messageID);
};
