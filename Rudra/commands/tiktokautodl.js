const https = require("https");
const { getData, setData } = require("../../database.js");

// Cooldown system
const cooldown = new Map();

module.exports.config = {
  name: "tiktok",
  version: "3.0.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Auto-download TikTok videos or toggle the feature per GC",
  commandCategory: "media",
  usages: "/tiktok auto on | off | /tiktok [link]",
  cooldowns: 3
};

// 🧠 Main command handler
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // Toggle auto-download
  if (args[0] === "auto") {
    const option = args[1]?.toLowerCase();
    if (option === "on") {
      await setData(`tiktok/${threadID}`, { enabled: true });
      return api.sendMessage("✅ TikTok auto-downloader turned ON for this GC.", threadID, messageID);
    } else if (option === "off") {
      await setData(`tiktok/${threadID}`, { enabled: false });
      return api.sendMessage("❌ TikTok auto-downloader turned OFF for this GC.", threadID, messageID);
    } else {
      return api.sendMessage("📘 Usage: /tiktok auto on | off", threadID, messageID);
    }
  }

  // Manual download using command
  const link = args[0];
  if (!link || !link.includes("tiktok.com"))
    return api.sendMessage("📘 Usage:\n/tiktok [tiktok link]\n/tiktok auto on | off", threadID, messageID);

  return handleTikTok(api, event, link);
};

// 📡 Message listener — stays in this same module
module.exports.handleEvent = async function ({ api, event }) {
  const { body, threadID, senderID, messageID } = event;
  if (!body) return;

  const config = await getData(`tiktok/${threadID}`);
  if (!config?.enabled) return; // Only active if auto mode is ON

  // Detect TikTok link
  const match = body.match(/https?:\/\/(?:www\.)?tiktok\.com\/[^\s]+/);
  if (!match) return;

  // Prevent spam (5 mins per user)
  const now = Date.now();
  if (cooldown.has(senderID) && now - cooldown.get(senderID) < 5 * 60 * 1000) return;
  cooldown.set(senderID, now);

  await handleTikTok(api, event, match[0]);
};

// 🎥 Download handler
async function handleTikTok(api, event, url) {
  const apiUrl = `https://apis-keith.vercel.app/download/tiktokdl3?url=${encodeURIComponent(url)}`;

  https.get(apiUrl, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        const videoUrl = json?.result?.downloadUrls?.mp4HD?.[0];
        const title = json?.result?.title || "TikTok Video";

        if (!videoUrl) return api.sendMessage("⚠️ Failed to get HD video link.", event.threadID);

        // Download the actual video
        https.get(videoUrl, (videoRes) => {
          const chunks = [];
          videoRes.on("data", chunk => chunks.push(chunk));
          videoRes.on("end", () => {
            const buffer = Buffer.concat(chunks);
            api.sendMessage({
              body: `🎬 ${title}`,
              attachment: buffer
            }, event.threadID, event.messageID);
          });
        }).on("error", () => {
          api.sendMessage("⚠️ Error downloading video.", event.threadID);
        });
      } catch (err) {
        console.error(err);
        api.sendMessage("⚠️ Error parsing TikTok API response.", event.threadID);
      }
    });
  }).on("error", () => {
    api.sendMessage("⚠️ Unable to connect to TikTok API.", event.threadID);
  });
}