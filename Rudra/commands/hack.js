const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "hack",
  version: "1.5.0",
  hasPermssion: 0,
  credits: "You + ChatGPT",
  description: "Fun /hack @mention — sends attachment to group + PM to command user saying it's a prank",
  usages: "/hack @mention",
  cooldowns: 5,
  commandCategory: "fun"
};

async function getUserName(uid, api) {
  try {
    const info = await api.getUserInfo(uid);
    if (info && info[uid] && info[uid].name) return info[uid].name;
  } catch (e) {}
  return "User";
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, mentions, senderID } = event;

  if (!mentions || Object.keys(mentions).length === 0) {
    return api.sendMessage("❌ Usage: /hack @mention (please mention a user)", threadID, messageID);
  }

  // use first mentioned user
  const targetUid = Object.keys(mentions)[0];
  const targetName = (typeof mentions[targetUid] === "string" && mentions[targetUid]) ? mentions[targetUid] : await getUserName(targetUid, api);

  const apiBase = "https://betadash-api-swordslush-production.up.railway.app/hack";
  const apiUrl = `${apiBase}?name=${encodeURIComponent(targetName)}&uid=${encodeURIComponent(targetUid)}`;

  // prepare cache dir
  const cacheDir = path.join(__dirname, "..", "commands", "cache");
  await fs.ensureDir(cacheDir);
  const ts = Date.now();
  const tmpBase = path.join(cacheDir, `hack_${targetUid}_${ts}`);

  // helper: download remote url to filepath
  async function downloadUrlToFile(url, filepath) {
    const r = await axios.get(url, { responseType: "arraybuffer", maxRedirects: 5, timeout: 30000 });
    await fs.writeFile(filepath, r.data);
    return filepath;
  }

  try {
    // fetch API (arraybuffer to support binary or JSON)
    const resp = await axios.get(apiUrl, { responseType: "arraybuffer", maxRedirects: 5, timeout: 20000 });
    const contentType = (resp.headers["content-type"] || "").toLowerCase();

    // attachments array (streams) to include in public message
    const attachments = [];

    // If API returned JSON, parse and look for imageUrl/videoUrl
    if (contentType.includes("application/json") || contentType.includes("text/json")) {
      const jsonText = Buffer.from(resp.data).toString("utf8");
      let json;
      try {
        json = JSON.parse(jsonText);
      } catch (err) {
        console.error("hack: invalid JSON from API", err);
        return api.sendMessage("❌ API returned invalid JSON.", threadID, messageID);
      }

      // Prefer image first (user requested image). If both exist, include both.
      if (json.imageUrl) {
        try {
          const iPath = tmpBase + ".png";
          await downloadUrlToFile(json.imageUrl, iPath);
          attachments.push(fs.createReadStream(iPath));
        } catch (err) {
          console.error("hack: failed to download imageUrl", err.message);
        }
      }
      // include video if present (optional)
      if (json.videoUrl) {
        try {
          const vPath = tmpBase + ".mp4";
          await downloadUrlToFile(json.videoUrl, vPath);
          attachments.push(fs.createReadStream(vPath));
        } catch (err) {
          console.error("hack: failed to download videoUrl", err.message);
        }
      }

      // If no media fields found, fallback: treat as no-attachment case
      if (attachments.length === 0) {
        // Public message: mention the target (exact text required)
        const mentionTag = `@${targetName}`;
        const publicBody = `Tignan mo ang pm sinend ko ang password ni ${mentionTag}`;
        await api.sendMessage({ body: publicBody, mentions: [{ tag: targetName, id: targetUid }] }, threadID, messageID);

        // PM the command issuer that it's a prank
        try {
          await api.sendMessage("Gago it's a prank lang yon!", senderID);
        } catch (e) {
          console.warn("hack: failed to send PM to issuer:", e.message);
        }
        return;
      }
    } else {
      // Binary response directly from API: save it and treat accordingly (try to prefer image if content-type suggests)
      let ext = ".bin";
      if (contentType.includes("png")) ext = ".png";
      else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg";
      else if (contentType.includes("gif")) ext = ".gif";
      else if (contentType.includes("mp4")) ext = ".mp4";
      else if (contentType.includes("webm")) ext = ".webm";

      const fpath = tmpBase + ext;
      await fs.writeFile(fpath, resp.data);
      attachments.push(fs.createReadStream(fpath));
    }

    // Build public message body with mention tag (exact required text)
    const mentionTag = `@${targetName}`;
    const publicBody = `Check pm, sinend ko ang password ni ${mentionTag}`;
    const mentionsArray = [{ tag: targetName, id: targetUid }];

    // Try to send one message with attachments + exact public text
    try {
      await api.sendMessage({
        body: publicBody,
        attachment: attachments.length === 1 ? attachments[0] : attachments,
        mentions: mentionsArray
      }, threadID, messageID);
    } catch (err) {
      // If platform rejects multiple attachments or combined send, fallback:
      console.warn("hack: sending attachments+text failed, falling back to send text then attachments:", err.message);
      await api.sendMessage({ body: publicBody, mentions: mentionsArray }, threadID, messageID);
      for (const att of attachments) {
        try {
          await api.sendMessage({ attachment: att }, threadID);
        } catch (e) {
          console.error("hack: fallback send attachment failed", e.message);
        }
      }
    }

    // Send PM only to the command issuer indicating it's a prank
    try {
      await api.sendMessage("Gago it's a prank lang yon!", senderID);
    } catch (e) {
      console.warn("hack: failed to send PM to issuer:", e.message);
    }

    // cleanup cached files
    attachments.forEach(a => {
      try {
        if (a && a.path && fs.existsSync(a.path)) fs.unlinkSync(a.path);
      } catch (e) { /* ignore */ }
    });

  } catch (err) {
    console.error("hack: API call/download error:", err.message);
    return api.sendMessage("❌ Failed to call hack API. Please try again later.", threadID, messageID);
  }
};
