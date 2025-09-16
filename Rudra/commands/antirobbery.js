const { setData, getData } = require("../../database.js");

module.exports.config = {
    name: "antirobbery",
    version: "1.1.0",
    credits: "Priyansh Rajput, ChatGPT",
    hasPermssion: 1,
    description: "Prevent changes to group administrators",
    usages: "/antirobbery",
    commandCategory: "admin",
    cooldowns: 0
};

module.exports.run = async ({ api, event }) => {
    const { threadID, messageID, senderID } = event;

    // ✅ check if user is bot admin
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);

    // ✅ check if user is group admin
    const info = await api.getThreadInfo(threadID);
    const isGroupAdmin = info.adminIDs.some(item => item.id == senderID);

    // ❌ deny if not bot admin or group admin
    if (!isBotAdmin && !isGroupAdmin) {
        return api.sendMessage(
            "[ AntiRobbery ] ❌ Only group admins or bot admins can use this command.",
            threadID,
            messageID
        );
    }

    // ✅ get saved data from Firebase
    let threadData = (await getData(`antirobbery/${threadID}`)) || { enabled: false };

    // toggle ON/OFF
    threadData.enabled = !threadData.enabled;

    // ✅ save to Firebase
    await setData(`antirobbery/${threadID}`, threadData);

    return api.sendMessage(
        `[ AntiRobbery ] AntiRobbery has been turned ${(threadData.enabled ? "ON ✅" : "OFF ❌")}`,
        threadID,
        messageID
    );
};
