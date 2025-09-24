const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { setData, getData } = require("../../database.js");

const OWNER_UID = "61559999326713"; // Owner UID
const cooldowns = new Map();

module.exports.config = {
  name: "music",
  version: "2.6.0",
  hasPermssion: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Search and play full music with VIP/GC admin only toggle",
  commandCategory: "music",
  usages: "/music <song name> | /music on | /music off",
  cooldowns: 5,
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID, senderID } = event;
  const command = args[0] ? args[0].toLowerCase() : "";

  // --- Maintenance check ---
  const status = await getData("/maintenance");
  if (status?.enabled) {
    const imgPath = path.join(__dirname, "cache", "maintenance.jpeg");
    return api.sendMessage(
      {
        body: "🚧 Bot is under MAINTENANCE. Music is temporarily disabled.",
        attachment: fs.existsSync(imgPath) ? fs.createReadStream(imgPath) : null
      },
      threadID,
      messageID
    );
  }

  // --- VIP / GC Admin Access Check ---
  const vips = (await getData("/vip")) || [];
  const isVIP = vips.find(v => v.uid === senderID);
  const threadInfo = await api.getThreadInfo(threadID);
  const isAdmin = threadInfo.adminIDs.some(a => a.id == senderID);
  const isOwner = senderID === OWNER_UID;

  if (!isVIP && !isAdmin && !isOwner) {
    return api.sendMessage("❌ Only VIPs, GC admins, or bot owner can use this command.", threadID, messageID);
  }

  // --- Handle /music on/off toggle ---
  if (command === "on" || command === "off") {
    if (!isAdmin && !isOwner) {
      return api.sendMessage("❌ Only GC admins or owner can toggle the music command.", threadID, messageID);
    }
    const enabled = command === "on";
    await setData(`music/status/${threadID}`, { enabled });
    return api.sendMessage(
      `🎶 Music system is now ${enabled ? "✅ ENABLED" : "❌ DISABLED"} in this group.`,
      threadID,
      messageID
    );
  }

  // --- Check if music system is enabled ---
  const musicStatus = (await getData(`music/status/${threadID}`)) || { enabled: true };
  if (!musicStatus.enabled) {
    return api.sendMessage("❌ Music command is currently disabled by GC admin.", threadID, messageID);
  }

  // --- Cooldown ---
  const now = Date.now();
  const userCooldown = cooldowns.get(senderID) || 0;
  const remaining = Math.ceil((userCooldown - now) / 1000);
  if (remaining > 0) {
    return api.sendMessage(`❗ Please wait ${remaining}s before using /music again.`, threadID, messageID);
  }
  cooldowns.set(senderID, now + 60 * 1000);

  // --- Music search ---
  const query = args.join(" ");
  if (!query) return api.sendMessage("❗ Please provide a song name.", threadID, messageID);

  try {
    api.sendMessage("⏳ Searching & loading your music...", threadID, async (err, info) => {
      try {
        const apiURL = `https://betadash-api-swordslush-production.up.railway.app/sc?search=${encodeURIComponent(query)}`;
        const tmpPath = path.join(__dirname, "cache", `music_${Date.now()}.mp3`);

        const response = await axios.get(apiURL, {
          responseType: "arraybuffer",
          timeout: 20000
        });

        const contentType = response.headers["content-type"] || "";

        // ✅ If JSON error instead of audio
        if (!contentType.includes("audio")) {
          try {
            const errorText = Buffer.from(response.data).toString();
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              throw new Error(errorJson.error);
            }
          } catch {
            throw new Error("Invalid response from music API.");
          }
        }

        // ✅ Save audio file
        fs.writeFileSync(tmpPath, Buffer.from(response.data, "binary"));

        api.unsendMessage(info.messageID);

        api.sendMessage(
          {
            body: `🎶 𝗠𝘂𝘀𝗶𝗰 𝗣𝗹𝗮𝘆𝗲𝗿\n\n🎵 Title: ${query}\n👤 Artist: Unknown\n⏱ Duration: Unknown`,
            attachment: fs.createReadStream(tmpPath),
          },
          threadID,
          () => fs.unlinkSync(tmpPath),
          messageID
        );
      } catch (err) {
        console.error("❌ Music Command Error:", err.message || err);
        api.sendMessage(`⚠️ ${err.message || "Error fetching music. Try another title."}`, threadID, messageID);
      }
    });
  } catch (err) {
    console.error("❌ Music Command Error:", err.message || err);
    api.sendMessage(`⚠️ ${err.message || "Error fetching music."}`, threadID, messageID);
  }
};
