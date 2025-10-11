const axios = require("axios");
const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "tiktokautodl",
  version: "4.0.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Download TikTok videos (mp4HD) or enable auto-detect",
  commandCategory: "media",
  usages: "/tiktok [link] | /tiktok auto on | off",
  cooldowns: 0,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // Toggle on/off for GC
  if (args[0] === "auto") {
    const option = args[1]?.toLowerCase();
    if (option === "on") {
      await setData(`tiktok/${threadID}`, { enabled: true });
      return api.sendMessage("✅ Auto TikTok downloader: ON", threadID, messageID);
    } else if (option === "off") {
      await setData(`tiktok/${threadID}`, { enabled: false });
      return api.sendMessage("❌ Auto TikTok downloader: OFF", threadID, messageID);
    } else {
      return api.sendMessage("📘 Usage: /tiktok auto on | off", threadID, messageID);
    }
  }

  // Manual download
  const link = args[0];
  if (!link || !link.includes("tiktok.com"))
    return api.sendMessage("📘 Usage:\n/tiktok [tiktok link]\n/tiktok auto on | off", threadID, messageID);

  api.sendMessage("⏳ Downloading TikTok video… please wait.", threadID, messageID);
  return downloadTikTok(api, event, link);
};

module.exports.handleEvent = async function ({ api, event }) {
  const { body, threadID, messageID } = event;
  if (!body) return;

  const config = await getData(`tiktok/${threadID}`);
  if (!config?.enabled) return;

  const match = body.match(/https?:\/\/(?:vt|www)\.tiktok\.com\/[^\s]+/);
  if (!match) return;

  const link = match[0];
  api.sendMessage("⏳ Downloading TikTok video… please wait.", threadID, messageID);
  return downloadTikTok(api, event, link);
};

async function resolveTikTokLink(url) {
  try {
    const res = await axios.head(url, { maxRedirects: 5 });
    return res?.request?.res?.responseUrl || url;
  } catch {
    return url;
  }
}

async function downloadTikTok(api, event, url) {
  const { threadID, messageID } = event;

  try {
    const resolved = await resolveTikTokLink(url);

    // Keith API
    const apiUrl = `https://apis-keith.vercel.app/download/tiktokdl3?url=${encodeURIComponent(resolved)}`;
    const { data } = await axios.get(apiUrl, { timeout: 20000 });

    if (!data.status || !data.result?.downloadUrls?.mp4HD?.[0])
      return api.sendMessage("⚠️ Could not find HD video link.", threadID, messageID);

    const videoUrl = data.result.downloadUrls.mp4HD[0];
    const title = data.result.title || "TikTok Video";

    const videoBuffer = (await axios.get(videoUrl, { responseType: "arraybuffer" })).data;

    api.sendMessage(
      {
        body: `🎬 ${title}`,
        attachment: Buffer.from(videoBuffer),
      },
      threadID,
      messageID
    );
  } catch (err) {
    console.error("❌ TikTok download error:", err);
    api.sendMessage("⚠️ Failed to fetch or download TikTok video.", threadID, messageID);
  }
}