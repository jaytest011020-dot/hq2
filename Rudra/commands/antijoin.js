module.exports.config = {
    name: "antijoin",
    version: "1.0.1",
    credits: "Priyansh Rajput, ChatGPT",
    hasPermssion: 1,
    description: "Enable/disable AntiJoin (blocks new members)",
    usages: "/antijoin on/off",
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
            "[ AntiJoin ] ❌ Only group admins or bot admins can use this command.",
            threadID,
            messageID
        );
    }

    // ✅ toggle AntiJoin
    const data = (await Threads.getData(threadID)).data || {};
    data.newMember = !data.newMember;

    await Threads.setData(threadID, { data });
    global.data.threadData.set(parseInt(threadID), data);

    return api.sendMessage(
        `[ AntiJoin ] AntiJoin has been turned ${(data.newMember ? "ON ✅" : "OFF ❌")}`,
        threadID,
        messageID
    );
};
