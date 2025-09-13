module.exports = function ({ api, models, Users, Threads, Currencies }) {
    const stringSimilarity = require('string-similarity');
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const logger = require("../../utils/log.js");
    const moment = require("moment-timezone");

    return async function ({ event }) {
        const dateNow = Date.now();
        const time = moment.tz("Asia/Kolkata").format("HH:mm:ss DD/MM/YYYY");
        const { allowInbox, PREFIX, ADMINBOT, DeveloperMode } = global.config;

        const { userBanned, threadBanned, threadInfo, threadData, commandBanned } = global.data;
        const { commands, cooldowns } = global.client;

        let { body, senderID, threadID, messageID } = event;
        senderID = String(senderID);
        threadID = String(threadID);

        const threadSetting = threadData.get(threadID) || {};

        // Detect prefix
        const prefixRegex = new RegExp(
            `^(<@!?${senderID}>|${escapeRegex(threadSetting.hasOwnProperty("PREFIX") ? threadSetting.PREFIX : PREFIX)})\\s*`
        );
        if (!prefixRegex.test(body)) return;

        // Block banned users or threads
        if (
            userBanned.has(senderID) ||
            threadBanned.has(threadID) ||
            (allowInbox == false && senderID == threadID)
        ) {
            if (!ADMINBOT.includes(senderID.toString())) {
                if (userBanned.has(senderID)) {
                    const { reason, dateAdded } = userBanned.get(senderID) || {};
                    return api.sendMessage(
                        `🚫 You are banned from using the bot.\nReason: ${reason}\nDate: ${dateAdded}`,
                        threadID,
                        async (err, info) => {
                            await new Promise((resolve) => setTimeout(resolve, 5000));
                            return api.unsendMessage(info.messageID);
                        },
                        messageID
                    );
                } else if (threadBanned.has(threadID)) {
                    const { reason, dateAdded } = threadBanned.get(threadID) || {};
                    return api.sendMessage(
                        `🚫 This thread is banned from using the bot.\nReason: ${reason}\nDate: ${dateAdded}`,
                        threadID,
                        async (err, info) => {
                            await new Promise((resolve) => setTimeout(resolve, 5000));
                            return api.unsendMessage(info.messageID);
                        },
                        messageID
                    );
                }
            }
        }

        // Extract command and args
        const [matchedPrefix] = body.match(prefixRegex);
        const args = body.slice(matchedPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        let command = commands.get(commandName);

        // Handle command not found
        if (!command) {
            let allCommandName = [];
            const commandValues = commands.keys();
            for (const cmd of commandValues) allCommandName.push(cmd);

            const checker = stringSimilarity.findBestMatch(commandName, allCommandName);

            if (checker.bestMatch.rating >= 0.5) {
                // Suggest a similar command
                return api.sendMessage(
                    `❌ Command "${commandName}" does not exist.\n👉 Did you mean "/${checker.bestMatch.target}"?\n💡 Use /help to see all available commands.`,
                    threadID
                );
            } else {
                // No close match
                return api.sendMessage(
                    `❌ Command "${commandName}" does not exist.\n💡 Use /help to see all available commands.`,
                    threadID
                );
            }
        }

        // Handle banned commands
        if (commandBanned.get(threadID) || commandBanned.get(senderID)) {
            if (!ADMINBOT.includes(senderID)) {
                const banThreads = commandBanned.get(threadID) || [];
                const banUsers = commandBanned.get(senderID) || [];

                if (banThreads.includes(command.config.name)) {
                    return api.sendMessage(
                        `🚫 The command "${command.config.name}" is banned in this thread.`,
                        threadID,
                        async (err, info) => {
                            await new Promise((resolve) => setTimeout(resolve, 5000));
                            return api.unsendMessage(info.messageID);
                        },
                        messageID
                    );
                }
                if (banUsers.includes(command.config.name)) {
                    return api.sendMessage(
                        `🚫 You are banned from using the command "${command.config.name}".`,
                        threadID,
                        async (err, info) => {
                            await new Promise((resolve) => setTimeout(resolve, 5000));
                            return api.unsendMessage(info.messageID);
                        },
                        messageID
                    );
                }
            }
        }

        // NSFW restriction
        if (
            command.config.commandCategory.toLowerCase() === "nsfw" &&
            !global.data.threadAllowNSFW.includes(threadID) &&
            !ADMINBOT.includes(senderID)
        ) {
            return api.sendMessage(
                "⚠️ NSFW commands are not allowed in this thread.",
                threadID,
                async (err, info) => {
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    return api.unsendMessage(info.messageID);
                },
                messageID
            );
        }

        // Thread info
        let threadInfo2;
        if (event.isGroup === true) {
            try {
                threadInfo2 = threadInfo.get(threadID) || (await Threads.getInfo(threadID));
                if (Object.keys(threadInfo2).length === 0) throw new Error();
            } catch (err) {
                logger("⚠️ Cannot fetch thread info.");
            }
        }

        // Permissions
        let permission = 0;
        const threadInfoo = threadInfo.get(threadID) || (await Threads.getInfo(threadID));
        const find = threadInfoo.adminIDs.find((el) => el.id == senderID);

        if (ADMINBOT.includes(senderID.toString())) permission = 2;
        else if (!ADMINBOT.includes(senderID) && find) permission = 1;

        if (command.config.hasPermssion > permission) {
            return api.sendMessage(
                `⚠️ You do not have permission to use the command "${command.config.name}".`,
                threadID,
                messageID
            );
        }

        // Cooldowns
        if (!client.cooldowns.has(command.config.name)) client.cooldowns.set(command.config.name, new Map());
        const timestamps = client.cooldowns.get(command.config.name);
        const expirationTime = (command.config.cooldowns || 1) * 1000;

        if (timestamps.has(senderID) && dateNow < timestamps.get(senderID) + expirationTime) {
            return api.setMessageReaction("⏳", event.messageID, (err) => {
                if (err) logger("Error setting reaction", 2);
            }, true);
        }

        // Language system
        let getText2;
        if (command.languages && typeof command.languages === "object" && command.languages.hasOwnProperty(global.config.language)) {
            getText2 = (...values) => {
                let lang = command.languages[global.config.language][values[0]] || "";
                for (let i = values.length; i > 0; i--) {
                    const expReg = RegExp("%" + i, "g");
                    lang = lang.replace(expReg, values[i]);
                }
                return lang;
            };
        } else getText2 = () => {};

        // Run the command
        try {
            const Obj = {
                api,
                event,
                args,
                models,
                Users,
                Threads,
                Currencies,
                permission,
                getText: getText2
            };
            command.run(Obj);
            timestamps.set(senderID, dateNow);

            if (DeveloperMode === true) {
                logger(
                    `[DEV MODE] Executed command: ${commandName} | User: ${senderID} | Thread: ${threadID} | Args: ${args.join(" ")} | Time: ${(Date.now() - dateNow)}ms`
                );
            }
            return;
        } catch (e) {
            return api.sendMessage(`❌ Error while running command "${commandName}":\n${e}`, threadID);
        }
    };
};
