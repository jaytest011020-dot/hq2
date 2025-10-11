const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "tiktokautodl",
  version: "5.0.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT",
  description: "Download TikTok videos (mp4HD) using stream & temp file for stability",
  commandCategory: "media",
  usages: "/tiktok [link] | /tiktok auto on | off",
  cooldowns: 0,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

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

  const link = args[0];
  if (!link || !link.includes("tiktok.com"))
    return api.sendMessage("📘 Usage:\n/tiktok [TikTok link]\n/tiktok auto on | off", threadID, messageID);

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
    const apiUrl = `https://apis-keith.vercel.app/download/tiktokdl3?url=${encodeURIComponent(resolved)}`;
    const { data } = await axios.get(apiUrl, { timeout: 20000 });

    if (!data?.status || !data.result?.downloadUrls)
      return api.sendMessage("⚠️ Failed to fetch TikTok video.", threadID, messageID);

    const videoUrl =
      data.result.downloadUrls.mp4HD?.[0] ||
      data.result.downloadUrls.mp4?.[0] ||
      data.result.downloadUrls.watermark?.[0];

    if (!videoUrl)
      return api.sendMessage("⚠️ No downloadable link found.", threadID, messageID);

    const title = data.result.title || "TikTok Video";

    // Create temp directory
    const tempDir = path.join(__dirname, "..", "cache");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, `tiktok_${Date.now()}.mp4`);

    // Download video as stream
    const videoStream = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Referer: "https://www.tiktok.com/",
        Accept: "*/*",
      },
      maxRedirects: 5,
      timeout: 30000,
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tempPath);
      videoStream.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Send video
    await new Promise((resolve) => {
      api.sendMessage(
        { body: `🎬 ${title}`, attachment: fs.createReadStream(tempPath) },
        threadID,
        () => {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          resolve();
        }
      );
    });
  } catch (err) {
    console.error("❌ TikTok download error:", err);
    api.sendMessage("⚠️ Failed to download TikTok video.", threadID, messageID);
  }
}