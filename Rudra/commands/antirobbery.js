const { setData, getData } = require("../../database.js");

module.exports.config = {
    name: "antirobbery",
    version: "1.2.0",
    credits: "Priyansh Rajput, ChatGPT",
    hasPermssion: 1,
    description: "Prevent changes to group administrators",
    usages: "/antirobbery",
    commandCategory: "admin",
    cooldowns: 0
};

// ✅ Load all saved settings at bot startup
module.exports.onLoad = async function () {
    try {
        const allData = (await getData("antirobbery")) || {};
        global.data.antirobbery = new Map();

        for (const threadID in allData) {
            global.data.antirobbery.set(threadID, allData[threadID]);
        }

        console.log(`[ AntiRobbery ] Loaded ${global.data.antirobbery.size} threads from database ✅`);
    } catch (err) {
        console.error("[ AntiRobbery ] Failed to load data:", err);
    }
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

    // ✅ get saved data (from memory or db)
    let threadData = global.data.antirobbery?.get(threadID) || (await getData(`antirobbery/${threadID}`)) || { enabled: false };

    // toggle ON/OFF
    threadData.enabled = !threadData.enabled;

    // ✅ save to Firebase + memory
    await setData(`antirobbery/${threadID}`, threadData);
    global.data.antirobbery.set(threadID, threadData);

    return api.sendMessage(
        `[ AntiRobbery ] AntiRobbery has been turned ${(threadData.enabled ? "ON ✅" : "OFF ❌")}`,
        threadID,
        messageID
    );
};

// Event to monitor admin changes in the group
module.exports.handleEvent = async function ({ api, event }) {
    const { threadID, addedParticipants, removedParticipants } = event;

    // Check if AntiRobbery is enabled for the group
    let threadData = global.data.antirobbery.get(threadID) || await getData(`antirobbery/${threadID}`);
    if (!threadData || !threadData.enabled) return;

    // If someone is removed from admin
    if (removedParticipants && removedParticipants.length > 0) {
        for (let removedUser of removedParticipants) {
            // If the removed user is an admin
            if (removedUser.userFbId) {
                // Restore admin status to any removed admin (except the bot)
                try {
                    await api.addUserToGroup(removedUser.userFbId, threadID);
                    api.sendMessage(`✅ Restored admin status for ${removedUser.userFbId}.`, threadID);
                } catch (error) {
                    console.error("Failed to restore admin status:", error);
                }
            }
        }
    }

    // If someone is added as an admin (monitoring purposes)
    if (addedParticipants && addedParticipants.length > 0) {
        for (let addedUser of addedParticipants) {
            // Check if the added user is not the bot
            if (addedUser.userFbId !== global.config.ADMINBOT[0]) {
                // Optionally handle logic for when new admins are added
            }
        }
    }
};
