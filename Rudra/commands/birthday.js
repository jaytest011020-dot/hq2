const { getData, setData } = require("../../database.js");
const cron = require("node-cron"); // para sa 6AM scheduler

module.exports.config = {
    name: "birthday",
    version: "3.0.0",
    credits: "Jaylord La Peña + ChatGPT",
    description: "Birthday system: list + auto greetings at 6AM",
    commandCategory: "utility",
    usages: "/birthday list",
    cooldowns: 0
};

// Function to get birthdays of current month
async function getCurrentMonthBirthdays() {
    const users = await getData("user");
    if (!users) return [];

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // JS month 0-based
    const result = [];

    for (const uid in users) {
        const user = users[uid];
        if (!user.birthday) continue;

        const [year, month, day] = user.birthday.split("-").map(Number);
        if (month === currentMonth) {
            result.push({ uid, name: user.name || `FB-User(${uid})`, day });
        }
    }

    // Sort by day
    result.sort((a, b) => a.day - b.day);
    return result;
}

// Command: /birthday list
module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const command = args[0] ? args[0].toLowerCase() : "";

    if (command === "list") {
        const birthdays = await getCurrentMonthBirthdays();
        if (!birthdays.length)
            return api.sendMessage("📅 Walang birthdays sa current month.", threadID, messageID);

        let msg = `🎂 Birthdays this month:\n\n`;
        birthdays.forEach(u => {
            msg += `📌 Day ${u.day}: ${u.name} (<@${u.uid}>)\n`;
        });

        return api.sendMessage(msg, threadID, messageID);
    }

    return api.sendMessage("⚠️ Usage: /birthday list", threadID, messageID);
};

// Auto greeting scheduler at 6:00 AM
function scheduleAutoGreetings(api, threadID) {
    // Using cron syntax: '0 6 * * *' → 6:00 AM daily
    cron.schedule("0 6 * * *", async () => {
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth() + 1;

        const users = await getData("user");
        if (!users) return;

        let birthdayUsers = [];
        for (const uid in users) {
            const user = users[uid];
            if (!user.birthday) continue;

            const [year, bMonth, bDay] = user.birthday.split("-").map(Number);
            if (bDay === day && bMonth === month) {
                birthdayUsers.push({ uid, name: user.name || `FB-User(${uid})` });

                // Optional: add coins reward
                const currentCoins = parseInt(user.coins) || 0;
                const rewardCoins = 100;
                await setData(`user/${uid}/coins`, currentCoins + rewardCoins);
            }
        }

        if (birthdayUsers.length > 0) {
            let msg = `🎉🎂 Happy Birthday to our amazing members today! 🎂🎉\n\n`;
            birthdayUsers.forEach((u, i) => {
                msg += `🎈 ${i + 1}. ${u.name} (<@${u.uid}>) — 💰 +100 coins!\n`;
            });
            msg += `\n🥳 Wishing you all an amazing day!`;

            await api.sendMessage(msg, threadID);
        }
    }, { timezone: "Asia/Manila" }); // ensure timezone is correct
}

module.exports.scheduleAutoGreetings = scheduleAutoGreetings;
