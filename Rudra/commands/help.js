module.exports.config = {
  name: "help",
  version: "3.8.0",
  hasPermssion: 0,
  credits: "ChatGPT + Edited by Jaylord",
  description: "Show all available commands grouped by category with styled brackets",
  commandCategory: "system",
  usages: "/help [command]",
  cooldowns: 1
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID } = event;
  const commands = global.client.commands;

  // 📌 Case: /help <command>
  if (args[0]) {
    const cmdName = args[0].toLowerCase();
    const command = commands.get(cmdName) || commands.get(global.client.aliases?.get(cmdName));

    if (!command) {
      return api.sendMessage(`❌ Command "/${cmdName}" not found.`, threadID);
    }

    const config = command.config;
    let details = `📖 HELP → /${config.name}\n\n`;
    details += `📝 Description: ${config.description || "No description"}\n`;
    if (config.usages) details += `⚡ Usage: ${config.usages}\n`;
    details += `🔑 Permission: ${config.hasPermssion || 0}\n`;
    details += `⏳ Cooldown: ${config.cooldowns || 0}s`;

    return api.sendMessage(details, threadID);
  }

  // 📌 Category Icons
  const categoryIcons = {
    "system": "⚙️",
    "moderation": "🛡️",
    "education": "📚",
    "music": "🎵",
    "image": "🖼️",
    "tools": "🛠️",
    "gag tools": "😂",
    "ai": "🤖",
    "others": "📦"
  };

  // 📌 Group commands per category (case-insensitive)
  let categorized = {};
  commands.forEach(cmd => {
    const cfg = cmd.config;
    let category = (cfg.commandCategory || "others").toLowerCase();

    // 🔎 Auto-detect AI-related commands
    if (
      ["ai", "chatgpt", "gpt", "ask"].includes(cfg.name.toLowerCase()) || 
      category.includes("ai")
    ) {
      category = "ai";
    }

    if (!categorized[category]) categorized[category] = [];
    categorized[category].push(cfg);
  });

  // 📌 Build Help Menu (bracket style + slash)
  let helpMenu = "📌 Available Commands:\n\n";

  for (const [category, cmds] of Object.entries(categorized)) {
    const icon = categoryIcons[category] || "📦";
    helpMenu += `┌─ ${icon} | ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;

    cmds.forEach(cfg => {
      helpMenu += `│ - /${cfg.name}\n`;
    });

    helpMenu += `└───────────────\n\n`;
  }

  helpMenu += "👑 BOT OWNER\n";
  helpMenu += "   Jaylord La Peña\n";
  helpMenu += "   🌐 https://www.facebook.com/jaylordlapena2298";

  return api.sendMessage(helpMenu, threadID);
};
