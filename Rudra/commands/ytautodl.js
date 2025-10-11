const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "ytautodl",
  version: "3.0.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT + Keithkeizzah",
  description: "Auto or manual YouTube MP4 downloader using Keith API",
  commandCategory: "media",
  usages: "/ytautodl [link] | /ytautodl auto on | off",
  cooldowns: 0,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // ⚙️ Enable / disable auto mode
  if (args[0] === "auto") {
    const option = args[1]?.toLowerCase();
    if (option === "on") {
      await setData(`ytautodl/${threadID}`, { enabled: true });
      return api.sendMessage("✅ Auto YouTube downloader: ON", threadID, messageID);
    } else if (option === "off") {
      await setData(`ytautodl/${threadID}`, { enabled: false });
      return api.sendMessage("❌ Auto YouTube downloader: OFF", threadID, messageID);
    } else {
      return api.sendMessage("📘 Usage: /ytautodl auto on | off", threadID, messageID);
    }
  }

  const link = args[0];
  if (!link || !link.includes("youtu"))
    return api.sendMessage("📘 Usage:\n/ytautodl [YouTube link]\n/ytautodl auto on | off", threadID, messageID);

  api.sendMessage("⏳ Downloading YouTube video… please wait.", threadID, messageID);
  return downloadYouTube(api, event, link);
};

// 🧠 Auto-detect YouTube link in chat
module.exports.handleEvent = async function ({ api, event }) {
  const { body, threadID, messageID } = event;
  if (!body) return;

  const config = await getData(`ytautodl/${threadID}`);
  if (!config?.enabled) return;

  const match = body.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+/);
  if (!match) return;

  const link = match[0];
  api.sendMessage("⏳ Downloading YouTube video… please wait.", threadID, messageID);
  return downloadYouTube(api, event, link);
};

// 🎬 Main YouTube Downloader
async function downloadYouTube(api, event, url) {
  const { threadID, messageID } = event;

  try {
    const apiUrl = `https://apis-keith.vercel.app/download/ytmp4?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, { timeout: 25000 });

    if (!data?.status || !data.result?.url)
      return api.sendMessage("⚠️ Failed to fetch YouTube video.", threadID, messageID);

    const videoUrl = data.result.url;
    const title = data.result.filename || "YouTube Video";

    // 🧩 Temporary path
    const tempDir = path.join(__dirname, "..", "cache");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, `yt_${Date.now()}.mp4`);

    // 📥 Stream video
    const videoStream = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      maxRedirects: 5,
      timeout: 60000,
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tempPath);
      videoStream.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // ✅ Send result
    await new Promise((resolve) => {
      api.sendMessage(
        {
          body: `🎬 ${title}\n\n📺 From YouTube`,
          attachment: fs.createReadStream(tempPath),
        },
        threadID,
        () => {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          resolve();
        }
      );
    });
  } catch (err) {
    console.error("❌ YouTube download error:", err);
    api.sendMessage("⚠️ Failed to download YouTube video.", threadID, messageID);
  }
}