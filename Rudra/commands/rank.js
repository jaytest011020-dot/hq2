const { getData, setData } = require("../../database.js");
const axios = require("axios");

module.exports.config = {
  name: "rank",
  version: "2.5.0",
  hasPermission: 0,
  credits: "ChatGPT + Jaylord",
  description: "Show user rank or leaderboard",
  commandCategory: "games",
  usages: "/rank, /rank @mention, /rank all",
  cooldowns: 0
};

module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, senderID } = event;
  if (!event.body) return;

  let data = await getData(`/rank/${threadID}/${senderID}`);
  if (!data) {
    const name = await Users.getNameUser(senderID);
    data = { xp: 0, level: 1, name };
  }

  // random XP 1-3
  const gain = Math.floor(Math.random() * 3) + 1;
  data.xp += gain;

  // required XP scaling
  const requiredXP = 5 * Math.pow(2, data.level - 1);
  if (data.xp >= requiredXP) {
    data.level++;
    data.xp = 0;

    api.sendMessage(
      `🎉 Congrats ${data.name}! You leveled up to Level ${data.level}!`,
      threadID
    );
  }

  // update name if outdated
  const realName = await Users.getNameUser(senderID);
  if (data.name !== realName) data.name = realName;

  await setData(`/rank/${threadID}/${senderID}`, data);
};

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID } = event;

  // Rank All
  if (args[0] === "all") {
    let data = await getData(`/rank/${threadID}`) || {};

    // auto-update names
    for (let uid in data) {
      const realName = await Users.getNameUser(uid);
      if (data[uid].name !== realName) {
        data[uid].name = realName;
      }
    }
    await setData(`/rank/${threadID}`, data);

    // sort leaderboard
    const sorted = Object.entries(data).sort((a, b) => {
      if (b[1].level === a[1].level) {
        return b[1].xp - a[1].xp;
      }
      return b[1].level - a[1].level;
    });

    let msg = "🏆 Group Leaderboard 🏆\n\n";
    let count = 0;
    for (const [uid, info] of sorted) {
      count++;
      msg += `${count}. ${info.name} - Level ${info.level} (${info.xp} XP)\n`;
      if (count >= 10) break;
    }

    return api.sendMessage(msg, threadID, messageID);
  }

  // Rank for self or mention
  const mention = Object.keys(event.mentions)[0] || senderID;
  let data = await getData(`/rank/${threadID}/${mention}`);

  if (!data) {
    const name = await Users.getNameUser(mention);
    data = { xp: 0, level: 1, name };
    await setData(`/rank/${threadID}/${mention}`, data);
  }

  const requiredXP = 5 * Math.pow(2, data.level - 1);
  const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard2?name=${encodeURIComponent(
    data.name
  )}&userid=${mention}&currentLvl=${data.level}&currentRank=🌟&currentXP=${data.xp}&requiredXP=${requiredXP}`;

  const img = (await axios.get(apiUrl, { responseType: "stream" })).data;

  return api.sendMessage(
    { body: "", attachment: img },
    threadID,
    messageID
  );
};
