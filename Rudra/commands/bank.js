const { setData, getData } = require("../../database.js");

module.exports.config = {
    name: "bank",
    version: "3.3.0",
    credits: "ChatGPT + Jaylord",
    hasPermssion: 0,
    description: "Bank system with database + UID name lookup",
    commandCategory: "Economy",
    usages: "/bank, /bank all, /bank add <uid> <amount>",
    cooldowns: 3,
};

// 🔑 Bot admins
const BOT_ADMINS = ["61559999326713"];

// Format balance
function formatBalance(user, balance) {
    return `🏦 Bank Account 🏦\n\n👤 ${user}\n💰 Balance: ${balance.toLocaleString()} coins`;
}

// 🔹 Auto add coins per message
module.exports.handleEvent = async function ({ event }) {
    const { senderID, body } = event;
    if (!senderID || !body) return;
    if (body.trim().startsWith("/")) return;

    let userData = (await getData(`bank/${senderID}`)) || { balance: 0 };
    userData.balance += 5;

    await setData(`bank/${senderID}`, userData);
};

// 🔹 Run command
module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, senderID } = event;

    const command = args[0] ? args[0].toLowerCase() : "";
    const validArgs = ["", "all", "add"];

    if (!validArgs.includes(command)) {
        return api.sendMessage(
            "❌ Invalid usage.\n\n" +
                "📌 Correct Usage:\n" +
                "• /bank → check your balance\n" +
                "• /bank all → show all balances\n" +
                "• /bank add <uid> <amount> → add coins (admin only)",
            threadID
        );
    }

    // 📋 Show all accounts
    if (command === "all") {
        let allData = (await getData("bank")) || {};
        let accounts = [];

        for (let uid in allData) {
            let balance = allData[uid].balance || 0;
            let name;
            try {
                name = await Users.getNameUser(uid);
            } catch {
                name = uid;
            }
            accounts.push({ uid, name, balance });
        }

        accounts.sort((a, b) => b.balance - a.balance);

        let msg = `📋 All Bank Accounts (Total: ${accounts.length}) 📋\n`;
        for (let i = 0; i < accounts.length; i++) {
            msg += `\n${i + 1}. ${accounts[i].name} - 💰 ${accounts[i].balance.toLocaleString()} coins`;
        }

        return api.sendMessage(msg, threadID);
    }

    // 🔑 Admin add coins
    if (command === "add") {
        if (!BOT_ADMINS.includes(senderID)) {
            return api.sendMessage("❌ Only bot admins can add coins.", threadID);
        }

        const targetUID = args[1];
        const amount = parseInt(args[2]);

        if (!targetUID || isNaN(amount) || amount <= 0) {
            return api.sendMessage("❌ Usage: /bank add <uid> <amount>", threadID);
        }

        let userData = (await getData(`bank/${targetUID}`)) || { balance: 0 };
        userData.balance += amount;

        await setData(`bank/${targetUID}`, userData);

        let name;
        try {
            name = await Users.getNameUser(targetUID);
        } catch {
            name = targetUID;
        }

        return api.sendMessage(
            `✅ Added 💰 ${amount.toLocaleString()} coins to ${name}'s account.`,
            threadID
        );
    }

    // 📌 Default → show own balance
    let userData = (await getData(`bank/${senderID}`)) || { balance: 0 };
    await setData(`bank/${senderID}`, userData);

    let name;
    try {
        name = await Users.getNameUser(senderID);
    } catch {
        name = senderID;
    }

    return api.sendMessage(formatBalance(name, userData.balance), threadID);
};
