module.exports.config = {
    name: "antirobbery",
    version: "1.0.1",
    credits: "Priyansh Rajput, ChatGPT",
    hasPermssion: 1,
    description: "Prevent changes to group administrators",
    usages: "/antirobbery",
    commandCategory: "admin",
    cooldowns: 0
};

module.exports.run = async ({ api, event, Threads }) => {
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

    // ✅ toggle AntiRobbery
    const data = (await Threads.getData(threadID)).data || {};
    if (typeof data.guard === "undefined") data.guard = false;
    data.guard = !data.guard;

    await Threads.setData(threadID, { data });
    global.data.threadData.set(parseInt(threadID), data);

    return api.sendMessage(
        `[ AntiRobbery ] AntiRobbery has been turned ${(data.guard ? "ON ✅" : "OFF ❌")}`,
        threadID,
        messageID
    );
};
