const { getData, setData } = require("../../database.js");
const axios = require("axios");

module.exports.config = {
  name: "rank",
  version: "3.4.0",
  hasPermission: 0,
  credits: "ChatGPT + NN",
  description: "Rank with card image",
  commandCategory: "fun",
  usages: "/rank | /rank @mention",
  cooldowns: 5
};

// Rank names (50)
const rankNames = [
  "Rookie", "Beginner", "Apprentice", "Novice", "Intermediate",
  "Skilled", "Specialist", "Expert", "Veteran", "Elite",
  "Master", "Grandmaster", "Legend", "Mythic", "Immortal",
  "Eternal", "Shadow", "Guardian", "Slayer", "Champion",
  "Hero", "Conqueror", "Overlord", "Demigod", "Godlike",
  "Celestial", "Divine", "Supreme", "Infinity", "Omega",
  "Titan", "Warlord", "Sentinel", "Invoker", "Archmage",
  "Overseer", "Emperor", "Abyssal", "Phoenix", "Dragonlord",
  "Stormbringer", "Doombringer", "Lightbringer", "Voidwalker", "Starborn",
  "Timekeeper", "Worldbreaker", "Chaosbringer", "Balancekeeper", "Transcendent"
];

function getRequiredXP(level) {
  return level * 200;  // linear scaling example
}

module.exports.handleEvent = async function({ api, event, Users }) {
  if (!event.body) return;
  const { threadID, senderID } = event;

  const path = `rank/${threadID}/${senderID}`;
  let userData = await getData(path) || { level: 1, xp: 0, name: "" };

  // get user name
  userData.name = await Users.getNameUser(senderID);

  // +1 XP per message
  userData.xp += 1;

  let requiredXP = getRequiredXP(userData.level);
  let leveledUp = false;
  while (userData.xp >= requiredXP) {
    userData.xp -= requiredXP;
    userData.level++;
    leveledUp = true;
    requiredXP = getRequiredXP(userData.level);
  }

  await setData(path, userData);

  if (leveledUp) {
    const rankName = rankNames[userData.level - 1] || "Ascended";

    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard?name=${encodeURIComponent(userData.name)}&userid=${senderID}&currentLvl=${userData.level}&currentRank=${encodeURIComponent(rankName)}&currentXP=${userData.xp}&requiredXP=${requiredXP}`;

    // send text and image together
    try {
      const response = await axios.get(apiUrl, { responseType: "stream" });
      await api.sendMessage(
        {
          body: `🎉 Congrats ${userData.name}! Level up → Level ${userData.level}\nRank: ${rankName}`,
          attachment: response.data
        },
        threadID
      );
    } catch (err) {
      // fallback text only
      await api.sendMessage(
        `🎉 Congrats ${userData.name}! Level up → Level ${userData.level}\nRank: ${rankName}\n⚠️ (Could not load rank card image)`,
        threadID
      );
    }
  }
};

module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, messageID, senderID, mentions } = event;

  // determine target (mention or self)
  const targetID = Object.keys(mentions)[0] || senderID;

  const path = `rank/${threadID}/${targetID}`;
  let userData = await getData(path);
  if (!userData) {
    return api.sendMessage("⚠️ Walang rank data ang user na ito.", threadID, messageID);
  }

  const requiredXP = getRequiredXP(userData.level);
  const rankName = rankNames[userData.level - 1] || "Ascended";

  try {
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard?name=${encodeURIComponent(userData.name)}&userid=${targetID}&currentLvl=${userData.level}&currentRank=${encodeURIComponent(rankName)}&currentXP=${userData.xp}&requiredXP=${requiredXP}`;

    const response = await axios.get(apiUrl, { responseType: "stream" });
    await api.sendMessage(
      {
        body: `📊 Rank Info for ${userData.name}\nLevel: ${userData.level}\nXP: ${userData.xp}/${requiredXP}\nRank: ${rankName}`,
        attachment: response.data
      },
      threadID,
      messageID
    );
  } catch (err) {
    await api.sendMessage(
      `📊 Rank Info for ${userData.name}\nLevel: ${userData.level}\nXP: ${userData.xp}/${requiredXP}\nRank: ${rankName}\n⚠️ (Rank card image failed to load)`,
      threadID,
      messageID
    );
  }
};
