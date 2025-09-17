module.exports.config = {
  name: "resend",
  version: "2.1.0",
  hasPermssion: 1,
  credits: "ryuko + fixed by ChatGPT",
  description: "Resend unsent messages (text + attachments)",
  commandCategory: "system", // 🔑 tama na para gumana sa help.js
  usages: "/resend",
  cooldowns: 0,
  dependencies: {
    "fs-extra": "",
    "axios": ""
  }
};

module.exports.handleEvent = async function ({ event, api, Users }) {
  const axios = global.nodemodule["axios"];
  const { writeFileSync, createReadStream } = global.nodemodule["fs-extra"];
  const { messageID, senderID, threadID, body } = event;

  if (!global.logMessage) global.logMessage = new Map();
  if (!global.data.botID) global.data.botID = api.getCurrentUserID();

  const thread = global.data.threadData.get(parseInt(threadID)) || {};
  if (typeof thread["resend"] !== "undefined" && thread["resend"] === false) return;
  if (senderID == global.data.botID) return;

  // Save sent messages
  if (event.type !== "message_unsend") {
    global.logMessage.set(messageID, {
      msgBody: body || "",
      attachment: event.attachments || []
    });
  }

  // Handle unsent messages
  if (event.type === "message_unsend") {
    const getMsg = global.logMessage.get(messageID);
    if (!getMsg) return;

    const name = await Users.getNameUser(senderID);

    if (!getMsg.attachment || getMsg.attachment.length === 0) {
      return api.sendMessage(
        `${name} just unsent a message:\n${getMsg.msgBody || "[empty]"}`,
        threadID
      );
    } else {
      let msg = {
        body: `${name} just unsent ${getMsg.attachment.length} attachment(s)${
          getMsg.msgBody ? `\nContent: ${getMsg.msgBody}` : ""
        }`,
        attachment: [],
        mentions: [{ tag: name, id: senderID }]
      };

      let num = 0;
      for (let att of getMsg.attachment) {
        num++;
        const ext = att.url.split(".").pop().split("?")[0]; // file extension
        const path = __dirname + `/cache/${num}.${ext}`;
        const data = (await axios.get(att.url, { responseType: "arraybuffer" })).data;
        writeFileSync(path, Buffer.from(data, "utf-8"));
        msg.attachment.push(createReadStream(path));
      }

      return api.sendMessage(msg, threadID);
    }
  }
};

module.exports.run = async function ({ api, event, Threads }) {
  const { threadID, messageID } = event;

  let data = (await Threads.getData(threadID)).data || {};
  if (typeof data["resend"] === "undefined" || data["resend"] === false) {
    data["resend"] = true;
  } else {
    data["resend"] = false;
  }

  await Threads.setData(parseInt(threadID), { data });
  global.data.threadData.set(parseInt(threadID), data);

  return api.sendMessage(
    `🔄 Resend is now ${(data["resend"] === true) ? "✅ ON" : "❌ OFF"}.`,
    threadID,
    messageID
  );
};
