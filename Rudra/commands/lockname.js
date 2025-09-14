const fs = require("fs");

module.exports.config = {
  name: "lockgroup",
  version: "1.0.1",
  role: 2,
  author: "ChatGPT",
  description: "Auto-restore group name at image kapag binago",
  usages: `
    /lockgroup name   → i-lock ang kasalukuyang group name
    /lockgroup image  → i-lock ang kasalukuyang group image
    /lockgroup unlock → alisin ang lahat ng lock (name at image)
  `,
  cooldowns: 5,
};

let lockedName = {};
let lockedImage = {};

module.exports.run = async ({ api, event, args }) => {
  if (args[0] === "name") {
    lockedName[event.threadID] = event.threadName;
    return api.sendMessage(`🔒 Group name locked: ${event.threadName}`, event.threadID);
  }
  if (args[0] === "image") {
    try {
      const threadInfo = await api.getThreadInfo(event.threadID);
      if (threadInfo.imageSrc) {
        lockedImage[event.threadID] = threadInfo.imageSrc;
        return api.sendMessage(`🖼️ Group image locked.`, event.threadID);
      } else {
        return api.sendMessage(`⚠️ Walang nakaset na group image.`, event.threadID);
      }
    } catch (e) {
      return api.sendMessage(`❌ Error getting image: ${e.message}`, event.threadID);
    }
  }
  if (args[0] === "unlock") {
    delete lockedName[event.threadID];
    delete lockedImage[event.threadID];
    return api.sendMessage(`🔓 Group lock removed.`, event.threadID);
  }

  return api.sendMessage(
    `❗ Usage:\n/lockgroup name\n/lockgroup image\n/lockgroup unlock`,
    event.threadID
  );
};

module.exports.handleEvent = async ({ api, event }) => {
  // Restore name kung binago
  if (event.type === "change_thread_name" && lockedName[event.threadID]) {
    if (event.logMessageData && event.logMessageData.name !== lockedName[event.threadID]) {
      api.setTitle(lockedName[event.threadID], event.threadID, (err) => {
        if (!err) {
          api.sendMessage(`⏪ Group name restored to: ${lockedName[event.threadID]}`, event.threadID);
        }
      });
    }
  }

  // Restore image kung binago
  if (event.type === "change_thread_image" && lockedImage[event.threadID]) {
    try {
      const imgPath = __dirname + `/cache/lockimg_${event.threadID}.jpg`;
      const request = require("request");
      const download = fs.createWriteStream(imgPath);

      request(lockedImage[event.threadID])
        .pipe(download)
        .on("close", () => {
          api.changeGroupImage(fs.createReadStream(imgPath), event.threadID, () => {
            api.sendMessage(`⏪ Group image restored.`, event.threadID);
            fs.unlinkSync(imgPath);
          });
        });
    } catch (e) {
      console.log("Restore image error:", e.message);
    }
  }
};
