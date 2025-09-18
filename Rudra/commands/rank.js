const axios = require("axios");
const fs = require("fs-extra");

module.exports.config = {
  name: "rank",
  version: "1.3.0",
  hasPermission: 0,
  credits: "ChatGPT",
  description: "Show user rank card",
  commandCategory: "leveling",
  usages: "/rank [@mention | all]",
  cooldowns: 5
};

// === Rank Names 100 ===
const rankNames = [
  "Rookie", "Apprentice", "Warrior", "Knight", "Elite",
  "Champion", "Gladiator", "Hero", "Guardian", "Master",
  "Legend", "Mythic", "Overlord", "Immortal", "Warlord",
  "Paladin", "Slayer", "Conqueror", "Commander", "General",
  "Baron", "Viscount", "Earl", "Duke", "Marquis",
  "King", "Emperor", "Sovereign", "Supreme", "Celestial",
  "Titan", "Dragon", "Phoenix", "Shadow", "Storm",
  "Thunderlord", "Firebrand", "Iceborn", "Stoneheart", "Voidwalker",
  "Lightbringer", "Darkbane", "Bloodfang", "Soulreaper", "Godslayer",
  "Demigod", "Ascendant", "Divine", "Eternal", "Infinity",
  "Omega", "Alpha", "Prime", "Apex", "Zenith",
  "Nemesis", "Vindicator", "Harbinger", "Revenant", "Sentinel",
  "Crusader", "Mercenary", "Ranger", "Assassin", "Invoker",
  "Warlock", "Sorcerer", "Mage", "Archmage", "Oracle",
  "Prophet", "Seer", "Shaman", "Druid", "Alchemist",
  "Templar", "Monk", "Samurai", "Ronin", "Ninja",
  "Hunter", "Beastmaster", "Blademaster", "Gunslinger", "Sharpshooter",
  "Sniper", "Berserker", "Juggernaut", "Destroyer", "Colossus",
  "Overseer", "Patriarch", "Matriarch", "Highlord", "Godking",
  "Saint", "Avatar", "Anomaly", "Paragon", "Transcendent"
];

// Helper: download image and return stream
async function getImageStream(url, filename = "rankcard.png") {
  const path = __dirname + "/" + filename;
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(path, response.data);
  return fs.createReadStream(path);
}

module.exports.run = async function ({ api, event, args, Users, Currencies }) {
  const { threadID, messageID, senderID, mentions } = event;

  // === determine target ===
  let targetID = senderID;
  if (Object.keys(mentions).length > 0) {
    targetID = Object.keys(mentions)[0];
  }

  // === get data ===
  const userData = await Currencies.getData(targetID);
  if (!userData || !userData.expData) {
    return api.sendMessage("⚠️ Walang rank data ang user na ito.", threadID, messageID);
  }

  const { expData } = userData;
  const level = expData.level || 1;
  const xp = expData.xp || 0;
  const requiredXP = expData.requiredXP || 100;

  // rank assignment by level
  let rankName = "Unranked";
  if (level > 0) {
    const idx = Math.min(rankNames.length - 1, Math.floor((level - 1) / 1)); // bawat level may rank hanggang 100
    rankName = rankNames[idx];
  }

  const userName = await Users.getNameUser(targetID);

  // === text info ===
  const infoMsg =
    `📊 Rank Info for ${userName}\n\n` +
    `🥇 Level: ${level}\n` +
    `⭐ XP: ${xp}/${requiredXP}\n` +
    `🎖️ Rank: ${rankName}`;

  // === rank card API ===
  const imgUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard` +
    `?name=${encodeURIComponent(userName)}` +
    `&userid=${targetID}` +
    `&currentLvl=${level}` +
    `&currentRank=${encodeURIComponent(rankName)}` +
    `&currentXP=${xp}` +
    `&requiredXP=${requiredXP}`;

  try {
    const stream = await getImageStream(imgUrl);
    await api.sendMessage({
      body: infoMsg,
      attachment: stream
    }, threadID, messageID);
  } catch (err) {
    console.error("[rank] image error:", err);
    await api.sendMessage(infoMsg + "\n⚠️ (Rank card image failed to load)", threadID, messageID);
  }
};
