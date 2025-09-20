const { setData, getData } = require("../../database.js");

module.exports.config = {
    name: "giveaway",
    version: "2.3.0",
    hasPermission: 1,
    credits: "ChatGPT + NN",
    description: "Giveaway system with reply-to-join, resend, roll, auto-roll",
    commandCategory: "group",
    usages: "/giveaway <prize> <endtime> | resend <id> | roll <id>",
    cooldowns: 5
};

// Helper to convert 1m/1h/1d into ms
function parseTime(input) {
    const match = input.match(/^(\d+)(m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    switch(unit) {
        case "m": return value * 60 * 1000;
        case "h": return value * 60 * 60 * 1000;
        case "d": return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

module.exports.run = async function({ api, event, args, Users }) {
    const { threadID } = event;

    let giveaways = await getData("giveaways") || [];
    const subCommand = args[0]?.toLowerCase();

    // SUBCOMMAND: resend
    if(subCommand === "resend") {
        if(!args[1]) return api.sendMessage("Please provide the giveaway ID to resend.", threadID);
        const giveawayToResend = giveaways.find(g => g.id == args[1]);
        if(!giveawayToResend) return api.sendMessage("Giveaway not found.", threadID);

        const message = `🎉 Giveaway Resend!\nPrize: ${giveawayToResend.prize}\nEnds: ${new Date(giveawayToResend.endTime).toLocaleString()}\nParticipants: ${giveawayToResend.entries.length}\nReply with "join" to enter!`;
        const sentMsg = await api.sendMessage(message, threadID);
        giveawayToResend.messageID = sentMsg.messageID;
        await setData("giveaways", giveaways);
        return;
    }

    // SUBCOMMAND: roll
    if(subCommand === "roll") {
        if(!args[1]) return api.sendMessage("Please provide the giveaway ID to roll.", threadID);
        const giveawayToRoll = giveaways.find(g => g.id == args[1]);
        if(!giveawayToRoll) return api.sendMessage("Giveaway not found.", threadID);

        if(!giveawayToRoll.entries || giveawayToRoll.entries.length === 0)
            return api.sendMessage("Walang entries sa giveaway.", threadID);

        const winnerIndex = Math.floor(Math.random() * giveawayToRoll.entries.length);
        const winnerId = giveawayToRoll.entries[winnerIndex];

        let winnerName;
        try {
            const user = await api.getUser(winnerId);
            winnerName = user.name || winnerId;
        } catch {
            winnerName = winnerId;
        }

        api.sendMessage(`🏆 The winner of "${giveawayToRoll.prize}" is ${winnerName}! Congratulations!`, threadID);

        if(giveawayToRoll.messageID){
            try { await api.unsendMessage(giveawayToRoll.messageID); } catch(e){}
        }

        giveaways = giveaways.filter(g => g.id !== args[1]);
        await setData("giveaways", giveaways);
        return;
    }

    // DEFAULT: start giveaway
    if(args.length < 2) return api.sendMessage("Usage: /giveaway <prize> <endtime> (e.g., 1m, 1h, 1d)", threadID);
    const prize = args.slice(0, -1).join(" "); // all except last arg
    const timeStr = args[args.length - 1];
    const duration = parseTime(timeStr);
    if(!duration) return api.sendMessage("Invalid time format! Use 1m, 1h, or 1d.", threadID);

    const newGiveaway = {
        id: Date.now().toString(),
        prize,
        startTime: Date.now(),
        endTime: Date.now() + duration,
        entries: [],
        threadID,
        messageID: null
    };
    giveaways.push(newGiveaway);
    await setData("giveaways", giveaways);

    const message = `🎉 New Giveaway Started!\nPrize: ${prize}\nEnds at: ${new Date(newGiveaway.endTime).toLocaleString()}\nReply with "join" to enter!`;
    const sentMsg = await api.sendMessage(message, threadID);
    newGiveaway.messageID = sentMsg.messageID;
    await setData("giveaways", giveaways);
};

// Handle replies to join giveaway
module.exports.handleMessageReply = async function({ api, event }) {
    const { messageReply, senderID, threadID, body } = event;

    if (!messageReply) return;
    const replyText = (body || "").toLowerCase();
    if (replyText !== "join") return;

    let giveaways = await getData("giveaways") || [];
    const giveaway = giveaways.find(g => g.messageID === messageReply.messageID && g.endTime > Date.now());
    if (!giveaway) return;

    if (!giveaway.entries.includes(senderID)) {
        giveaway.entries.push(senderID);
        await setData("giveaways", giveaways);
    }

    // Delete old message
    if (giveaway.messageID) {
        try { await api.unsendMessage(giveaway.messageID); } catch(e){}
    }

    // Get participant name
    let userName;
    try {
        const user = await api.getUser(senderID);
        userName = user.name || senderID;
    } catch {
        userName = senderID;
    }

    // Send updated message
    const message = `🎉 Giveaway: ${giveaway.prize}\n` +
                    `Ends at: ${new Date(giveaway.endTime).toLocaleString()}\n` +
                    `Participants: ${giveaway.entries.length}\n\n` +
                    `Reply with "join" to enter!\n` +
                    `Last joined: ${userName}`;

    const sentMsg = await api.sendMessage(message, threadID);
    giveaway.messageID = sentMsg.messageID;
    await setData("giveaways", giveaways);
};

// Auto-roll interval
setInterval(async () => {
    let giveaways = await getData("giveaways") || [];
    const now = Date.now();

    for (let giveaway of giveaways) {
        if (giveaway.endTime <= now) {
            const { threadID, prize, entries } = giveaway;

            if (!entries || entries.length === 0) {
                api.sendMessage(`😢 Giveaway for "${prize}" ended with no participants.`, threadID);
            } else {
                const winnerIndex = Math.floor(Math.random() * entries.length);
                const winnerId = entries[winnerIndex];

                let winnerName;
                try {
                    const user = await api.getUser(winnerId);
                    winnerName = user.name || winnerId;
                } catch {
                    winnerName = winnerId;
                }

                api.sendMessage(`🏆 Giveaway ended!\nPrize: "${prize}"\nWinner: ${winnerName}`, threadID);
            }

            if (giveaway.messageID) {
                try { await api.unsendMessage(giveaway.messageID); } catch(e) {}
            }

            giveaways = giveaways.filter(g => g.id !== giveaway.id);
        }
    }

    await setData("giveaways", giveaways);
}, 30000);
