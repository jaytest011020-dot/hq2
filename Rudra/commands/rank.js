const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { getData, setData } = require("../../database.js"); // ✅ gamit DB mo

module.exports.config = {
  name: "rank",
  version: "3.0.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Show user rank info",
  commandCategory: "system",
  usages: "/rank [@mention or blank]",
  cooldowns: 5,
};

// XP gain per message
const XP_PER_MESSAGE = 1;

module.exports.handleEvent = async function ({ api, event, Users }) {
  if (event.type !== "message") return;

  const { senderID } = event;
  if (!senderID) return;

  let user = await getData("rank", senderID);
  if (!user) {
    user = { xp: 0, level: 1, requiredXP: 100 };
  }

  // add xp
  user.xp += XP_PER_MESSAGE;

  // check level up
  let leveledUp = false;
  while (user.xp >= user.requiredXP) {
    user.xp -= user.requiredXP;
    user.level += 1;
    user.requiredXP = user.level * 100;
    leveledUp = true;
  }

  await setData("rank", senderID, user);

  if (leveledUp) {
    const name = await Users.getNameUser(senderID);
    api.sendMessage(
      `🎉 Congrats ${name}! You leveled up to Level ${user.level}!`,
      event.threadID
    );
  }
};

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID } = event;

  let targetID = senderID;
  if (event.mentions && Object.keys(event.mentions).length > 0) {
    targetID = Object.keys(event.mentions)[0];
  }

  let user = await getData("rank", targetID);
  if (!user) {
    user = { xp: 0, level: 1, requiredXP: 100 };
    await setData("rank", targetID, user);
  }

  const name = await Users.getNameUser(targetID);

  // Generate rank card image
  const cardUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard2?name=${encodeURIComponent(
    name
  )}&userid=${targetID}&currentLvl=${user.level}&currentRank=Beginner&currentXP=${
    user.xp
  }&requiredXP=${user.requiredXP}`;

  const imgPath = path.join(__dirname, "cache", `rank_${targetID}.png`);
  try {
    const response = await axios.get(cardUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(imgPath, Buffer.from(response.data, "utf-8"));

    return api.sendMessage(
      {
        body: `📊 Rank Info for ${name}\n\n🏅 Level: ${user.level}\n⭐ XP: ${user.xp}/${user.requiredXP}\n🎖️ Rank: Beginner`,
        attachment: fs.createReadStream(imgPath),
      },
      threadID,
      () => fs.unlinkSync(imgPath),
      messageID
    );
  } catch (e) {
    console.error("Error fetching rank card:", e.message);
    return api.sendMessage(
      `📊 Rank Info for ${name}\n\n🏅 Level: ${user.level}\n⭐ XP: ${user.xp}/${user.requiredXP}\n🎖️ Rank: Beginner`,
      threadID,
      messageID
    );
  }
};
