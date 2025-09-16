const { setData, getData } = require("../../database.js");

module.exports.config = {
    name: "bank",
    version: "1.2.0",
    credits: "ChatGPT",
    description: "Check your bank account balance",
    usages: "/bank",
    commandCategory: "economy",
    cooldowns: 3
};

module.exports.run = async ({ api, event, Users }) => {
    const { senderID, threadID, messageID } = event;
    const uid = senderID;

    // 🔹 Get old data from DB
    let userData = (await getData(`bank/${uid}`)) || null;

    // 🔹 Try to fetch fresh name
    let freshName;
    try {
        freshName = await Users.getNameUser(uid);
        if (!freshName || freshName === "Facebook users") {
            freshName = userData?.name || `User_${uid}`;
        }
    } catch (err) {
        freshName = userData?.name || `User_${uid}`;
    }

    // 🔹 If new user, create record
    if (!userData) {
        userData = {
            uid,
            name: freshName,
            coins: 0
        };
        await setData(`bank/${uid}`, userData);
    } else {
        // 🔹 Update name if changed
        if (userData.name !== freshName) {
            userData.name = freshName;
            await setData(`bank/${uid}`, userData);
        }
    }

    // 🔹 Show bank info
    return api.sendMessage(
        `🏦 Bank Account 🏦\n👤 ${userData.name}\n💰 Balance: ${userData.coins} coins`,
        threadID,
        messageID
    );
};
