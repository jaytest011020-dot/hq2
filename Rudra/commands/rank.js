// 📌 Handle messages → XP Gain
module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, senderID } = event;
  if (!threadID || !senderID) return;

  let data = (await getData(`/rank/${threadID}`)) || {};

  // ✅ Kunin username via api.getUserInfo
  const info = await api.getUserInfo(senderID);
  const username = info[senderID]?.name || "Facebook User";

  // Create user if not exist
  if (!data[senderID]) {
    data[senderID] = { name: username, xp: 0, level: 1 };
  }

  // Always update name
  data[senderID].name = username;

  // Add random XP (1–3)
  const xpGain = Math.floor(Math.random() * 3) + 1;
  data[senderID].xp += xpGain;

  // Check level up
  let requiredXP = getRequiredXP(data[senderID].level);
  if (data[senderID].xp >= requiredXP) {
    data[senderID].xp -= requiredXP;
    data[senderID].level++;

    const rankName = ranks[data[senderID].level - 1] || "Infinity";

    // Auto announce with image
    const imgUrl =
      `https://betadash-api-swordslush-production.up.railway.app/rankcard2` +
      `?name=${encodeURIComponent(username)}` +
      `&userid=${senderID}` +
      `&currentLvl=${data[senderID].level}` +
      `&currentRank=${rankName}` +
      `&currentXP=${data[senderID].xp}` +
      `&requiredXP=${getRequiredXP(data[senderID].level)}`;

    api.sendMessage(
      {
        body:
          `🎉 Congratulations ${username}!\n` +
          `You leveled up to **Level ${data[senderID].level}** 🎖️\n` +
          `Your new rank is: ${rankName}`,
        attachment: await global.utils.getStreamFromURL(imgUrl)
      },
      threadID
    );
  }

  // Save
  await setData(`/rank/${threadID}`, data);
};
