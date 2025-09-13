module.exports.config = {
  name: "help",
  version: "1.3.0",
  hasPermssion: 0,
  credits: "Modified by ChatGPT (base Priyansh Rajput)",
  description: "Restricted Beginner's Guide",
  commandCategory: "system",
  usages: "[command name]",
  cooldowns: 1,
  envConfig: {
    autoUnsend: false,
    delayUnsend: 60
  }
};

// ✅ Allowed commands only
const allowedCommands = ["bank", "bid", "bot", "check", "petcalc", "shop", "stock"];

module.exports.run = function ({ api, event, args }) {
  const { commands } = global.client;
  const { threadID, messageID } = event;
  const prefix = global.config.PREFIX;

  // 📌 Kung walang argument → listahan ng allowed commands + usage
  if (!args[0]) {
    let msg = "📌 Available Commands:\n\n";
    allowedCommands.forEach((cmd, i) => {
      const c = commands.get(cmd);
      if (c) {
        msg += `${i + 1}. ${prefix}${c.config.name} → ${c.config.description}\n`;
        msg += `   Usage: ${prefix}${c.config.name} ${c.config.usages || ""}\n\n`;
      }
    });
    msg += `👉 Type: ${prefix}help [command name] para makita ang full details.`;
    return api.sendMessage(msg, threadID, messageID);
  }

  // 🔎 Kung may argument → check kung allowed
  const cmdName = args[0].toLowerCase();
  if (!allowedCommands.includes(cmdName)) {
    return api.sendMessage(`❌ The command "${cmdName}" is not available in help.`, threadID, messageID);
  }

  const command = commands.get(cmdName);
  if (!command) {
    return api.sendMessage(`⚠️ Command "${cmdName}" not found.`, threadID, messageID);
  }

  // 📖 Detalyadong info ng command
  return api.sendMessage(
    `「 ${command.config.name} 」\n${command.config.description}\n\n` +
    `❯ Usage: ${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}\n` +
    `❯ Category: ${command.config.commandCategory}\n❯ Cooldown: ${command.config.cooldowns}s\n` +
    `❯ Permission: ${(command.config.hasPermssion == 0) ? "User" : (command.config.hasPermssion == 1) ? "Admin group" : "Admin bot"}\n\n` +
    `Code by: ${command.config.credits}`,
    threadID,
    messageID
  );
};
