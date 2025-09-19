const { setData, getData } = require("../../database.js");

async function getUserName(uid, api, Users) {
  try {
    const name = await Users.getNameUser(uid);
    if (name) return name;
    const info = await api.getUserInfo(uid);
    return info[uid]?.name || `FB-User(${uid})`;
  } catch (err) {
    return `FB-User(${uid})`;
  }
}

module.exports.config = {
  name: "inviteEvent",
  eventType: ["log:subscribe"],
  version: "1.1.0",
  credits: "ChatGPT + NN",
};

module.exports.run = async function ({ api, event, Users }) {
  const { threadID, addedParticipants } = event;
  if (!addedParticipants || addedParticipants.length === 0) return;

  const dbPath = `invite/${threadID}`;
  let gcData = (await getData(dbPath)) || {};

  for (const newUserID of addedParticipants) {
    const inviterID = event.inviter || null; // Facebook sends inviter in log
    if (!inviterID || inviterID === newUserID) continue;

    // initialize inviter data if not exists
    if (!gcData[inviterID]) gcData[inviterID] = { count: 0 };
    gcData[inviterID].count += 1;

    await setData(dbPath, gcData);

    // get names
    const inviterName = await getUserName(inviterID, api, Users);
    const newUserName = await getUserName(newUserID, api, Users);

    // send announcement
    const msg = `🎉 ${inviterName} invited ${newUserName}!\n📊 Total invites for ${inviterName}: ${gcData[inviterID].count}`;
    api.sendMessage(msg, threadID);
  }
};
