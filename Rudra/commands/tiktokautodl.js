const https = require("https");
const { getData, setData } = require("../../database.js");
const axios = require("axios");

module.exports.config = {
  name: "tiktok",
  version: "3.2.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Auto-download TikTok videos (supports short vt.tiktok.com links)",
  commandCategory: "media",
  usages: "/tiktok auto on | off | /tiktok [link]",
  cooldowns: 3
};

// 🧠 Main command handler
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // 🔘 Toggle per-GC
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

  // 🔗 Manual download
  const link = args[0];
  if (!link || !link.includes("tiktok.com"))
    return api.sendMessage("📘 Usage:\n/tiktok [tiktok link]\n/tiktok auto on | off", threadID, messageID);

  return handleTikTok(api, event, link);
};

// 🧩 Detect TikTok link automatically (if auto mode ON)
module.exports.handleEvent = async function ({ api, event }) {
  const { body, threadID, messageID } = event;
  if (!body) return;

  const config = await getData(`tiktok/${threadID}`);
  if (!config?.enabled) return;

  const match = body.match(/https?:\/\/(?:vt|www)\.tiktok\.com\/[^\s]+/);
  if (!match) return;

  const link = match[0];
  await handleTikTok(api, event, link);
};

// 🎥 Function to fetch & send TikTok video
async function handleTikTok(api, event, url) {
  const { threadID, messageID } = event;

  try {
    // Resolve short vt.tiktok.com links
    if (url.includes("vt.tiktok.com")) {
      const resolved = await axios.head(url, { maxRedirects: 5 });
      url = resolved?.request?.res?.responseUrl || url;
    }

    const apiUrl = `https://apis-keith.vercel.app/download/tiktokdl3?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, { timeout: 20000 });

    const videoUrl = data?.result?.downloadUrls?.mp4HD?.[0];
    const title = data?.result?.title || "TikTok Video";

    if (!videoUrl) {
      return api.sendMessage("⚠️ Couldn’t find HD video link from TikTok.", threadID, messageID);
    }

    // Download video as buffer
    const videoBuffer = (await axios.get(videoUrl, { responseType: "arraybuffer" })).data;

    api.sendMessage(
      {
        body: `🎬 ${title}`,
        attachment: Buffer.from(videoBuffer)
      },
      threadID,
      messageID
    );
  } catch (err) {
    console.error("❌ TikTok download error:", err.message);
    api.sendMessage("⚠️ Failed to fetch or download TikTok video.", threadID, messageID);
  }
}