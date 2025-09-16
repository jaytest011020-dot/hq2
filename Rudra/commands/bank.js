const { setData, getData } = require("../../database.js");

module.exports.config = {
    name: "bank",
    version: "1.2.0",
    credits: "ChatGPT",
    hasPermssion: 0,
    description: "Bank system with UID checker for names",
    usages: "/bank [all]",
    commandCategory: "economy",
    cooldowns: 0
};

// helper para makuha name by UID
async function getUserName(uid, Users) {
    try {
        const name = await Users.getNameUser(uid);
        return name || "Unknown User";
    } catch (e) {
        return "Unknown User";
    }
}

module.exports.run = async ({ api, event, args, Users }) => {
    const { threadID, senderID, messageID } = event;

    // ✅ kapag /bank all
    if (args[0] && args[0].toLowerCase() === "all") {
        let allData = (await getData(`bank`)) || {};
        let results = [];

        for (let uid in allData) {
            let name = await getUserName(uid, Users);

            // auto-update sa database yung name
            allData[uid].name = name;
            await setData(`bank/${uid}`, allData[uid]);

            results.push(`👤 ${name} — 💰 ${allData[uid].balance || 0} coins`);
        }

        if (results.length === 0) {
            return api.sendMessage("🏦 No accounts found in the bank.", threadID, messageID);
        }

        return api.sendMessage(
            `🏦 Bank Accounts:\n\n${results.join("\n")}`,
            threadID,
            messageID
        );
    }

    // ✅ kapag solo account lang (/bank)
    let userData = (await getData(`bank/${senderID}`)) || {
        uid: senderID,
        name: "Unknown User",
        balance: 0
    };

    // i-refresh yung name by UID checker
    let freshName = await getUserName(senderID, Users);
    userData.name = freshName;

    // save ulit sa DB
    await setData(`bank/${senderID}`, userData);

    return api.sendMessage(
        `🏦 Bank Account 🏦\n👤 ${userData.name}\n💰 Balance: ${userData.balance} coins`,
        threadID,
        messageID
    );
};
