module.exports.config = {
	name: "help",
	version: "1.3.0",
	hasPermssion: 0,
	credits: "Edited by ChatGPT",
	description: "Beginner's Guide with bold styled output",
	commandCategory: "system",
	usages: "[module name]",
	cooldowns: 1,
	envConfig: {
		autoUnsend: true,
		delayUnsend: 300
	}
};

module.exports.languages = {
	"en": {
		"moduleInfo":
`📌 Command: %1
📖 Description: %2
⚙️ Usage: %3
📂 Category: %4
⏳ Cooldown: %5 second(s)
👤 Permission: %6
✍️ Credits: %7`,
		"user": "User",
		"adminGroup": "Admin group",
		"adminBot": "Admin bot"
	}
};

// allowed commands lang
const allowed = ["bank", "bid", "bot", "check", "petcalc", "shop", "stock"];

// function pang-convert ng normal text to bold unicode
function toBold(str) {
	const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	const bold   = "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇";
	return str.split("").map(ch => {
		const idx = normal.indexOf(ch);
		return idx !== -1 ? bold[idx] : ch;
	}).join("");
}

module.exports.run = function ({ api, event, args, getText }) {
	const { commands } = global.client;
	const { threadID } = event;
	const command = commands.get((args[0] || "").toLowerCase());
	const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
	const { autoUnsend, delayUnsend } = global.configModule[this.config.name];
	const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;

	// kapag walang specific command → list ng allowed commands lang
	if (!command) {
		let msg = "📄 𝗔𝗟𝗟𝗢𝗪𝗘𝗗 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦\n✨ Type /help <command> to see full details\n\n";

		for (let name of allowed) {
			const cmd = commands.get(name);
			if (!cmd) continue;

			msg += `✨ ${toBold(name.toUpperCase())}\n`;
			msg += `   ➝ Usage: ${prefix}${cmd.config.name} ${(cmd.config.usages) ? cmd.config.usages : ""}\n\n`;
		}

		return api.sendMessage(msg, threadID, async (error, info) => {
			if (autoUnsend) {
				await new Promise(resolve => setTimeout(resolve, delayUnsend * 1000));
				return api.unsendMessage(info.messageID);
			}
		}, event.messageID);
	}

	// kapag may specific command → show full details
	if (!allowed.includes(command.config.name)) {
		return api.sendMessage("⚠️ Hindi kasama ang command na ito sa help list.", threadID, event.messageID);
	}

	return api.sendMessage(
		getText(
			"moduleInfo",
			toBold(command.config.name.toUpperCase()),
			command.config.description,
			`${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`,
			command.config.commandCategory,
			command.config.cooldowns,
			((command.config.hasPermssion == 0) ? getText("user") : (command.config.hasPermssion == 1) ? getText("adminGroup") : getText("adminBot")),
			command.config.credits
		),
		threadID,
		event.messageID
	);
};
