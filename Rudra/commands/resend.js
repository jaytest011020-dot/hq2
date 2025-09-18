module.exports.config = {
  name: "resend",
  version: "2.4.0",
  hasPermssion: 1,
  credits: "ryuko + fixed by ChatGPT + improved by Jaylord",
  description: "Resend unsent messages (text + attachments)",
  commandCategory: "system",
  usages: "/resend",
  cooldowns: 0,
  dependencies: {
    "fs-extra": "",
    "axios": ""
  }
};

module.exports.handleEvent = async function ({ event, api, Users }) {
  const axios = global.nodemodule["axios"];
  const { writeFileSync, createReadStream, unlinkSync } = global.nodemodule["fs-extra"];
  const { messageID, senderID, threadID, body } = event;

  if (!global.logMessage) global.logMessage = new Map();
  if (!global.data.botID) global.data.botID = api.getCurrentUserID();

  // ✅ Default ON kung walang setting
  const thread = global.data.threadData.get(parseInt(threadID)) || {};
  if (typeof thread["resend"] === "undefined") thread["resend"] = true;
  if (thread["resend"] === false) return;
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

    // ✅ Prefer event.senderName if available
    let name = event.senderName;
    if (!name) {
      try {
        name = await Users.getNameUser(senderID);
      } catch (e) {
        name = "Unknown User";
      }
    }

    // case: no attachment
    if (!getMsg.attachment || getMsg.attachment.length === 0) {
      return api.sendMessage(
        `${name} just unsent a message:\n${getMsg.msgBody || "[empty]"}`,
        threadID
      );
    }

    // case: with attachment(s)
    let msg = {
      body: `${name} just unsent ${getMsg.attachment.length} attachment(s)${
        getMsg.msgBody ? `\n📝 Content: ${getMsg.msgBody}` : ""
      }`,
      attachment: [],
      mentions: [{ tag: name, id: senderID }]
    };

    let num = 0;
    for (let att of getMsg.attachment) {
      try {
        num++;
        const ext = att.url.split(".").pop().split("?")[0] || "dat"; // default extension
        const filePath = __dirname + `/cache/resend_${Date.now()}_${num}.${ext}`;
        const response = await axios.get(att.url, { responseType: "arraybuffer" });
        writeFileSync(filePath, Buffer.from(response.data));
        msg.attachment.push(createReadStream(filePath));

        // auto cleanup
        setTimeout(() => {
          try { unlinkSync(filePath); } catch (e) {}
        }, 60 * 1000);

      } catch (e) {
        console.error("❌ Error downloading attachment:", e.message);
      }
    }

    return api.sendMessage(msg, threadID);
  }
};

module.exports.run = async function ({ api, event, Threads }) {
  const { threadID, messageID } = event;

  let data = (await Threads.getData(threadID)).data || {};
  if (typeof data["resend"] === "undefined") data["resend"] = true; // ✅ default ON

  // toggle
  data["resend"] = !data["resend"];

  await Threads.setData(parseInt(threadID), { data });
  global.data.threadData.set(parseInt(threadID), data);

  return api.sendMessage(
    `🔄 Resend is now ${(data["resend"] === true) ? "✅ ON" : "❌ OFF"}.`,
    threadID,
    messageID
  );
};
