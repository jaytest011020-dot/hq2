const { getData, setData } = require("../../database.js");

// config
module.exports.config = {
  name: "scammer",
  version: "1.0.0",
  credits: "ChatGPT + You",
  description: "Manage a list of scammers (name + FB link). Commands: add, list, remove",
  usages: "/scammer add <Name> <FB link> | /scammer list [page] | /scammer remove <id>",
  commandCategory: "admin",
  cooldowns: 3
};

// helper: generate short unique id (6 digits)
function genID() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// helper: validate URL (basic)
function isValidUrl(s) {
  try {
    const url = new URL(s);
    return ["http:", "https:"].includes(url.protocol);
  } catch (e) {
    return false;
  }
}

// key in your DB
const DB_KEY = "/scammer/list";

// main
module.exports.run = async function({ api, event, args, Users }) {
  const { threadID, messageID, senderID } = event;
  const sub = (args[0] || "").toLowerCase();

  // load list
  let list = (await getData(DB_KEY)) || [];
  if (!Array.isArray(list)) list = [];

  // --- ADD ---
  if (sub === "add") {
    // allow name with spaces and link; accept either <Name> <link> or plain: Name | link
    const rest = args.slice(1).join(" ").trim();
    if (!rest) {
      return api.sendMessage("❌ Usage: /scammer add <Name> <FB link>", threadID, messageID);
    }

    // try to extract: name and link; support angle brackets or not
    // match patterns: <Name> <link>   OR   Name <link>   OR   "Name" link   OR   Name link
    let name = null;
    let link = null;

    // first try pattern where link is last token (url)
    const tokens = rest.split(/\s+/);
    // prefer last token as link if valid URL
    const possibleLink = tokens[tokens.length - 1].replace(/^<|>$/g, "");
    if (isValidUrl(possibleLink)) {
      link = possibleLink;
      name = rest.slice(0, rest.length - possibleLink.length).trim();
      // remove wrapping <...> if present
      name = name.replace(/^<|>$/g, "").trim();
      // if name still quoted, remove quotes
      name = name.replace(/^["']|["']$/g, "").trim();
    }

    // fallback: try explicit <Name> <link>
    if (!name || !link) {
      const m = rest.match(/^\s*<?([^>]+)>?\s+<?(https?:\/\/[^\s>]+)>?\s*$/i);
      if (m) {
        name = m[1].trim();
        link = m[2].trim();
      }
    }

    if (!name || !link || !isValidUrl(link)) {
      return api.sendMessage("❌ Invalid usage or link. Example:\n/scammer add <Juan Dela Cruz> <https://facebook.com/username>", threadID, messageID);
    }

    // create entry
    const entry = {
      id: genID(),
      name,
      link,
      addedBy: senderID,
      addedAt: Date.now()
    };

    list.push(entry);
    await setData(DB_KEY, list);

    return api.sendMessage(`✅ Scammer added!\nID: ${entry.id}\nName: ${entry.name}\nLink: ${entry.link}`, threadID, messageID);
  }

  // --- REMOVE ---
  if (sub === "remove" || sub === "del" || sub === "rm") {
    const id = args[1];
    if (!id) return api.sendMessage("❌ Usage: /scammer remove <id>", threadID, messageID);

    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return api.sendMessage("⚠️ ID not found.", threadID, messageID);

    const removed = list.splice(idx, 1)[0];
    await setData(DB_KEY, list);

    return api.sendMessage(`🗑️ Removed scammer:\nID: ${removed.id}\nName: ${removed.name}`, threadID, messageID);
  }

  // --- LIST ---
  // /scammer or /scammer list [page]
  const pageArg = (args[0] && (args[0].toLowerCase() === "list" ? args[1] : args[0])) || "1";
  let page = parseInt(pageArg);
  if (isNaN(page) || page < 1) page = 1;

  const pageSize = 10;
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (page > pages) page = pages;

  if (!total) return api.sendMessage("📭 Scammer list is empty.", threadID, messageID);

  const start = (page - 1) * pageSize;
  const chunk = list.slice(start, start + pageSize);

  let msg = `📛 Scammer List — Page ${page}/${pages} (Total: ${total})\n\n`;
  chunk.forEach(e => {
    const added = new Date(e.addedAt).toLocaleString();
    msg += `ID: ${e.id}\nName: ${e.name}\nLink: ${e.link}\nAdded: ${added}\n\n`;
  });

  // instructions for managing
  msg += `Use:\n/scammer add <Name> <FB link>\n/scammer remove <id>\n\nTo view other pages: /scammer list <page>`;

  // send (split if long)
  const chunkSize = 4000;
  for (let i = 0; i < msg.length; i += chunkSize) {
    await api.sendMessage(msg.slice(i, i + chunkSize), threadID, messageID);
  }
};
