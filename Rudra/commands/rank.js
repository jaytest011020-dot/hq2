const { getData, setData } = require("../../database.js");

// ✅ 100 Maangas Rank Names (IBALIK)
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

// ✅ Quadratic required XP (tulad ng napag-usapan)
function getRequiredXP(level) {
  return 100 * (level ** 2);
}

// Helper: fetch exact username (same style ng ginamit sa bank/rankup)
async function getUserName(uid, Users, api) {
  try {
    let name = await Users.getNameUser(uid);
    if (!name || name === uid) {
      const info = await api.getUserInfo(uid);
      if (info && info[uid] && info[uid].name) name = info[uid].name;
      else name = uid;
    }
    return name;
  } catch (e) {
    console.error("[rank] getUserName error:", e);
    return uid;
  }
}

module.exports.config = {
  name: "rank",
  version: "3.2.1",
  hasPermission: 0,
  credits: "ChatGPT + NN",
  description: "Rank system with XP + auto announce on level up",
  commandCategory: "fun",
  usages: "/rank | /rank @mention | /rank all",
  cooldowns: 0
};

// --- HANDLE EVENT: gain XP when user chats
module.exports.handleEvent = async function ({ api, event, Users }) {
  const { threadID, senderID } = event;
  if (!threadID || !senderID) return;

  // load thread rank data (per-thread)
  let data = (await getData(`rank/${threadID}`)) || {};

  // ensure user entry
  if (!data[senderID]) {
    const initialName = await getUserName(senderID, Users, api);
    data[senderID] = { name: initialName, xp: 0, level: 1 };
  }

  // keep name fresh
  try {
    data[senderID].name = await getUserName(senderID, Users, api);
  } catch (err) { /* ignore */ }

  // add random xp 1-3
  const xpGain = Math.floor(Math.random() * 3) + 1;
  data[senderID].xp += xpGain;

  // level up loop (handles overflow properly)
  let leveledUp = false;
  while (data[senderID].xp >= getRequiredXP(data[senderID].level)) {
    data[senderID].xp -= getRequiredXP(data[senderID].level);
    data[senderID].level++;
    leveledUp = true;
  }

  // save ASAP
  await setData(`rank/${threadID}`, data);

  // auto announce (if leveled)
  if (leveledUp) {
    const user = data[senderID];
    const rankName = ranks[user.level - 1] || `Rank ${user.level}`;
    const required = getRequiredXP(user.level);

    const mention = [{ tag: `${user.name}`, id: senderID }];
    // send text (mention)
    try {
      await api.sendMessage(
        {
          body: `🎉 Congratulations @${user.name}!\nYou leveled up to Level ${user.level} 🎖️\nNew rank: ${rankName}`,
          mentions: mention
        },
        threadID
      );
    } catch (e) {
      // fallback: send without mention if it errors
      await api.sendMessage(`🎉 Congratulations ${user.name}! You leveled up to Level ${user.level} — ${rankName}`, threadID);
    }

    // send image (rank card) separately to avoid Messenger failing
    const imgUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard?name=${encodeURIComponent(user.name)}&userid=${senderID}&currentLvl=${user.level}&currentRank=${encodeURIComponent(rankName)}&currentXP=${user.xp}&requiredXP=${required}`;

    try {
      const stream = await global.utils.getStreamFromURL(imgUrl);
      await api.sendMessage({ attachment: stream }, threadID);
    } catch (err) {
      console.warn("[rank] could not load rank card image:", err.message || err);
      await api.sendMessage("⚠️ (Rank card image failed to load)", threadID);
    }
  }
};

// --- COMMANDS: /rank, /rank @mention, /rank all
module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID, mentions } = event;
  let data = (await getData(`rank/${threadID}`)) || {};

  // /rank all -> leaderboard (text only)
  if (args[0] && args[0].toLowerCase() === "all") {
    const entries = Object.entries(data);
    if (entries.length === 0) return api.sendMessage("⚠️ Walang rank data sa GC na ito.", threadID, messageID);

    const leaderboard = entries
      .map(([uid, u]) => ({ uid, name: u.name || uid, level: u.level || 1, xp: u.xp || 0 }))
      .sort((a, b) => (b.level - a.level) || (b.xp - a.xp))
      .map((u, i) => `${i + 1}. ${u.name} — Level ${u.level} (${u.xp}/${getRequiredXP(u.level)} XP)`);

    return api.sendMessage(`🏆 RANK LEADERBOARD 🏆\n\n${leaderboard.join("\n")}`, threadID, messageID);
  }

  // /rank @mention
  const mentionID = Object.keys(mentions || {})[0];
  if (mentionID) {
    if (!data[mentionID]) return api.sendMessage("⚠️ Walang data yung user na yan.", threadID, messageID);

    const user = data[mentionID];
    const rankName = ranks[user.level - 1] || `Rank ${user.level}`;
    const required = getRequiredXP(user.level);

    // send text then image separately
    await api.sendMessage(
      `📊 Rank Info for ${user.name}\n\n🏅 Level: ${user.level}\n⭐ XP: ${user.xp}/${required}\n🎖️ Rank: ${rankName}`,
      threadID,
      messageID
    );

    const imgUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard?name=${encodeURIComponent(user.name)}&userid=${mentionID}&currentLvl=${user.level}&currentRank=${encodeURIComponent(rankName)}&currentXP=${user.xp}&requiredXP=${required}`;
    try {
      const stream = await global.utils.getStreamFromURL(imgUrl);
      return api.sendMessage({ attachment: stream }, threadID);
    } catch (e) {
      return api.sendMessage("⚠️ (Rank card image failed to load)", threadID);
    }
  }

  // /rank (self)
  if (args.length === 0) {
    if (!data[senderID]) return api.sendMessage("⚠️ Wala ka pang XP data.", threadID, messageID);

    const user = data[senderID];
    const rankName = ranks[user.level - 1] || `Rank ${user.level}`;
    const required = getRequiredXP(user.level);

    // text then image
    await api.sendMessage(
      `📊 Rank Info for ${user.name}\n\n🏅 Level: ${user.level}\n⭐ XP: ${user.xp}/${required}\n🎖️ Rank: ${rankName}`,
      threadID,
      messageID
    );

    const imgUrl = `https://betadash-api-swordslush-production.up.railway.app/rankcard?name=${encodeURIComponent(user.name)}&userid=${senderID}&currentLvl=${user.level}&currentRank=${encodeURIComponent(rankName)}&currentXP=${user.xp}&requiredXP=${required}`;
    try {
      const stream = await global.utils.getStreamFromURL(imgUrl);
      return api.sendMessage({ attachment: stream }, threadID);
    } catch (e) {
      return api.sendMessage("⚠️ (Rank card image failed to load)", threadID);
    }
  }

  return api.sendMessage("⚠️ Usage: /rank | /rank @mention | /rank all", threadID, messageID);
};
