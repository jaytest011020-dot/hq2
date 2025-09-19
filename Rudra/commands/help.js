const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const mathSansBold = {
  A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜",
  J: "𝗝", K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥",
  S: "𝗦", T: "𝗧", U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
  a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶",
  j: "𝗷", k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿",
  s: "𝘀", t: "𝘁", u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇"
};

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
let lastUsed = {};

module.exports.config = {
  name: "help",
  version: "1.0.3",
  hasPermission: 0,
  credits: "august + ChatGPT",
  description: "Guide for new users with attachment",
  commandCategory: "system",
  usages: "/help",
  cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  // 🔹 check cooldown per thread
  const now = Date.now();
  if (lastUsed[threadID] && now - lastUsed[threadID] < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed[threadID])) / 60000);
    return api.sendMessage(
      `⚠️ /help is on cooldown. Please wait ${remaining} minute(s).`,
      threadID,
      messageID
    );
  }
  lastUsed[threadID] = now;

  const { commands } = global.client;
  const prefix = global.config.PREFIX;

  // 🔹 categorize commands
  const categories = new Set();
  const categorizedCommands = new Map();
  for (const [name, value] of commands) {
    const categoryName = value.config.commandCategory || "Uncategorized";
    if (!categories.has(categoryName)) {
      categories.add(categoryName);
      categorizedCommands.set(categoryName, []);
    }
    categorizedCommands.get(categoryName).push(`│ ✧ ${value.config.name}`);
  }

  // 🔹 build message
  let msg = `Hey, here are commands that may help your assignments and essays:\n`;
  for (const categoryName of categories) {
    const categoryNameSansBold = categoryName
      .split("")
      .map(c => mathSansBold[c] || c)
      .join("");
    msg += `╭─❍「 ${categoryNameSansBold} 」\n`;
    msg += categorizedCommands.get(categoryName).join("\n");
    msg += "\n╰───────────⟡\n";
  }
  msg += `├─────☾⋆\n│ » Total commands: [ ${commands.size} ]\n│「 ☾⋆ PREFIX: ${prefix} 」\n╰──────────⧕\n\n`;

  // 🔹 download attachment (bot owner profile)
  const attachmentUrl = "https://betadash-api-swordslush-production.up.railway.app/profile?uid=61559999326713";
  const cacheDir = path.join(__dirname, "..", "cache");
  const filePath = path.join(cacheDir, "bot_profile.png");

  try {
    await fs.ensureDir(cacheDir); // siguraduhin na meron cache folder
    const response = await axios.get(attachmentUrl, { responseType: "stream" });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await api.sendMessage(
      { body: msg, attachment: fs.createReadStream(filePath) },
      threadID,
      () => fs.unlink(filePath).catch(() => {})
    );
  } catch (err) {
    console.error("Error downloading or sending attachment:", err);
    api.sendMessage(msg, threadID);
  }
};
