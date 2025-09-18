const axios = require("axios");

...

// AUTO ANNOUNCE RANK UP
if (data[senderID].xp >= requiredXP) {
  data[senderID].xp -= requiredXP;
  data[senderID].level++;

  const rankName = ranks[data[senderID].level - 1] || "Infinity";
  const imgUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard2?name=${encodeURIComponent(senderName)}&userid=${senderID}&currentLvl=${data[senderID].level}&currentRank=${rankName}&currentXP=${data[senderID].xp}&requiredXP=${data[senderID].level * 100}`;

  try {
    const imgStream = (await axios.get(imgUrl, { responseType: "stream" })).data;

    api.sendMessage(
      {
        body:
          `🎉 Congratulations ${senderName}!\n` +
          `You leveled up to **Level ${data[senderID].level}** 🎖️\n` +
          `Your new rank is: ${rankName}`,
        attachment: imgStream
      },
      threadID
    );
  } catch (e) {
    api.sendMessage(
      `🎉 Congratulations ${senderName}! You leveled up to Level ${data[senderID].level} (${rankName})`,
      threadID
    );
  }
}

// /RANK SELF
if (args.length === 0) {
  if (!data[senderID]) {
    return api.sendMessage("⚠️ Wala ka pang XP data.", threadID, messageID);
  }

  const user = data[senderID];
  const rankName = ranks[user.level - 1] || "Infinity";
  const imgUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard2?name=${encodeURIComponent(user.name)}&userid=${senderID}&currentLvl=${user.level}&currentRank=${rankName}&currentXP=${user.xp}&requiredXP=${user.level * 100}`;

  try {
    const imgStream = (await axios.get(imgUrl, { responseType: "stream" })).data;

    return api.sendMessage(
      {
        body:
          `📊 Rank Info for ${user.name}\n\n` +
          `🏅 Level: ${user.level}\n` +
          `⭐ XP: ${user.xp}/${user.level * 100}\n` +
          `🎖️ Rank: ${rankName}`,
        attachment: imgStream
      },
      threadID,
      messageID
    );
  } catch (e) {
    return api.sendMessage("⚠️ Error loading rank card image.", threadID, messageID);
  }
}

// /RANK @MENTION
const mentionID = Object.keys(mentions)[0];
if (mentionID) {
  if (!data[mentionID]) {
    return api.sendMessage("⚠️ Walang data yung user na yan.", threadID, messageID);
  }

  const user = data[mentionID];
  const rankName = ranks[user.level - 1] || "Infinity";
  const imgUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard2?name=${encodeURIComponent(user.name)}&userid=${mentionID}&currentLvl=${user.level}&currentRank=${rankName}&currentXP=${user.xp}&requiredXP=${user.level * 100}`;

  try {
    const imgStream = (await axios.get(imgUrl, { responseType: "stream" })).data;

    return api.sendMessage(
      {
        body:
          `📊 Rank Info for ${user.name}\n\n` +
          `🏅 Level: ${user.level}\n` +
          `⭐ XP: ${user.xp}/${user.level * 100}\n` +
          `🎖️ Rank: ${rankName}`,
        attachment: imgStream
      },
      threadID,
      messageID
    );
  } catch (e) {
    return api.sendMessage("⚠️ Error loading rank card image.", threadID, messageID);
  }
                           }
