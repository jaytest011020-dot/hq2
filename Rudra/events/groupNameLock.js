const { lockedNames } = require('../commands/lockname.js');

module.exports.config = {
  name: "groupNameLock",
  eventType: ["log:thread-name"],
  version: "1.0",
  credits: "Rudra x ChatGPT"
};

module.exports.run = async function({ event, api }) {
  const { threadID, logMessageData } = event;
  const lockedName = lockedNames[threadID];

  if (lockedName && logMessageData?.name !== lockedName) {
    try {
      await api.setTitle(lockedName, threadID);
      return api.sendMessage(`⚠️ Group name was locked. Restored to: ${lockedName}`, threadID);
    } catch (err) {
      console.log("Error restoring name:", err);
    }
  }
};
