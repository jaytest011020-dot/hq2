const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "fbautodl",
  version: "3.0.0",
  hasPermission: 0,
  credits: "Jaylord La Peña + ChatGPT + Keithkeizzah",
  description: "Download Facebook videos (auto or manual)",
  commandCategory: "media",
  usages: "/fbdown [link] | /fbdown auto on | off",
  cooldowns: 0,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  // ⚙️ Enable or disable auto mode
  if (args[0] === "auto") {
    const option = args[1]?.toLowerCase();
    if (option === "on") {
      await setData(`fbdown/${threadID}`, { enabled: true });
      return api.sendMessage("✅ Auto Facebook downloader: ON", threadID, messageID);
    } else if (option === "off") {
      await setData(`fbdown/${threadID}`, { enabled: false });
      return api.sendMessage("❌ Auto Facebook downloader: OFF", threadID, messageID);
    } else {
      return api.sendMessage("📘 Usage: /fbdown auto on | off", threadID, messageID);
    }
  }

  const link = args[0];
  if (!link || !link.includes("facebook.com"))
    return api.sendMessage("📘 Usage:\n/fbdown [Facebook video link]\n/fbdown auto on | off", threadID, messageID);

  api.sendMessage("⏳ Downloading Facebook video… please wait.", threadID, messageID);
  return downloadFacebook(api, event, link);
};

// 🧠 Auto-detect FB link in messages
module.exports.handleEvent = async function ({ api, event }) {
  const { body, threadID, messageID } = event;
  if (!body) return;

  const config = await getData(`fbdown/${threadID}`);
  if (!config?.enabled) return;

  const match = body.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s]+/);
  if (!match) return;

  const link = match[0];
  api.sendMessage("⏳ Downloading Facebook video… please wait.", threadID, messageID);
  return downloadFacebook(api, event, link);
};

// 📥 Main FB Downloader
async function downloadFacebook(api, event, url) {
  const { threadID, messageID } = event;

  try {
    const apiUrl = `https://apis-keith.vercel.app/download/fbdown?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, { timeout: 20000 });

    if (!data?.status || !data.result?.media?.hd)
      return api.sendMessage("⚠️ Failed to fetch Facebook video.", threadID, messageID);

    const videoUrl = data.result.media.hd;
    const title = data.result.title?.replace(/&#x[\da-f]+;/gi, "") || "Facebook Video";

    // 🧩 Temporary path
    const tempDir = path.join(__dirname, "..", "cache");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, `fb_${Date.now()}.mp4`);

    // 🎬 Stream download
    const videoStream = await axios({
      url: videoUrl,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "*/*",
        Referer: "https://www.facebook.com/",
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
          body: `🎥 ${title}\n\n📘 From Facebook`,
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
    console.error("❌ Facebook download error:", err);
    api.sendMessage("⚠️ Failed to download Facebook video.", threadID, messageID);
  }
}