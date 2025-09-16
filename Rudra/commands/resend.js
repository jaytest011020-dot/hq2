const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// 🔹 Storage ng lahat ng messages
if (!global.logMessage) global.logMessage = new Map();

module.exports.config = {
  name: "resend",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Resend message when user unsends",
  commandCategory: "system",
  usages: "",
  cooldowns: 0,
};

module.exports.handleEvent = async ({ api, event }) => {
  const { threadID, messageID, type, body, attachments, senderID } = event;

  // 🔹 Log every message (text or with attachment)
  if (type === "message") {
    try {
      const senderInfo = await api.getUserInfo(senderID);
      const senderName = senderInfo[senderID]?.name || "Unknown";

      global.logMessage.set(messageID, {
        senderID,
        senderName,
        msgBody: body,
        attachments: attachments || [],
      });
    } catch (e) {
      console.error("❌ Error getting user info:", e);
    }
  }

  // 🔹 Handle unsend
  if (type === "message_unsend") {
    const getMsg = global.logMessage.get(messageID);
    if (!getMsg) return;

    const senderName = getMsg.senderName || "Friend";
    const senderUID = getMsg.senderID;
    const oldAttachments = Array.isArray(getMsg.attachments) ? getMsg.attachments : [];

    if (oldAttachments.length === 0) {
      return api.sendMessage(
        `${senderName} unsent a message.\n\nContent: ${getMsg.msgBody || "No text"}`,
        threadID
      );
    } else {
      let num = 0;
      let msg = {
        body: `${senderName} unsent a message.\n${oldAttachments.length} Attachment(s)${
          getMsg.msgBody ? `\n\nContent: ${getMsg.msgBody}` : ""
        }`,
        attachment: [],
        mentions: [{ tag: senderName, id: senderUID, fromIndex: 0 }],
      };

      for (let i of oldAttachments) {
        try {
          num += 1;
          if (!i || !i.url) continue;

          const url = i.url;
          const ext = url.split(".").pop().split("?")[0] || "jpg";

          const cacheDir = path.join(__dirname, "cache");
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

          const pathFile = path.join(cacheDir, `resend_${Date.now()}_${num}.${ext}`);
          const data = (await axios.get(url, { responseType: "arraybuffer" })).data;

          fs.writeFileSync(pathFile, Buffer.from(data, "binary"));
          msg.attachment.push(fs.createReadStream(pathFile));

          msg.attachment[msg.attachment.length - 1].on("close", () => {
            if (fs.existsSync(pathFile)) fs.unlinkSync(pathFile);
          });
        } catch (e) {
          console.error("❌ Error downloading attachment:", e);
        }
      }

      api.sendMessage(msg, threadID, (err) => {
        if (err) console.error("❌ Error sending resend message:", err);
      });
    }
  }
};
