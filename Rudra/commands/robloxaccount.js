const axios = require("axios");

module.exports.config = {
  name: "robloxaccount",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Get Roblox account info",
  usePrefix: true,
  commandCategory: "utility",
  usages: "/robloxaccount <username>",
  cooldowns: 5,
};

function formatDatePH(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-PH", { timeZone: "Asia/Manila", hour12: false });
  } catch {
    return isoStr;
  }
}

function presenceType(type) {
  switch (type) {
    case 0: return "🌐 Website";
    case 1: return "🟢 Online";
    case 2: return "🎮 In Game";
    case 3: return "🛠️ In Studio";
    default: return `❔ Unknown (${type})`;
  }
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const username = args[0];
  if (!username) {
    return api.sendMessage("⚠️ Usage: /robloxaccount <username>", threadID, messageID);
  }

  try {
    const url = `https://ccprojects-apis.ratbu.xyz/api/robloxstalk?user=${encodeURIComponent(username)}`;
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data;

    if (!data || !data.username) {
      return api.sendMessage("❌ User not found.", threadID, messageID);
    }

    // Styled UI
    const msg = `
🎮 Roblox Account Lookup 🎮
────────────────────────────
👤 Username: ${data.username}
📛 Display Name: ${data.displayName}
🆔 User ID: ${data.userId}

📝 Bio: ${data.description || "—"}
🚫 Banned: ${data.isBanned ? "Yes ❌" : "No ✅"}
✔️ Verified Badge: ${data.hasVerifiedBadge ? "Yes 💠" : "No"}

📅 Created: ${formatDatePH(data.accountCreated)}

👥 Social:
   • Friends: ${data.social?.friendsCount ?? 0}
   • Followers: ${data.social?.followersCount ?? 0}
   • Following: ${data.social?.followingCount ?? 0}

📍 Presence:
   • Last Location: ${data.presence?.lastLocation || "Unknown"}
   • Status: ${presenceType(data.presence?.type)}

👥 Groups: ${data.groups?.length || 0}
────────────────────────────`;

    api.sendMessage(msg, threadID, messageID);
  } catch (err) {
    console.error(err);
    api.sendMessage("⚠️ Failed to fetch Roblox account info. Try again later.", threadID, messageID);
  }
};
