const fs = global.nodemodule["fs-extra"];
const axios = global.nodemodule["axios"];
const path = require("path");

module.exports.config = {
  name: "resend",
  version: "2.2.0",
  hasPermssion: 1,
  credits: "Thọ & Mod By DuyVuong + ChatGPT (fixed)",
  description: "Resends Messages with sender name",
  usePrefix: true,
  commandCategory: "system",
  usages: "resend",
  cooldowns: 0,
  hide: true,
  dependencies: { "fs-extra": "", axios: "" },
};

module.exports.handleEvent = async function ({ event, api, Users }) {
  let { messageID, senderID, threadID, body: content } = event;

  if (!global.logMessage) global.logMessage = new Map();
  if (!global.data.botID) global.data.botID = api.getCurrentUserID();

  // Skip messages from bot itself
  if (senderID == global.data.botID) return;

  // Fetch username (with cache)
  let name = global.data.userName.get(senderID);
  if (!name) {
    const userInfo = await api.getUserInfo(senderID);
    name = Object.values(userInfo)[0]?.name || "Friend";
    global.data.userName.set(senderID, name);
  }

  // Save message (non-unsend)
  if (event.type !== "message_unsend") {
    global.logMessage.set(messageID, {
      msgBody: content,
      attachment: event.attachments || [],
      senderName: name,
      senderID: senderID,
    });
  }

  // Handle unsend
  if (event.type === "message_unsend") {
    const getMsg = global.logMessage.get(messageID);
    if (!getMsg) return;

    const senderName = getMsg.senderName || "Friend";
    const senderID = getMsg.senderID;

    if (!getMsg.attachment || getMsg.attachment.length === 0) {
      return api.sendMessage(
        `${senderName} unsent a message.\n\nContent: ${getMsg.msgBody || "No text"}`,
        threadID
      );
    } else {
      let num = 0;
      let msg = {
        body: `${senderName} unsent a message.\n${getMsg.attachment.length} Attachment(s)${
          getMsg.msgBody ? `\n\nContent: ${getMsg.msgBody}` : ""
        }`,
        attachment: [],
        mentions: [{ tag: senderName, id: senderID, fromIndex: 0 }],
      };

      for (let i of getMsg.attachment) {
        try {
          num += 1;

          // ✅ Skip kung walang URL
          if (!i || !i.url) continue;

          // Get extension from URL
          const url = i.url;
          const ext = url.split(".").pop().split("?")[0] || "jpg";

          // ✅ Save sa commands/cache/
          const cacheDir = path.join(__dirname, "cache");
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

          const pathFile = path.join(cacheDir, `resend_${Date.now()}_${num}.${ext}`);

          // Download file
          const data = (await axios.get(url, { responseType: "arraybuffer" })).data;
          fs.writeFileSync(pathFile, Buffer.from(data, "binary"));
          msg.attachment.push(fs.createReadStream(pathFile));

          // ✅ Auto delete file after send
          msg.attachment[msg.attachment.length - 1].on("close", () => {
            if (fs.existsSync(pathFile)) fs.unlinkSync(pathFile);
          });
        } catch (e) {
          console.error("Error downloading attachment:", e);
        }
      }

      api.sendMessage(msg, threadID);
    }
  }
};

module.exports.run = async function ({ api, event, Threads }) {
  const { threadID, messageID } = event;

  const data = (await Threads.getData(threadID)).data;

  if (typeof data["resend"] === "undefined" || data["resend"] === false) data["resend"] = true;
  else data["resend"] = false;

  await Threads.setData(parseInt(threadID), { data });
  global.data.threadData.set(parseInt(threadID), data);

  return api.sendMessage(
    `Resend feature is now ${data["resend"] ? "ON ✅" : "OFF ❌"} successfully!`,
    threadID,
    messageID
  );
};
